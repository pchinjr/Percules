// audio/convolution.js

export function createSyntheticIR(audioCtx, durationSec = 0.3) {
  const sr = audioCtx.sampleRate;
  const len = Math.floor(sr * durationSec);
  const buf = audioCtx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const env = Math.pow(1 - i / len, 2);
      data[i] = (Math.random() * 2 - 1) * env * 0.5;
    }
  }
  return buf;
}

export function createConvolverNode(audioCtx) {
  const conv = audioCtx.createConvolver();
  conv.buffer = createSyntheticIR(audioCtx, 0.3);
  return conv;
}
