// audio/source.js

import { computeMinnaertFreq } from '../sim/acoustics.js';
import { ATM_PRESSURE }        from '../sim/constants.js';

export class AudioSource {
  /**
   * Load the AudioWorklet processor and return a ready‐to‐use AudioSource
   * @param {AudioContext} audioCtx
   */
  static async init(audioCtx) {
    // ensure correct path resolution for the worklet module
    await audioCtx.audioWorklet.addModule(
      new URL('./signal-processor.js', import.meta.url)
    );
    const node = new AudioWorkletNode(audioCtx, 'signal-processor');
    return new AudioSource(audioCtx, node);
  }

  constructor(audioCtx, node) {
    this.ctx  = audioCtx;
    this.node = node;
  }

  /**
   * Connect this AudioSource’s output into another AudioNode
   * @param {AudioNode} dest
   */
  connect(dest) {
    this.node.connect(dest);
  }

  /**
   * Push the latest static pressure reading into the worklet
   * @param {number} p  Pressure in Pa
   */
  pushPressure(p) {
    this.node.port.postMessage({ type: 'pressure', value: p });
  }

  /**
   * Push new bubble events into the worklet, each with its own pitch
   * @param {Array<{volume:number, energy:number}>} events
   */
  pushBubbles(events) {
    for (const e of events) {
      // Convert bubble volume from liters → m³
      const volumeM3 = e.volume * 1e-3;
      // Compute radius (m) of the bubble via sphere volume
      const R = Math.cbrt((3 * volumeM3) / (4 * Math.PI));
      // Compute Minnaert resonance frequency (Hz)
      const freq = computeMinnaertFreq(R, ATM_PRESSURE);
      // Send both strength (energy) and frequency to the worklet
      this.node.port.postMessage({
        type:     'bubble',
        strength: e.energy,
        freq
      });
    }
  }
}
