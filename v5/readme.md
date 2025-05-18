1. **Define 2D Geometry & Mesh Generator**

   * **What to do:** Implement a function that, given `tubeLength`, `tubeRadius`, and a `percolatorConfig` (preset tree/honeycomb or custom grid), outputs a 2D cell mesh and marks “probe” cell locations.
   * **Done when:**

     * Unit test calls `buildMesh({ length:10, radius:2, percolator:“honeycomb” })` and returns a grid array of the expected dimensions (e.g. 100×40 cells for 10 cm×2 cm at 1 mm resolution).
     * Probe points fall inside the fluid region (assert their indices are within mesh bounds and not in “solid” cells).

2. **Hydro‐Solver Smoke‐Test (Incompressible 2D Flow)**

   * **What to do:** Wire in a minimal 2D flow solver (e.g. lattice‐Boltzmann or simple finite‐difference Poisson) that takes an inlet pressure time series and steps one `dt`.
   * **Done when:**

     * Simulating constant inlet pressure yields a static pressure field across the mesh (within 1% of expected analytic value).
     * Simulating a linear pressure ramp produces a monotonic increase in all mesh pressures (verified via unit test).

3. **Rayleigh–Plesset Bubble Bank Module**

   * **What to do:** Build `stepBubbles(p0Sample, bubbles, dt)` that integrates the Rayleigh–Plesset ODE per bubble.
   * **Done when:**

     * Unit test for a single bubble with constant `p0Sample` produces a pure sinusoid at the Minnaert frequency (peak frequency error <1%).
     * Superposition test: two bubbles of different radii produce the sum of two distinct spectral peaks at their respective Minnaert frequencies.

4. **Flow‐Noise Approximation Module**

   * **What to do:** Implement `generateFlowNoise(v0Sample, params)` that outputs a noise waveform whose amplitude ∝ |v0|².
   * **Done when:**

     * Input `v0Sample = 0` yields a zero array.
     * Input `v0Sample` ramping from 0→1 produces noise whose RMS amplitude increases quadratically (unit test comparing RMS ratios).

5. **2D Acoustic FDTD Solver**

   * **What to do:** Create `stepAcoustics({ sources, mesh, dt })` to propagate small pressure perturbations on the 2D mesh.
   * **Done when:**

     * Impulse-injection test: an isolated delta at center cell yields a pressure decay ∝ 1/√r at probe points (within 5% for r > 5 cells).
     * Linearity test: two simultaneous impulses give the sum of individual responses (L2 error <2%).

6. **Module‐Level Unit Testing Infrastructure**

   * **What to do:** Set up Jest/Mocha harness with fixtures and “golden” data for each module above.
   * **Done when:**

     * All module tests pass in CI with 100% coverage on public interfaces.
     * Commits trigger test suite automatically and block on failures.

7. **Parameter‐Driven Integration Pipeline**

   * **What to do:** Wire modules together in a single `processFrame(params, dt)` call that returns `pPrimeAtMic`.
   * **Done when:**

     * Running `processFrame({ tubeLength:10,… }, 1e-4)` produces a non‐NaN, bounded (±10 Pa) waveform.
     * Integration‐test: for fixed parameters, FFT of a 1 s run has peaks in expected bands (bubble region \~200–800 Hz, flow region \~1–5 kHz).

8. **Web Audio Playback & Live UI Controls**

   * **What to do:** Build an `AudioWorklet` that pulls from a ring buffer fed by `processFrame`, and connect sliders for `tubeLength`, `bubbleSize`, `mix`.
   * **Done when:**

     * Tweaking any slider while sound is playing immediately changes the tonal character (verified by ear and by observing parameter values flow through to the solver inputs).
     * No audio glitches or buffer under‐runs during continuous play for ≥30 s.

9. **End‐to‐End Smoke‐Test & Demo**

   * **What to do:** Assemble a minimal HTML page that loads the full pipeline and UI.
   * **Done when:**

     * User can click “Start” → hear a bong‐like hit within 200 ms of input.
     * Changing from “tree” to “honeycomb” percolator presets yields a noticeable timbral difference (A/B test).

10. **Documentation & Example Suite**

* **What to do:** Write README sections and simple “playground” examples for each knob.
* **Done when:**

  * Another developer can follow README to clone, `npm install`, and run the demo without errors.
  * Examples directory includes at least three presets showing how to change tube length, bubble size distribution, and flow‐noise mix.

Here’s the rationale behind each probe and how you might tweak them:

1. **Inlet probe (“I”) at the bottom**

   * **Purpose:** measures the driving pressure (your suction envelope) right where the air enters.
   * **Placement:** fixed at `j = 0`, in the very first fluid cell.

2. **Bubble probe (“B”) offset from the percolator**

   * **Purpose:** captures the unsteady pressure right after the plate—where bubbles break through.
   * **Why offset?** If you sit it exactly in the plate row, you get a mix of noise from holes opening and closing plus splash. Pulling it a few cells above (`jPlate + offset`) isolates the acoustic signature of the bubble train itself.
   * **Best practice:** keep it a fixed offset (e.g. 5–10 cells) above the percolator. This stays in the “bulk” water region, so you’re not too close to the solid boundary or the free surface.

3. **Mic probe (“M”) up in the air column**

   * **Purpose:** listens to the pressure wave as it leaves the water and travels up the tube.
   * **Placement:** sit it a few cells above the water line—i.e. `j = waterHeightCells + someOffset`—so it’s in the gas, not in the liquid.

---

### Do you need a probe at the exact water surface?

You *could* add a “surface” probe at `j = waterHeightCells` to monitor sloshing or the rapid water/air interface motion. But usually:

* **Bubble dynamics** are best captured *below* the surface, in the liquid bulk just above the perc.
* **Interface dynamics** (surface waves) are lower-frequency and can muddy your bubble tone if you mix them together.

So I’d recommend keeping:

* **One probe at the bottom** (inlet pressure)
* **One usually 5–10 cells above the percolator** (bubble sound)
* **One in the air column** (mic)

If you’re really curious about the water-air interface behavior later, you can always add a fourth “surface” probe at `j = waterHeightCells` and compare its signal to the bubble probe. Let me know if you want to wire that up!
