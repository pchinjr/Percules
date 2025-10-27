# Percules
Percules explores how close a browser- (and later Deno-) based simulator can get to the sound of an actual percolator. The repository is a time capsule of eight self-contained milestones, each capturing what we learned and shipped on the way from a hand-tuned web toy to a multi-physics audio engine.

---

## Directory Map
- `v1/` – First interactive experiment; canvas UI, preset toggles, heuristic bubble counter, and Web Audio band-pass bursts.
- `v2/` – Refined fluid heuristics, modularized audio/visual code, preset-driven bong silhouettes, and slider-driven parameter tweaks.
- `v3/` – Modular simulation core (`sim/`), bubble event log, AudioWorklet-based synthesis pipeline, waveform visualizer, and the first learning log.
- `v4/` – Full architecture split (FluidCore, BubbleManager, AudioSource, Resonator, UI), convolution IR support, analyser-driven UI, and task-tracked roadmap.
- `v5/` – Geometry-aware direction: 2D mesh generator, hydro solver smoke tests, probe placement rationale, and a comprehensive plan for FDTD acoustics.
- `v6/` – TypeScript/Deno MVP with a 1D shallow-water solver, CLI driver, unit tests, and a minimal HTML visualizer.
- `v7/` – Procedural audio focus: real-time chunk scheduler in the browser, Poisson bubble events, gurgle noise shaping, and an offline Deno WAV renderer.
- `v8/` – Physically grounded build: coupled shallow-water + bubble + acoustics engine, Helmholtz resonance modelling, Deno dev server, real-time visual analytics.

Each folder includes its own source, assets, and (where needed) supplemental docs. You can open any snapshot in isolation to inspect or run it.

---

## Evolution Highlights
**v1 — Heuristic beginnings**  
Single-page HTML/JS app with a canvas draw loop, mouse/touch “hold to hit,” and a simple accumulator that fires band-pass filtered noise bursts when suction exceeds the water head.

**v2 — UI + preset polish**  
Introduced the `FluidBongPhysics` stepper, `RealisticBongAudio` with size-aware bursts, and `drawBongVisual` to render distinct bong geometries per preset while sliders keep physics and audio in sync.

**v3 — Modular engine & AudioWorklet**  
Switched to mole-/energy-based vessels, leak/vent flows, discrete `BubbleEvent`s, and an AudioWorklet processor driven by pressure telemetry. Added waveform visualisation and per-module tests/logs.

**v4 — Systems integration**  
Rebuilt around `FluidCore` coordinating multiple vessels and connections, `BubbleManager` spawning events, `AudioSource` pushing frequency-aware bubbles, and `Resonator` layering filters/IRs. UI controls, waveform canvas, and pressure readout run from a single loop.

**v5 — Geometry-first planning**  
Pivoted toward proper 2D modelling with a mesh generator (tree, honeycomb, custom perc layouts), hydro solver smoke tests, probe placement guide, and a numbered roadmap covering Rayleigh–Plesset bubbles, flow noise, FDTD acoustics, and documentation.

**v6 — Deno shallow-water MVP**  
Ported the solver to TypeScript for Deno 2.4, delivering `engine.ts` (Lax–Friedrichs shallow water), a CLI runner, unit tests for conservation/wave speed, and a simple typed-array visualiser example.

**v7 — Procedural audio study**  
Focused on stochastic bubble timing and tonal control: Web Audio chunk scheduler with adjustable bubble rate/frequency/decay/gurgle, plus a Deno script (`bong_sim.ts`) that renders a one-shot hit to `bong_hit.wav`.

**v8 — Physically accurate simulator**  
Combined shallow-water dynamics, buoyancy/drag bubble evolution, Minnaert + Helmholtz resonance, turbulence noise, and Web Audio output. Includes a Deno dev server, interactive controls, FFT/time-domain displays, default physical constants, and reference citations.

---

## Working With the Snapshots
- **Browsers (v1–v5, v7)**: Open the `index.html` file in a modern browser. Some versions fetch assets or AudioWorklets, so serve via `deno task dev`, `python -m http.server`, or similar if you hit CORS/worklet restrictions.
- **Deno builds (v6 & v8)**: Install Deno ≥2.4. Use the bundled tasks (`deno task run`, `deno task dev`, `deno task test`) described in each subfolder’s README.
- **Offline audio (v7)**: `deno run --allow-write bong_sim.ts` synthesises `bong_hit.wav`.
- **Docs & notes**: Roadmaps and logs live beside their code (`v3/percules.log.md`, `v4/readme.md`, `v5/readme.md`, `v8/README.md`) and capture assumptions, validation steps, and future work.

---

## Where to Go Next
- Compare versions side-by-side to see how core ideas (bubble triggering, pressure telemetry, audio shaping) evolve across implementations.
- Borrow components: e.g., couple v6’s 1D solver with v7’s procedural audio, or lift v5’s mesh generator into a future v9.
- Extend the v8 build with higher-dimensional flow, refined turbulence, or recording/export features as noted in its “Future Enhancements.”

Have fun exploring the path from “blub-blub” sketches to physically grounded Percules simulations.
