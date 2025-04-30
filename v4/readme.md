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

#### 🔲 Phase 7: Integration & Refinement  
- [ ] Glue `main.js` to orchestrate `FluidCore` → `BubbleManager` → `AudioSource` → `Resonator` → UI/Visualizer  
- [ ] End-to-end smoke test: sliders drive audio & visuals in sync  
- [ ] Add end-to-end integration tests (sim + audio messaging)  

#### 🔲 Phase 8: Geometry-Driven Bubble Acoustics  
- [ ] Refactor `BubbleManager` to extract 2D contours per bubble (marching squares) & track IDs  
- [ ] Replace fixed-volume pops with radius-based events  

#### 🔲 Phase 9: Capacitance-Based Pitch Estimation  
- [ ] In `audio/source.js`, compute bubble capacitance C from contour  
- [ ] Drive pitched oscillator per bubble at ω = √(γP₀/(mV₀C))  

#### 🔲 Phase 10: High-Fidelity Resonance (BEM IR)  
- [ ] Add optional full-3D BEM solver for container IR in `audio/resonator.js`  
- [ ] Provide fast fallback lookup for real-time  

#### 🔲 Phase 11: Dynamic Forcing & Microbubble Extension  
- [ ] Implement Deane & Czerski neck-collapse forcing functions on bubble lifecycle  
- [ ] Seed audio-only microbubble populations for high-frequency tail  

---

### 📝 Log of Learnings  
- **Fluid model**: Volumetric flows (leak, vent, forced suction) conserve mass/energy and create stable equilibrium.  
- **Bubble logic**: Threshold/head gating works but lacks geometric fidelity—next step is contour extraction.  
- **Audio pipeline**: Pink noise + impulses is a solid baseline; coupling it to downstem pressure is critical.  
- **UI binding**: Sliders must only feed simulation & audio modules via clear config APIs to avoid intertwined logic.  
- **Resonator**: Band-pass alone insufficient; IR via convolution or dynamic filters needed for realism.  
- **SIGGRAPH ’16**: True acoustic realism emerges when you compute per-bubble capacitance, apply BEM IR, and model dynamic forcing—our modular refactor will let us layer these in cleanly.