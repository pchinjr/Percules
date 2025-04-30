/* File: audio/source.js */
export class AudioSource {
  constructor(audioCtx, options = {}) {
    this.ctx = audioCtx;
    // TODO: load audioWorklet module and create AudioWorkletNode
    this.node = new AudioWorkletNode(this.ctx, 'signal-processor');
  }

  connect(dest) {
    this.node.connect(dest);
  }

  pushPressure(p) {
    this.node.port.postMessage({ type: 'pressure', value: p });
  }

  pushBubbles(events) {
    events.forEach(e => this.node.port.postMessage({ type: 'bubble', strength: e.energy }));
  }
}
