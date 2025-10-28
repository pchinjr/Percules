# Percules v0

Percules is a small Deno project that simulates the airflow and bubbling inside a simple water pipe. A headless physics core (`sim.ts`) models headspace pressure, airflow through a percolator, and the discrete bubbles that rise through the tank. A Deno HTTP server streams simulation snapshots over Server‑Sent Events (SSE), and a lightweight browser client renders the state in real time.

## Project Layout

- `sim.ts` – deterministic physics core that tracks headspace gas, outlet reservoirs, and bubble lifecycles.
- `server.ts` – Deno server exposing the browser UI, control endpoint, and `/events` SSE stream.
- `public/app.js` / `public/index.html` – browser UI for live visualization and parameter tweaking.
- `bong.ts` – earlier CLI experiment that walks through the same physics concepts step by step.
- `deno.json` – task aliases for linting, formatting, and testing.

## Quick Start

```bash
deno task lint        # optional sanity check
deno run -A server.ts # start the SSE server on http://localhost:8080
```

Open a browser to `http://localhost:8080` to see the live animation. Use the sliders to adjust draw strength, submergence depth, and conductances; the UI posts updates back to the server, which patches the running simulation.

## How the Simulation Works

1. **Headspace tracking** – Gas moles in the headspace convert to pressure via the ideal gas equation (`Ph = nRT / V`). Inhaling through the mouthpiece linearly removes volume, which lowers the pressure.
2. **Perc inflow** – The downstem is modeled as an orifice with square‑root flow (`Q ∝ √ΔP`). Airflow accumulates in four outlet reservoirs that represent small perc holes.
3. **Bubble detachment** – Each reservoir repeatedly sheds bubbles once enough volume is available. Detachment volume is jittered to keep the plume organic.
4. **Rise dynamics** – Individual bubbles expand or contract according to local hydrostatic pressure and rise with a simple drag‑limited terminal velocity.
5. **Surface return** – When bubbles reach the surface, their volume is converted back into headspace moles, closing the loop.

Snapshots produced by `getSnapshot()` include everything the UI needs: pressures, flow rates, perc metadata, and a trimmed bubble list for rendering.

## Browser Client

`public/app.js` subscribes to the SSE stream, keeps the latest snapshot, and paints the tank on a `<canvas>`. It also performs optimistic UI updates when controls are moved:

1. Handle slider input, update numeric labels, and `POST` parameter changes to `/controls`.
2. On each animation frame, draw the tank, perc outlets, and all current bubbles using snapshot data.
3. Render the bong silhouette with color-coded pressure markers, directional flow arrows, and a HUD that tracks flows plus badge values for headspace, bowl, tip, and mouth.

## Current Progress

- Parameterised physics core with bubble detach, rise, and return all tied to adjustable conductances and draw depth.
- Server-Sent Event loop that pushes snapshots ~20 Hz without blocking the physics integrator.
- Canvas visualiser that tracks perc geometry, outlet positions, bubble clouds, and live pressure/flow overlays from the bowl through the downstem to the mouth.
- Web Audio layer with per-outlet buses: plinks are spatialised, a turbulence bed responds to bubble rate, and users can balance plink vs. turbulence mix from the UI.
- Scheduler that maps simulation time to audio time, batches pop events, and caps voice counts so heavy draws remain stable.

## Roadmap / Future Plans

- Add preset management (e.g. “gentle draw”, “chug”) that stores simulation parameters and audio mix targets.
- Extend the turbulence model with reverb / room sends and expose additional mix controls (reverb level, EQ tilt).
- Surface more telemetry in the HUD (per-outlet rates, average bubble size) and feed those numbers into future audio timbre tweaks.
- Package the clock mapper + scheduler into reusable utilities for tighter AV sync, including manual resync controls.
- Investigate mobile UX constraints (touch-only audio unlock, reduced canvas load) and add responsive layout tweaks.
- Add automated tests that exercise the physics integrator and guard against regressions in bubble event generation.

## Additional Scripts

- `deno task lint` – run `deno lint`.
- `deno task format` – apply `deno fmt`.
- `deno task test` – run any Deno tests (currently none defined).

## Legacy CLI Walkthrough

`bong.ts` contains a console-based progression of the same physics ideas. Running `deno run -A bong.ts` steps through the derivation and logs intermediate values; it is useful for understanding or validating the model in isolation.

## Development Notes

- The project assumes Deno 1.39+ for native `Deno.serve` support.
- All physics code is synchronous and deterministic; the server simply advances time using a fixed-step integrator.
- Because the client receives the full bubble list each tick, very large bubble counts are trimmed to keep the payload manageable.
