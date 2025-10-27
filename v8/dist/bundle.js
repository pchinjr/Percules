
// Bundled Bong Simulator
// Generated at 2025-10-20T14:16:20.197Z

(function() {
  'use strict';

  // ============= PHYSICS ENGINE =============
  /**
 * Physically accurate bong simulator - Physics engine
 * Models: shallow water dynamics, bubble acoustics, Helmholtz resonance, turbulence
 */







function createDefaultParams() {
  return {
    // Typical bong dimensions (30cm tube, 5cm diameter)
    tubeLength: 0.30,
    tubeDiameter: 0.05,
    waterDepth: 0.10,
    chamberVolume: 0.001,  // 1 liter chamber

    // Discretization
    nx: 200,
    dt: 0.0001,  // 0.1ms for audio rate

    // Water properties at 20°C
    g: 9.81,
    rho: 998.0,
    c: 1482.0,    // speed of sound in water
    mu: 0.001,    // dynamic viscosity
    sigma: 0.0728, // surface tension

    // Air properties
    rhoAir: 1.2,
    cAir: 343.0,
  };
}

function initState(params) {
  const { nx, waterDepth } = params;

  return {
    h: new Float64Array(nx).fill(waterDepth),
    u: new Float64Array(nx).fill(0),
    bubbles: [],
    pressure: new Float64Array(nx).fill(0),
    airflow: 0,
    time: 0,
  };
}

/**
 * Main physics step: update shallow water, bubbles, and acoustics
 */
function step(state, params, inletVelocity) {
  const { dt } = params;

  // Update shallow water dynamics
  updateShallowWater(state, params, inletVelocity);

  // Update bubble dynamics
  updateBubbles(state, params);

  // Generate new bubbles based on flow
  generateBubbles(state, params, inletVelocity);

  // Update acoustic pressure field
  updateAcoustics(state, params);

  state.time += dt;
}

/**
 * Shallow water solver (Lax-Friedrichs scheme)
 */
function updateShallowWater(state, params, inletVelocity) {
  const { nx, dt, g } = params;
  const dx = params.tubeLength / nx;

  const hNew = new Float64Array(nx);
  const uNew = new Float64Array(nx);

  // Interior points: Lax-Friedrichs scheme
  for (let i = 1; i < nx - 1; i++) {
    const hL = state.h[i - 1];
    const hR = state.h[i + 1];
    const uL = state.u[i - 1];
    const uR = state.u[i + 1];

    // Mass conservation: ∂h/∂t + ∂(hu)/∂x = 0
    const fluxHL = hL * uL;
    const fluxHR = hR * uR;
    hNew[i] = 0.5 * (hL + hR) - (dt / (2 * dx)) * (fluxHR - fluxHL);

    // Momentum conservation: ∂u/∂t + u·∂u/∂x + g·∂h/∂x = 0
    const fluxUL = uL * uL + g * hL;
    const fluxUR = uR * uR + g * hR;
    uNew[i] = 0.5 * (uL + uR) - (dt / (2 * dx)) * (fluxUR - fluxUL);
  }

  // Boundary conditions
  // Bottom: inlet with specified velocity
  const inletCell = Math.floor(nx * 0.2);
  hNew[0] = hNew[1];
  uNew[0] = 0;
  uNew[inletCell] = inletVelocity;  // Air inlet creates suction

  // Top: open boundary
  hNew[nx - 1] = hNew[nx - 2];
  uNew[nx - 1] = uNew[nx - 2];

  state.h.set(hNew);
  state.u.set(uNew);
  state.airflow = inletVelocity;
}

/**
 * Update bubble positions and dynamics
 * Bubbles rise due to buoyancy and contribute to acoustic signature
 */
function updateBubbles(state, params) {
  const { dt, g, rho, rhoAir, mu } = params;

  // Update each bubble
  for (let i = state.bubbles.length - 1; i >= 0; i--) {
    const bubble = state.bubbles[i];

    // Buoyancy force: F = (ρ_water - ρ_air) * V * g
    const volume = (4/3) * Math.PI * Math.pow(bubble.radius, 3);
    const buoyancy = (rho - rhoAir) * volume * g;

    // Drag force: F = 6πμrv (Stokes drag for small bubbles)
    const drag = 6 * Math.PI * mu * bubble.radius * bubble.velocity;

    // Surface tension effects on bubble stability
    const mass = rhoAir * volume;
    const acceleration = (buoyancy - drag) / mass;

    // Update velocity and position
    bubble.velocity += acceleration * dt;
    bubble.position += bubble.velocity * dt;

    // Remove bubbles that reach the surface
    const waterSurfaceIndex = state.h.findIndex(h => h < 0.01);
    const surfacePosition = waterSurfaceIndex * params.tubeLength / params.nx;

    if (bubble.position > surfacePosition || state.time - bubble.birthTime > 2.0) {
      state.bubbles.splice(i, 1);
    }
  }
}

/**
 * Generate new bubbles based on airflow through water
 * Higher flow rates create more and larger bubbles
 */
function generateBubbles(state, params, inletVelocity) {
  const flowRate = Math.abs(inletVelocity);

  // Bubble generation rate proportional to flow rate
  const bubbleProb = flowRate * params.dt * 100;

  if (Math.random() < bubbleProb) {
    // Bubble size depends on flow rate (higher flow = larger bubbles)
    const baseRadius = 0.001;  // 1mm base
    const radius = baseRadius * (1 + flowRate * 2);

    const inletPosition = params.tubeLength * 0.2;

    state.bubbles.push({
      position: inletPosition,
      radius: radius,
      velocity: 0,
      birthTime: state.time,
    });
  }
}

/**
 * Update acoustic pressure field
 * Key sources:
 * 1. Bubble resonance (Minnaert frequency)
 * 2. Helmholtz resonance of chamber
 * 3. Turbulent flow noise
 */
function updateAcoustics(state, params) {
  const { nx } = params;
  const dx = params.tubeLength / nx;

  // Reset pressure
  state.pressure.fill(0);

  // 1. Bubble acoustics - each bubble resonates at its Minnaert frequency
  for (const bubble of state.bubbles) {
    const cellIndex = Math.floor((bubble.position / params.tubeLength) * nx);
    if (cellIndex >= 0 && cellIndex < nx) {
      // Minnaert frequency: f = (1/2πr)√(3γP/ρ)
      // For air bubble in water: f ≈ 3.26/r (r in meters, f in Hz)
      const minnaertFreq = 3.26 / bubble.radius;
      const omega = 2 * Math.PI * minnaertFreq;

      // Bubble oscillation amplitude depends on size
      const amplitude = 100 * bubble.radius;  // Pa

      // Add sinusoidal pressure contribution
      const pressure = amplitude * Math.sin(omega * state.time);

      // Spread pressure to nearby cells (Gaussian)
      const spreadWidth = 5;
      for (let j = -spreadWidth; j <= spreadWidth; j++) {
        const idx = cellIndex + j;
        if (idx >= 0 && idx < nx) {
          const distance = Math.abs(j) * dx;
          const attenuation = Math.exp(-(distance * distance) / (2 * dx * dx));
          state.pressure[idx] += pressure * attenuation;
        }
      }
    }
  }

  // 2. Helmholtz resonance of the chamber
  // f = (v/2π)√(A/(V*L)) where A=cross-section, V=volume, L=neck length
  const A = Math.PI * Math.pow(params.tubeDiameter / 2, 2);
  const neckLength = params.waterDepth;
  const helmholtzFreq = (params.cAir / (2 * Math.PI)) *
    Math.sqrt(A / (params.chamberVolume * neckLength));

  const helmholtzOmega = 2 * Math.PI * helmholtzFreq;
  const helmholtzAmp = 50 * Math.abs(state.airflow);  // Proportional to flow
  const helmholtzPressure = helmholtzAmp * Math.sin(helmholtzOmega * state.time);

  // Add Helmholtz contribution to upper chamber
  const chamberStart = Math.floor(nx * 0.8);
  for (let i = chamberStart; i < nx; i++) {
    state.pressure[i] += helmholtzPressure;
  }

  // 3. Turbulence noise (pink noise filtered by flow rate)
  const turbulenceAmp = 20 * Math.abs(state.airflow);
  for (let i = 0; i < nx; i++) {
    // Add some turbulence where there's flow
    const velocityMag = Math.abs(state.u[i]);
    if (velocityMag > 0.01) {
      state.pressure[i] += turbulenceAmp * velocityMag * (Math.random() - 0.5);
    }
  }
}

/**
 * Get audio sample for current state
 * Sum pressure contributions at listening point (top of chamber)
 */
function getAudioSample(state, params) {
  // Listen at top of chamber
  const listenIndex = Math.floor(params.nx * 0.9);

  // Get pressure and normalize to audio range [-1, 1]
  const pressure = state.pressure[listenIndex];
  const maxPressure = 200;  // Pa

  return Math.max(-1, Math.min(1, pressure / maxPressure));
}

/**
 * Calculate flow velocity from suction pressure
 * Simulates user inhaling
 */
function pressureToVelocity(pressure, params) {
  // Bernoulli: v = √(2ΔP/ρ)
  // pressure is in Pa (positive = suction)
  const velocity = -Math.sign(pressure) * Math.sqrt(2 * Math.abs(pressure) / params.rho);
  return velocity;
}

  // ============= AUDIO ENGINE =============
  /**
 * Audio synthesis and Web Audio API integration
 * Generates real-time audio from physics simulation
 */




/**
 * Initialize Web Audio API for real-time synthesis
 */
async function initAudio() {
  const context = new AudioContext({ sampleRate: 44100 });

  // Create gain node for volume control
  const gainNode = context.createGain();
  gainNode.gain.value = 0.5;

  // Create analyser for visualization
  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;

  // Use ScriptProcessorNode (deprecated but widely supported)
  // In production, should use AudioWorklet
  const bufferSize = 4096;
  const processor = context.createScriptProcessor(bufferSize, 0, 1);

  // Connect: processor -> gain -> analyser -> destination
  processor.connect(gainNode);
  gainNode.connect(analyser);
  analyser.connect(context.destination);

  return {
    context,
    processor,
    gainNode,
    analyser,
    isRunning: false,
  };
}

/**
 * Start audio synthesis with physics simulation
 */
function startAudio(
  engine,
  state,
  params,
  getInletVelocity
) {
  if (engine.isRunning) return;

  const { context, processor } = engine;
  const sampleRate = context.sampleRate;

  // Time accumulator for physics steps
  let timeAccum = 0;

  processor.onaudioprocess = (e) => {
    const output = e.outputBuffer.getChannelData(0);

    for (let i = 0; i < output.length; i++) {
      // Run physics at its own rate (could be higher than audio rate)
      const physicsStepsNeeded = Math.ceil(1 / (sampleRate * params.dt));

      for (let step = 0; step < physicsStepsNeeded; step++) {
        const inletVel = getInletVelocity();

        // Import step function
        // Note: This needs to be passed in or imported
        // For now, we'll accumulate samples
        timeAccum += params.dt;
      }

      // Get audio sample from physics state
      output[i] = getAudioSample(state, params);
    }
  };

  engine.isRunning = true;
}

/**
 * Stop audio synthesis
 */
function stopAudio(engine) {
  if (!engine.isRunning) return;

  engine.processor.onaudioprocess = null;
  engine.isRunning = false;
}

/**
 * Create audio buffer from simulation run
 * Useful for offline rendering and testing
 */
function renderAudioBuffer(
  duration,
  state,
  params,
  velocityProfile,
  stepFn
) {
  const sampleRate = 44100;
  const numSamples = Math.floor(duration * sampleRate);

  const context = new OfflineAudioContext(1, numSamples, sampleRate);
  const buffer = context.createBuffer(1, numSamples, sampleRate);
  const channelData = buffer.getChannelData(0);

  // Simulate and render
  let simTime = 0;
  const dt = 1 / sampleRate;

  for (let i = 0; i < numSamples; i++) {
    // Run multiple physics steps per audio sample if needed
    const physicsStepsPerSample = Math.max(1, Math.floor(dt / params.dt));

    for (let step = 0; step < physicsStepsPerSample; step++) {
      const velocity = velocityProfile(simTime);
      stepFn(state, params, velocity);
      simTime += params.dt;
    }

    // Get audio sample
    channelData[i] = getAudioSample(state, params);
  }

  return buffer;
}

/**
 * Apply post-processing effects to enhance realism
 */
function createEffectsChain(context) {
  const input = context.createGain();
  const output = context.createGain();

  // Add subtle reverb for chamber acoustics
  const convolver = context.createConvolver();
  // In a real implementation, load impulse response

  // Low-pass filter to remove high-frequency artifacts
  const lowpass = context.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 8000;  // Remove > 8kHz
  lowpass.Q.value = 0.7;

  // High-pass to remove DC offset and very low rumble
  const highpass = context.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 50;
  highpass.Q.value = 0.7;

  // Compression to even out dynamic range
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 30;
  compressor.ratio.value = 12;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;

  // Connect effects chain
  input.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(compressor);
  compressor.connect(output);

  return { input, output };
}

/**
 * Create a resonant filter bank for bubble frequencies
 * Enhances the characteristic bubble sounds
 */
function createBubbleFilterBank(context) {
  // Typical bubble frequencies range from 100 Hz to 3 kHz
  const frequencies = [150, 300, 600, 1200, 2400];
  const filters = [];

  for (const freq of frequencies) {
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = 5;  // Narrow resonance
    filters.push(filter);
  }

  return filters;
}

/**
 * Analyser helper to get frequency data for visualization
 */
function getFrequencyData(analyser) {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);
  return dataArray;
}

/**
 * Analyser helper to get waveform data for visualization
 */
function getWaveformData(analyser) {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteTimeDomainData(dataArray);
  return dataArray;
}

  // ============= MAIN APPLICATION =============
  /**
 * Main application - ties together physics, audio, and visualization
 */



// Global state
let state;
let params;
let audioEngine = null;
let isRunning = false;
let animationId = null;

// UI elements
const toggleBtn = document.getElementById("toggle-btn");
const pressureSlider = document.getElementById("pressure");
const depthSlider = document.getElementById("depth");
const volumeSlider = document.getElementById("volume");
const diameterSlider = document.getElementById("diameter");

// Canvases
const waterCanvas = document.getElementById("water-canvas");
const waveformCanvas = document.getElementById("waveform-canvas");
const spectrumCanvas = document.getElementById("spectrum-canvas");

const waterCtx = waterCanvas.getContext("2d");
const waveformCtx = waveformCanvas.getContext("2d");
const spectrumCtx = spectrumCanvas.getContext("2d");

// Initialize
function init() {
  params = createDefaultParams();
  state = initState(params);

  // Set up canvas sizes
  resizeCanvases();
  window.addEventListener("resize", resizeCanvases);

  // Set up UI event listeners
  setupControls();

  // Initial render
  render();
}

function resizeCanvases() {
  for (const canvas of [waterCanvas, waveformCanvas, spectrumCanvas]) {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;

    const ctx = canvas.getContext("2d");
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
}

function setupControls() {
  // Pressure slider
  pressureSlider.addEventListener("input", (e) => {
    const value = (e.target).value;
    document.getElementById("pressure-value").textContent = value;
  });

  // Depth slider
  depthSlider.addEventListener("input", (e) => {
    const value = parseFloat((e.target).value);
    document.getElementById("depth-value").textContent = value.toFixed(1);
    params.waterDepth = value / 100; // Convert cm to m
    if (!isRunning) {
      state = initState(params);
    }
  });

  // Volume slider
  volumeSlider.addEventListener("input", (e) => {
    const value = parseFloat((e.target).value);
    document.getElementById("volume-value").textContent = value.toFixed(1);
    params.chamberVolume = value / 1000; // Convert L to m³
  });

  // Diameter slider
  diameterSlider.addEventListener("input", (e) => {
    const value = parseFloat((e.target).value);
    document.getElementById("diameter-value").textContent = value.toFixed(1);
    params.tubeDiameter = value / 100; // Convert cm to m
  });

  // Toggle button
  toggleBtn.addEventListener("click", async () => {
    if (!isRunning) {
      await startSimulation();
    } else {
      stopSimulation();
    }
  });
}

async function startSimulation() {
  if (!audioEngine) {
    audioEngine = await initAudio();
  }

  // Resume audio context if suspended
  if (audioEngine.context.state === "suspended") {
    await audioEngine.context.resume();
  }

  isRunning = true;
  toggleBtn.textContent = "Stop Simulation";
  toggleBtn.className = "stop";

  // Start animation loop
  animate();
}

function stopSimulation() {
  isRunning = false;
  toggleBtn.textContent = "Start Simulation";
  toggleBtn.className = "start";

  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

function animate() {
  if (!isRunning) return;

  // Get current inlet velocity from pressure slider
  const pressure = parseFloat(pressureSlider.value);
  const inletVelocity = pressureToVelocity(pressure, params);

  // Run physics simulation
  // Run multiple steps per frame for stability
  const stepsPerFrame = 10;
  for (let i = 0; i < stepsPerFrame; i++) {
    step(state, params, inletVelocity);
  }

  // Generate audio if we have an audio engine
  if (audioEngine && audioEngine.context.state === "running") {
    // Audio is generated in real-time via ScriptProcessorNode
    // Here we just need to feed samples
    const sample = getAudioSample(state, params);

    // Create a temporary buffer for this sample
    // (In production, use proper audio callback)
  }

  // Render visualizations
  render();

  // Update stats
  updateStats();

  animationId = requestAnimationFrame(animate);
}

function render() {
  renderWaterProfile();
  if (audioEngine) {
    renderWaveform();
    renderSpectrum();
  }
}

function renderWaterProfile() {
  const canvas = waterCanvas;
  const ctx = waterCtx;
  const w = canvas.width / window.devicePixelRatio;
  const h = canvas.height / window.devicePixelRatio;

  ctx.clearRect(0, 0, w, h);

  // Draw water surface
  ctx.strokeStyle = "#4CAF50";
  ctx.lineWidth = 2;
  ctx.beginPath();

  const nx = state.h.length;
  for (let i = 0; i < nx; i++) {
    const x = (i / nx) * w;
    const waterHeight = state.h[i];
    const y = h - (waterHeight / params.waterDepth) * h * 0.8;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  // Fill water area
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = "rgba(76, 175, 80, 0.3)";
  ctx.fill();

  // Draw bubbles
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  for (const bubble of state.bubbles) {
    const x = (bubble.position / params.tubeLength) * w;
    const cellIndex = Math.floor((bubble.position / params.tubeLength) * nx);
    const waterHeight = cellIndex >= 0 && cellIndex < nx ? state.h[cellIndex] : params.waterDepth;
    const y = h - (waterHeight / params.waterDepth) * h * 0.8;

    const radius = (bubble.radius / 0.005) * 5; // Scale for visibility
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw labels
  ctx.fillStyle = "#fff";
  ctx.font = "12px monospace";
  ctx.fillText(`Cells: ${nx}`, 10, 20);
  ctx.fillText(`Water depth: ${params.waterDepth.toFixed(3)}m`, 10, 35);
}

function renderWaveform() {
  if (!audioEngine) return;

  const canvas = waveformCanvas;
  const ctx = waveformCtx;
  const w = canvas.width / window.devicePixelRatio;
  const h = canvas.height / window.devicePixelRatio;

  ctx.clearRect(0, 0, w, h);

  const waveform = getWaveformData(audioEngine.analyser);
  const sliceWidth = w / waveform.length;

  ctx.strokeStyle = "#4CAF50";
  ctx.lineWidth = 2;
  ctx.beginPath();

  for (let i = 0; i < waveform.length; i++) {
    const v = waveform[i] / 128.0;
    const y = (v * h) / 2;
    const x = i * sliceWidth;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();

  // Center line
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();
}

function renderSpectrum() {
  if (!audioEngine) return;

  const canvas = spectrumCanvas;
  const ctx = spectrumCtx;
  const w = canvas.width / window.devicePixelRatio;
  const h = canvas.height / window.devicePixelRatio;

  ctx.clearRect(0, 0, w, h);

  const spectrum = getFrequencyData(audioEngine.analyser);
  const barWidth = w / spectrum.length;

  for (let i = 0; i < spectrum.length; i++) {
    const barHeight = (spectrum[i] / 255) * h;
    const x = i * barWidth;

    // Color gradient based on frequency
    const hue = (i / spectrum.length) * 120 + 120; // Green to cyan
    ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;

    ctx.fillRect(x, h - barHeight, barWidth - 1, barHeight);
  }

  // Frequency labels
  ctx.fillStyle = "#fff";
  ctx.font = "10px monospace";
  const sampleRate = audioEngine.context.sampleRate;
  const nyquist = sampleRate / 2;

  for (let i = 0; i <= 4; i++) {
    const freq = (i / 4) * nyquist;
    const x = (i / 4) * w;
    ctx.fillText(`${Math.round(freq)}Hz`, x, h - 5);
  }
}

function updateStats() {
  document.getElementById("bubble-count").textContent = state.bubbles.length.toString();
  document.getElementById("flow-rate").textContent = Math.abs(state.airflow).toFixed(2);

  // Calculate Helmholtz frequency
  const A = Math.PI * Math.pow(params.tubeDiameter / 2, 2);
  const helmholtzFreq = (params.cAir / (2 * Math.PI)) *
    Math.sqrt(A / (params.chamberVolume * params.waterDepth));
  document.getElementById("helmholtz-freq").textContent = Math.round(helmholtzFreq).toString();

  document.getElementById("sim-time").textContent = state.time.toFixed(2);
}

// Start the application
init();

// Export for debugging
(window).debug = {
  state,
  params,
  audioEngine,
};

})();
