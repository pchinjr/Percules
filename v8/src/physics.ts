/**
 * Physically accurate bong simulator - Physics engine
 * Models: shallow water dynamics, bubble acoustics, Helmholtz resonance, turbulence
 */

export interface BongState {
  // Shallow water equations
  h: Float64Array;        // water height at each cell
  u: Float64Array;        // velocity at each cell

  // Bubble tracking
  bubbles: Bubble[];      // active bubbles

  // Audio state
  pressure: Float64Array; // acoustic pressure at each cell
  airflow: number;        // current airflow rate (m³/s)

  // Time tracking
  time: number;           // simulation time (s)
}

export interface Bubble {
  position: number;       // position along tube (m)
  radius: number;         // bubble radius (m)
  velocity: number;       // vertical velocity (m/s)
  birthTime: number;      // when bubble was created
}

export interface BongParams {
  // Geometry
  tubeLength: number;     // total length (m)
  tubeDiameter: number;   // tube diameter (m)
  waterDepth: number;     // initial water depth (m)
  chamberVolume: number;  // air chamber volume (m³)

  // Discretization
  nx: number;             // number of spatial cells
  dt: number;             // time step (s)

  // Physical constants
  g: number;              // gravity (m/s²)
  rho: number;            // water density (kg/m³)
  c: number;              // speed of sound in water (m/s)
  mu: number;             // water viscosity (Pa·s)
  sigma: number;          // surface tension (N/m)

  // Air properties
  rhoAir: number;         // air density (kg/m³)
  cAir: number;           // speed of sound in air (m/s)
}

export function createDefaultParams(): BongParams {
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

export function initState(params: BongParams): BongState {
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
export function step(state: BongState, params: BongParams, inletVelocity: number): void {
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
function updateShallowWater(state: BongState, params: BongParams, inletVelocity: number): void {
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
function updateBubbles(state: BongState, params: BongParams): void {
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
function generateBubbles(state: BongState, params: BongParams, inletVelocity: number): void {
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
function updateAcoustics(state: BongState, params: BongParams): void {
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
export function getAudioSample(state: BongState, params: BongParams): number {
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
export function pressureToVelocity(pressure: number, params: BongParams): number {
  // Bernoulli: v = √(2ΔP/ρ)
  // pressure is in Pa (positive = suction)
  const velocity = -Math.sign(pressure) * Math.sqrt(2 * Math.abs(pressure) / params.rho);
  return velocity;
}
