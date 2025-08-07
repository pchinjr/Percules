// === STEP 2: Simplify to a single damped oscillator ===
// File: src/step2.ts

/**
 * State and parameters for a damped mass-spring oscillator.
 */
export interface OscParams {
  omega: number;   // natural frequency (rad/s)
  zeta: number;    // damping ratio
  dt: number;      // time step
  inlet: number;   // external forcing
}

export interface OscState {
  x: number;       // displacement
  v: number;       // velocity
}

/**
 * Step one time increment using explicit Euler integration.
 * Equation: x'' + 2*zeta*omega*x' + omega^2*x = inlet
 */
export function stepOsc(state: OscState, params: OscParams): void {
  const { omega, zeta, dt, inlet } = params;
  // acceleration: a = F/m - 2*zeta*omega*v - omega^2*x
  const a = inlet - 2 * zeta * omega * state.v - omega * omega * state.x;
  // update velocity and displacement
  state.v = state.v + a * dt;
  state.x = state.x + state.v * dt;
}

// Demo usage
if (import.meta.main) {
  const params: OscParams = { omega: 20, zeta: 0.05, dt: 0.01, inlet: -1 };
  const state: OscState = { x: 0, v: 0 };
  console.log("Initial x, v:", state.x.toFixed(3), state.v.toFixed(3));
  for (let i = 1; i <= 5; i++) {
    stepOsc(state, params);
    console.log(`After step ${i}: x=${state.x.toFixed(3)}, v=${state.v.toFixed(3)}`);
  }
}