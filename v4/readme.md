#### ✅ Phase 1: Foundation (Fluid Core)  
- [x] Scaffold **`sim/core.js`** with `FluidCore`, `Vessel`, and `Connection` classes  
- [x] Implement volumetric flows (leak, vent, forced suction) in `FluidCore.step()`  
- [x] Unit tests for mass/energy conservation and pressure updates  

#### ✅ Phase 2: Bubble Management  
- [x] Create **`sim/bubbles.js`** with `BubbleManager` that fires simple threshold‐based `BubbleEvent`s  
- [x] Hook into fluid core to emit bubbles when water‐head is overcome  
- [x] Unit tests for bubble triggering and event properties  

#### ✅ Phase 3: Audio Source Generation  
- [x] Build **`audio/source.js`** with `AudioSource` wrapping an `AudioWorkletNode`  
- [x] Implement pink‐noise turbulence + discrete bubble impulses  
- [x] Test audio source in isolation (mock pressure + bubble feeds)  

#### ✅ Phase 4: Resonator & Filtering  
- [x] Implement **`audio/resonator.js`** with both band-pass and Convolver options  
- [x] Expose `Resonator.update(params)` for tube length and IR swapping  
- [x] Smoke-test by routing `AudioSource` through `Resonator`  

#### ✅ Phase 5: UI Controls  
- [x] Build **`ui/controls.js`** to bind sliders to `FluidCore.setParams()`, `AudioSource.config()`, and `Resonator.update()`  
- [x] Add sliders for Leak Rate, Vent Rate, Suction Flow, Bubble Vol, Water Depth, Tube Length  

#### ✅ Phase 6: Visualization  
- [x] Create **`ui/visualizer.js`** for real-time waveform canvas and pressure display  
- [x] Wire up `AnalyserNode` and update pressure text every tick  

Below is a distilled list of **all our outstanding tasks**, ordered so you can make small, verifiable steps toward the final, geometry-informed bong simulator. Each task comes with a clear “validation check” you can run to confirm you’re on the right track before moving on.

---

## 🚩 Phase 7: Integration & Smoke Tests  
1. **Glue `main.js` orchestration**  
   - **What**: Wire up `FluidCore`, `BubbleManager`, `AudioSource`, `Resonator`, and UI/Visualizer exactly as in our scaffold.  
   - **Validate**:  
     - ▶ Hit **Start**, see pressure display tick upward/downward.  
     - ▶ Waveform animates (hiss + pops).  
     - ▶ No console errors.

2. **Write end-to-end smoke test**  
   - **What**: A simple script that steps the sim for N frames and asserts:  
     - Chamber/downstem pressure never NaN.  
     - At least one `BubbleEvent` in the log.  
   - **Validate**: Run `npm test` (or your test runner) and see the new smoke test pass.

---

## 🎯 Phase 8: Geometry-Driven Bubble Extraction  
3. **Extract 2D bubble contours**  
   - **What**: In `BubbleManager.step()`, grab the downstem’s water-level height array and run a marching-squares contour pass to produce an array of 2D points per bubble.  
   - **Validate**:  
     - Add a unit test that supplies a synthetic heightmap with two circular blobs and asserts you get two distinct contour arrays.  
     - Log the contour arrays to console and inspect in dev tools.

4. **Assign persistent IDs across frames**  
   - **What**: Implement a simple overlap‐based tracker that re-uses IDs when contours overlap previous ones.  
   - **Validate**:  
     - Unit test: two slightly moved circles get same ID.  
     - Log IDs in console; verify bubbles keep their ID between frames.

---

## ⚖️ Phase 9: Capacitance-Based Pitch Estimation  
5. **Compute bubble capacitance C (proxy)**  
   - **What**: For 2D circles use \(C = 2\pi R/\ln(2R/a)\) or a lookup table.  
   - **Validate**:  
     - Write a unit test: given a circle radius R, your function returns a C within 5% of the known analytic value.  

6. **Replace Minnaert stub with C-based ω**  
   - **What**: In `AudioSource`, when `pushBubbles()` arrives, compute each bubble’s pitch via  
     \[
       \omega = \sqrt{\frac{\gamma P_0}{m V_0 C}}\,,\quad m=\frac{\rho}{4\pi C}
     \]  
   - **Validate**:  
     - Console-log computed frequency for a test BubbleEvent; compare vs. Minnaert formula.  
     - Hear pitch rise/fall when you manually feed different volumes in a test harness.

---

## 🌊 Phase 10: High-Fidelity Resonance (BEM IR)  
7. **Plug in a real IR**  
   - **What**: Load a short convolution impulse into `Resonator` instead of the simple band-pass.  
   - **Validate**:  
     - Swap IR out (in UI) and hear the difference immediately.  
     - Write a tiny test that `Resonator.connect()` returns a `ConvolverNode`.

8. **Implement fast bubble-plane lookup**  
   - **What**: Precompute a 1D table: sphere radius → transfer amplitude.  
   - **Validate**:  
     - Unit test: for radius R, lookup matches your analytic approximation within tolerance.  
     - Toggle between BEM IR and lookup table in UI and compare performance.

---

## 🔥 Phase 11: Dynamic Forcing & Microbubble Extension  
9. **Neck-collapse forcing models**  
   - **What**: When a BubbleEvent is created, compute its forcing time-series f(t,R) per Deane & Czerski §14–15, and feed it into `AudioSource` instead of a simple exponential impulse.  
   - **Validate**:  
     - Plot f(t) for sample R in a unit test.  
     - Audibly, you’ll hear richer “crack” when a bubble pinches off.

10. **Seed microbubbles for high-freq tail**  
    - **What**: After each real bubble, spawn N tiny “audio” events with random R≪1 mm, summing them into the worklet for a sizzle high-end.  
    - **Validate**:  
      - Spectrum analysis: FFT shows extended high-freq energy.  
      - A/B toggle in UI between with/without microbubbles.

---

### 🛠️ Incremental Validation Strategy

- **After each task above** write **1–2 unit tests** (for numeric functions) and do **1 quick manual check** (console-log or UI toggle).  
- **Do not** skip back to Phase 8 before Phase 7’s smoke tests are green—that ensures your scaffolding is solid.  
- Keep each PR scoped to **one** numbered task above so you can always roll back easily.

With this prioritized map and validation plan, you can confidently advance module by module, knowing exactly how to confirm each step before moving on. Which task would you like to start next?

---

### 📝 Log of Learnings  
- **Fluid model**: Volumetric flows (leak, vent, forced suction) conserve mass/energy and create stable equilibrium.  
- **Bubble logic**: Threshold/head gating works but lacks geometric fidelity—next step is contour extraction.  
- **Audio pipeline**: Pink noise + impulses is a solid baseline; coupling it to downstem pressure is critical.  
- **UI binding**: Sliders must only feed simulation & audio modules via clear config APIs to avoid intertwined logic.  
- **Resonator**: Band-pass alone insufficient; IR via convolution or dynamic filters needed for realism.  
- **SIGGRAPH ’16**: True acoustic realism emerges when you compute per-bubble capacitance, apply BEM IR, and model dynamic forcing—our modular refactor will let us layer these in cleanly.