# Percules
Yes, I can absolutely do that. Let’s organize this development process into a clear and modular structure.

---

## ✅ Project Plan: *Percules Simulator PoC*

---

### 📋 Task List (Backlog + Progress Tracker)

#### ✅ **Phase 1: Foundation**
- [x ] Set up project with basic structure (web based)
- [ ] Define core simulation entities: `Vessel`, `Connection`, `BubbleEvent`
- [ ] Implement `simulateStep()` function to update state based on suction and pressure
- [ ] Track kinetic energy, molecule count, pressure per vessel
- [ ] Write unit tests for pressure and flow calculations

#### 🔄 **Phase 2: Bubble Modeling**
- [ ] Implement bubble threshold logic (based on pressure vs water resistance)
- [ ] Generate `BubbleEvent` with energy and timing
- [ ] Unit test: triggering bubbles under increasing suction

#### 🎧 **Phase 3: Audio Signal Generation**
- [ ] Convert pressure events to audio buffer (Web Audio API)
- [ ] Apply impulse response filters (basic convolution)
- [ ] Add turbulence noise layer
- [ ] Test different bong shapes with distinct IRs

#### 🔊 **Phase 4: Real-Time UI (Optional)**
- [ ] Hook simulation to a basic visual + audio UI
- [ ] Add sliders for water level, suction strength, downstem length, etc.
- [ ] Live preview of sound output

#### 🔲 Phase 5: UI & Presets
- [x] Expose leakRate, ventRate, bubbleVol, suctionStrength, waterDepthCm sliders  
- [ ] **Propagate slider changes to AudioWorklet** via port.postMessage  
- [ ] Map leakRate → `noiseGain`, bubbleVol → `bubbleStrengthScale`, suctionStrength → `scaleDelta`  
- [ ] Update `signal-processor.js` to handle `config` messages  
- [ ] Visual presets: percolator count / shape presets  

#### 🔲 Phase 6: Percolators & Shapes
- [ ] Support multiple parallel leak-connections (percolators)  
- [ ] UI toggles to add/remove percolator branches  
- [ ] Shape presets for beaker, straight, recycler


---

### 📚 Running Learning Log (Percules Knowledge Base)

| Date       | Concept/Problem Area           | Key Insight or Learning                                   |
|------------|--------------------------------|-----------------------------------------------------------|
| 2025-04-30 | Gas simulation using PV=nRT    | Replaced with kinetic theory of gases for simpler flow    |
| 2025-04-30 | Pressure as sound              | Fluctuations in pressure at the output = audio waveform   |
| 2025-04-30 | Impulse response filtering     | Convolution lets us simulate the acoustic space of a bong |
| 2025-04-30 | Bubble modeling                | Threshold events convert pressure into energy bursts      |
| (log grows)| ...                            | ...                                                       |

---

### 📦 Folder Structure (Initial Suggestion)

```
percules/
├── index.html
├── style.css
├── main.js                 ← Entry point
├── /sim/
│   ├── engine.js          ← Simulation loop & coordination
│   ├── vessel.js          ← Vessel pressure/flow model
│   ├── connection.js      ← Valve & flow between vessels
│   └── bubble.js          ← Bubble formation & events
├── /audio/
│   ├── signal.js          ← Pressure-to-audio mapping
│   ├── filters.js         ← Impulse response & noise layering
├── /tests/
│   └── bubble.test.js     ← Simple unit test runner for bubbles
├── percules.log.md        ← Ongoing dev notes
└── README.md
```