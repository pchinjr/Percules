// === STEP 1: Define types and initialize state ===
// File: src/step1.ts
export interface State {
  h: Float64Array;  // water height per cell
  u: Float64Array;  // velocity per cell
}

export interface Params {
  nx: number;       // number of cells
  dx: number;       // cell size (dx = L / nx)
  dt: number;       // time step (CFL: dt <= dx / max|u|)
  g: number;        // gravity
}

/**
 * initState: creates a flat water column with height h0
 */
export function initState(params: Params, h0: number): State {
  const h = new Float64Array(params.nx).fill(h0);
  const u = new Float64Array(params.nx).fill(0);
  return { h, u };
}

// Quick test: run `deno run src/step1.ts`
if (import.meta.main) {
  const L = 1.0;
  const nx = 10;
  const dx = L / nx;
  const params: Params = { nx, dx, dt: 0.01, g: 9.81 };
  const state = initState(params, 0.1);
  console.log(`dx = ${dx} m per cell`);
  console.log(state.h, state.u);
}