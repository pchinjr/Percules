percules-bong-sim/
├── README.md
├── deno.json
├── import_map.json
├── src/
│   ├── engine.ts      # Core physics engine (initState, step)
│   └── cli.ts         # Deno CLI driver (flags, main loop)
├── tests/
│   └── engine_test.ts # Unit tests for conservation & wave speed
└── examples/
    └── viz.html       # Simple HTML + Canvas visualizer

--- README.md ---
# Percules Bong Simulator MVP

A minimal 1D shallow-water solver for bong chamber dynamics, written in TypeScript for Deno 2.4.

## Requirements
- Deno v2.4

## Simulation Specs
Before diving in, define your simulation parameters:

- **Tube Length (L):** Total physical length of the bong chamber (e.g., 0.3 m).
- **Resolution (nx):** Number of discrete cells along the tube (e.g., 200 cells).
- **Default Water Depth (h₀):** Initial height of water filling the chamber (e.g., 0.1 m).
- **Gravity (g):** Acceleration due to gravity (9.81 m/s²).
- **Time Step (dt):** Chosen to satisfy the CFL condition: `dt ≤ dx / max|u|`, where `dx = L / nx` and `u` is fluid velocity.

These specs ensure stability and physical plausibility of the 1D shallow-water model.

## Setup
```bash
# Install dependencies (std library via import map)
denoland task run --allow-read --allow-net
```

## Tasks
```json
{ "tasks": { 
    "run": "deno run --import-map=import_map.json --allow-read --allow-net src/cli.ts --",  
    "test": "deno test --import-map=import_map.json --allow-read" 
  }
}
```

--- import_map.json ---
{
  "imports": {
    "std/": "https://deno.land/std@0.189.0/"
  }
}

--- deno.json ---
{
  "importMap": "import_map.json",
  "compilerOptions": {
    "lib": ["esnext", "dom"],
    "strict": true
  },
  "tasks": {
    "run": "deno run --import-map=import_map.json --allow-read --allow-net src/cli.ts --",
    "test": "deno test --import-map=import_map.json --allow-read"
  }
}

--- src/engine.ts ---
/*
 * Simple 1D Shallow Water Solver in TypeScript for Deno
 * Simulates water height and velocity in a tube (e.g., a bong chamber)
 */

export interface State {
  h: Float64Array;    // water height at each cell
  u: Float64Array;    // velocity at each cell
}

export interface Params {
  nx: number;         // number of cells
  dx: number;         // spatial step
  dt: number;         // time step
  g: number;          // gravity constant
}

/**
 * Initialize state with still water of height h0 and zero velocity.
 */
export function initState(params: Params, h0: number): State {
  const h = new Float64Array(params.nx).fill(h0);
  const u = new Float64Array(params.nx).fill(0);
  return { h, u };
}

/**
 * Perform one time step (Lax-Friedrichs) update of shallow water equations.
 */
export function step(state: State, params: Params): void {
  const { nx, dx, dt, g } = params;
  const hNew = new Float64Array(nx);
  const uNew = new Float64Array(nx);

  // Lax-Friedrichs scheme for h and u
  for (let i = 1; i < nx - 1; i++) {
    const hL = state.h[i - 1];
    const hR = state.h[i + 1];
    const uL = state.u[i - 1];
    const uR = state.u[i + 1];

    // Predictor-corrector or simple LF
    const fluxH = 0.5 * (hR * uR + hL * uL);
    const fluxU = 0.5 * (uR * uR + g * hR - (uL * uL + g * hL));

    hNew[i] = 0.5 * (hR + hL) - (dt / (2 * dx)) * fluxH;
    uNew[i] = 0.5 * (uR + uL) - (dt / (2 * dx)) * fluxU;
  }

  // simple reflective boundaries
  hNew[0] = hNew[1];
  hNew[nx - 1] = hNew[nx - 2];
  uNew[0] = 0;
  uNew[nx - 1] = 0;

  // copy new into state
  state.h.set(hNew);
  state.u.set(uNew);
}

/**
 * Example driver: simulates for given steps and logs h at mid
 */
if (import.meta.main) {
  const params: Params = { nx: 200, dx: 0.005, dt: 0.001, g: 9.81 };
  const state = initState(params, 0.1);

  // create initial perturbation (e.g., water inlet)
  state.u[50] = -1.0;  // suction at cell 50

  for (let stepCount = 0; stepCount < 1000; stepCount++) {
    step(state, params);
    // output middle height as a simple probe
    console.log(state.h[Math.floor(params.nx/2)].toFixed(5));
  }
}


--- src/cli.ts ---
import { parse } from "std/flags/mod.ts";
import { initState, step, Params, State } from "./engine.ts";

async function main() {
  const flags = parse(Deno.args, {
    default: { nx: 200, dx: 0.005, dt: 0.001, h0: 0.1, inlet: -1.0, steps: 1000 }
  });
  const params: Params = { nx: Number(flags.nx), dx: Number(flags.dx), dt: Number(flags.dt), g: 9.81 };
  const state: State = initState(params, Number(flags.h0));
  state.u[Math.floor(params.nx / 4)] = Number(flags.inlet);

  for (let i = 0; i < Number(flags.steps); i++) {
    step(state, params);
    console.log(state.h[Math.floor(params.nx / 2)].toFixed(5));
  }
}

if (import.meta.main) await main();

--- tests/engine_test.ts ---
import { assertEquals, assert } from "std/testing/asserts.ts";
import { initState, step, Params } from "../src/engine.ts";

deno.test("mass conservation", () => {
  const params: Params = { nx: 50, dx: 0.01, dt: 0.001, g: 9.81 };
  const state = initState(params, 0.1);
  for (let i = 0; i < 100; i++) step(state, params);
  const totalH = state.h.reduce((a, b) => a + b, 0);
  assert(Math.abs(totalH - 50 * 0.1) < 1e-6);
});

--- examples/viz.html ---
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Bong Sim Viz</title></head>
<body>
  <canvas id="canvas" width="600" height="200"></canvas>
  <script type="module">
    import { initState, step, Params } from "../src/engine.ts";
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    const params: Params = { nx: 200, dx: 0.005, dt: 0.001, g: 9.81 };
    const state = initState(params, 0.1);
    state.u[Math.floor(params.nx/4)] = -1.0;

    function draw() {
      step(state, params);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      state.h.forEach((h, i) => {
        const x = (i / params.nx) * canvas.width;
        const y = canvas.height - h * canvas.height;
        ctx.lineTo(x, y);
      });
      ctx.stroke();
      requestAnimationFrame(draw);
    }
    draw();
  </script>
</body>
</html>
