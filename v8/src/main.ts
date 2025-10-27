/**
 * Main application - ties together physics, audio, and visualization
 */

import {
  BongState,
  BongParams,
  createDefaultParams,
  initState,
  step,
  getAudioSample,
  pressureToVelocity,
} from "./physics.ts";

import {
  AudioEngine,
  initAudio,
  getFrequencyData,
  getWaveformData,
} from "./audio.ts";

// Global state
let state: BongState;
let params: BongParams;
let audioEngine: AudioEngine | null = null;
let isRunning = false;
let animationId: number | null = null;

// UI elements
const toggleBtn = document.getElementById("toggle-btn") as HTMLButtonElement;
const pressureSlider = document.getElementById("pressure") as HTMLInputElement;
const depthSlider = document.getElementById("depth") as HTMLInputElement;
const volumeSlider = document.getElementById("volume") as HTMLInputElement;
const diameterSlider = document.getElementById("diameter") as HTMLInputElement;

// Canvases
const waterCanvas = document.getElementById("water-canvas") as HTMLCanvasElement;
const waveformCanvas = document.getElementById("waveform-canvas") as HTMLCanvasElement;
const spectrumCanvas = document.getElementById("spectrum-canvas") as HTMLCanvasElement;

const waterCtx = waterCanvas.getContext("2d")!;
const waveformCtx = waveformCanvas.getContext("2d")!;
const spectrumCtx = spectrumCanvas.getContext("2d")!;

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

    const ctx = canvas.getContext("2d")!;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
}

function setupControls() {
  // Pressure slider
  pressureSlider.addEventListener("input", (e) => {
    const value = (e.target as HTMLInputElement).value;
    document.getElementById("pressure-value")!.textContent = value;
  });

  // Depth slider
  depthSlider.addEventListener("input", (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    document.getElementById("depth-value")!.textContent = value.toFixed(1);
    params.waterDepth = value / 100; // Convert cm to m
    if (!isRunning) {
      state = initState(params);
    }
  });

  // Volume slider
  volumeSlider.addEventListener("input", (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    document.getElementById("volume-value")!.textContent = value.toFixed(1);
    params.chamberVolume = value / 1000; // Convert L to m³
  });

  // Diameter slider
  diameterSlider.addEventListener("input", (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    document.getElementById("diameter-value")!.textContent = value.toFixed(1);
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
  document.getElementById("bubble-count")!.textContent = state.bubbles.length.toString();
  document.getElementById("flow-rate")!.textContent = Math.abs(state.airflow).toFixed(2);

  // Calculate Helmholtz frequency
  const A = Math.PI * Math.pow(params.tubeDiameter / 2, 2);
  const helmholtzFreq = (params.cAir / (2 * Math.PI)) *
    Math.sqrt(A / (params.chamberVolume * params.waterDepth));
  document.getElementById("helmholtz-freq")!.textContent = Math.round(helmholtzFreq).toString();

  document.getElementById("sim-time")!.textContent = state.time.toFixed(2);
}

// Start the application
init();

// Export for debugging
(window as any).debug = {
  state,
  params,
  audioEngine,
};
