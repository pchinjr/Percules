// audio/signal.js

import { createFilters }      from './filters.js';
import { createConvolverNode } from './convolution.js';

let audioCtx, node, vesselRef, bubbleLogRef;

export async function initAudio(vessel, getBubbleLog) {
  audioCtx     = new (window.AudioContext || window.webkitAudioContext)();
  vesselRef    = vessel;
  bubbleLogRef = getBubbleLog;

  await audioCtx.audioWorklet.addModule('audio/signal-processor.js');
  node = new AudioWorkletNode(audioCtx, 'signal-processor');

  // filters + convolution
  let outputNode = node;
  if (typeof audioCtx.createBiquadFilter === 'function') {
    const { input: fIn, output: fOut } = createFilters(audioCtx);
    node.connect(fIn);
    const convolver = createConvolverNode(audioCtx);
    fOut.connect(convolver);
    convolver.connect(audioCtx.destination);
    outputNode = convolver;
  } else {
    const convolver = createConvolverNode(audioCtx);
    node.connect(convolver);
    convolver.connect(audioCtx.destination);
    outputNode = convolver;
  }

  // attach analyser after final node
  const analyser = audioCtx.createAnalyser();
  outputNode.connect(analyser);

  let lastBubbleCount = 0;
  setInterval(() => {
    node.port.postMessage({ type: 'pressure', value: vesselRef.pressure });
    const log = bubbleLogRef();
    if (log.length > lastBubbleCount) {
      log.slice(lastBubbleCount).forEach(b => {
        node.port.postMessage({ type: 'bubble', strength: b.energy * 0.01 });
      });
      lastBubbleCount = log.length;
    }
  }, 16);

  return { analyser };
}
