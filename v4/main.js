/* File: main.js */
import { FluidCore }      from './sim/core.js';
import { BubbleManager }  from './sim/bubbles.js';
import { AudioSource }    from './audio/source.js';
import { Resonator }      from './audio/resonator.js';
import { setupControls }  from './ui/controls.js';
import { startWaveform, bindPressureDisplay } from './ui/visualizer.js';

// 1) Initialize core
const core = new FluidCore([
  { name: 'downstem', vessel: /* createVessel call */ null },
  { name: 'chamber',  vessel: /* createVessel call */ null }
], []);

// 2) Bubble manager
const bubbles = new BubbleManager(core, { waterDepthCm: 5 });

// 3) Audio setup
const audioCtx  = new AudioContext();
const source    = new AudioSource(audioCtx);
const resonator = new Resonator(audioCtx, 'tube', { tubeLengthCm: 25, Q: 5 });
source.connect(resonator.connect(audioCtx.destination));

// 4) UI hooks
setupControls(document.getElementById('controls'), core, source, resonator);
bindPressureDisplay(document.getElementById('pressureDisplay'), core, 'chamber');

// 5) Waveform
const analyser = audioCtx.createAnalyser();
resonator.connect(analyser);
const stopWave = startWaveform(document.getElementById('waveform'), analyser);

// 6) Main loop
setInterval(() => {
  core.step(1);
  const evs = bubbles.step(1);
  source.pushPressure(core.getVessel('downstem').pressure);
  source.pushBubbles(evs);
}, 16);
