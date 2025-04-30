// audio/source.js

export class AudioSource {
  static async init(audioCtx) {
    // ensure correct path resolution:
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

  connect(dest) {
    this.node.connect(dest);
  }

  pushPressure(p) {
    this.node.port.postMessage({ type: 'pressure', value: p });
  }

  pushBubbles(events) {
    events.forEach(e =>
      this.node.port.postMessage({ type: 'bubble', strength: e.energy })
    );
  }
}
