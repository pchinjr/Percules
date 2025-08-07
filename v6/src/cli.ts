// === STEP 3: Build a minimal CLI driver ===
// File: src/cli.ts
import { stepOsc, OscParams, OscState } from "./step2.ts";

(async function() {
  // Hardcoded oscillator parameters
  const params: OscParams = {
    omega: 20,    // rad/s, pitch
    zeta: 0.05,   // damping
    dt: 0.01,     // time step
    inlet: -1     // suction force
  };
  const state: OscState = { x: 0, v: 0 };

  console.log("Running damped oscillator sim (x, v) over 100 steps:");
  for (let i = 1; i <= 100; i++) {
    stepOsc(state, params);
    console.log(state.x.toFixed(4), state.v.toFixed(4));
  }
})();