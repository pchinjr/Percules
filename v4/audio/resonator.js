/* File: audio/resonator.js */
export class Resonator {
  constructor(audioCtx, type = 'tube', params = {}) {
    this.ctx = audioCtx;
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = type === 'tube' ? 'bandpass' : 'lowpass';
    this.update(params);
  }

  connect(src) {
    src.connect(this.filter);
    return this.filter;
  }

  update({ tubeLengthCm, Q } = {}) {
    if (tubeLengthCm) {
      const L = tubeLengthCm / 100;
      this.filter.frequency.value = 343 / (4 * L);
    }
    if (Q) {
      this.filter.Q.value = Q;
    }
  }
}
