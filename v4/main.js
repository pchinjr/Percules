// main.js

import { createVessel } from './sim/vessel.js';
import { createConnection } from './sim/connection.js';
import { FluidCore } from './sim/core.js';
import { BubbleManager } from './sim/bubbles.js';
import { AudioSource } from './audio/source.js';
import { Resonator } from './audio/resonator.js';
import { setupControls } from './ui/controls.js';
import { startWaveform, bindPressureDisplay }
  from './ui/visualizer.js';

// 1) Build vessels
const downstem = createVessel({ volumeLiters: 0.1 });
const chamber = createVessel({ volumeLiters: 0.6 });
const ambient = createVessel({
  volumeLiters: 1e6,
  moleculeCount: 2.5e25 * 1e6,    // MOL_PER_LITER × 1e6 (approx)
  kineticEnergy: 101325 * 1e3     // ATM_PRESSURE × (1e6 / 1000)
});

// 2) Build connections
const leakConn = createConnection({ from: downstem, to: chamber, leakRate: 0.002 });
const ventConn = createConnection({ from: chamber, to: ambient, leakRate: 0.001 });
const suctionConn = createConnection({ from: chamber, to: downstem, leakRate: 0.016 });

const core = new FluidCore(
  [
    { name: 'downstem', vessel: downstem },
    { name: 'chamber', vessel: chamber },
    { name: 'ambient', vessel: ambient }
  ],
  [leakConn, ventConn, suctionConn]
);

// After creating downstem & chamber...
// Temporarily add a bunch of KE to the downstem:
downstem.kineticEnergy *= 10;  
console.log('👉 boosted downstem KE; new pressure:', downstem.pressure);

// Expose for console testing
window.core = core;

// 3) Bubble manager
const bubbles = new BubbleManager(core, { waterDepthCm: 5 });
window.bubbles = bubbles;

// 4) UI controls
setupControls(document.getElementById('controls'), core, null, null);

// 5) Start button
document.getElementById('start').addEventListener('click', async () => {
  // A) Init AudioSource (loads worklet)
  const audioCtx = new AudioContext();
  const source = await AudioSource.init(audioCtx);

  // B) Init Resonator
  const resonator = new Resonator(audioCtx, 'tube', { tubeLengthCm: 25, Q: 5 });

  // C) Wire audio: source → resonator → destination
  // 1) connect source.node into resonator
  const filterNode = resonator.connect(source.node);
  // 2) connect filter output to destination
  filterNode.connect(audioCtx.destination);

  // Expose for debugging
  window.source = source;
  window.resonator = resonator;

  // D) Pressure display
  bindPressureDisplay(document.getElementById('pressureDisplay'), core, 'chamber');

  // E) Waveform
  const analyser = audioCtx.createAnalyser();
  resonator.connect(analyser);
  startWaveform(document.getElementById('waveform'), analyser);

  // F) Main loop
  setInterval(() => {
    core.step(1);
    const downP = core.getVessel('downstem').pressure;
    const chamberP = core.getVessel('chamber').pressure;
    console.log(`⏲ tick ${core.timestamp}: downstem=${downP.toFixed(2)}, chamber=${chamberP.toFixed(2)}`);
    const evs = bubbles.step(1);
    console.log(`   bubbles this tick: ${evs.length}`);
    source.pushPressure(downP);
    source.pushBubbles(evs);
  }, 16);
});
