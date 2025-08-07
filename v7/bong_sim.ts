// bong_sim.ts
// deno run --allow-write bong_sim.ts
// Generates a bong hit WAV with bubbling pulses and continuous gurgle noise

// WAV header writer
function writeWav(samples: Float32Array, sampleRate = 44100, fileName = "bong_hit.wav") {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  let offset = 0;

  // RIFF header
  [0x52,0x49,0x46,0x46].forEach(c => view.setUint8(offset++, c));
  view.setUint32(offset, 36 + dataSize, true); offset += 4;
  [0x57,0x41,0x56,0x45].forEach(c => view.setUint8(offset++, c));

  // fmt chunk
  [0x66,0x6d,0x74,0x20].forEach(c => view.setUint8(offset++, c));
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, numChannels, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, byteRate, true); offset += 4;
  view.setUint16(offset, blockAlign, true); offset += 2;
  view.setUint16(offset, bytesPerSample * 8, true); offset += 2;

  // data chunk
  [0x64,0x61,0x74,0x61].forEach(c => view.setUint8(offset++, c));
  view.setUint32(offset, dataSize, true); offset += 4;

  // PCM samples
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s * 0x7FFF, true);
    offset += 2;
  }

  Deno.writeFileSync(fileName, new Uint8Array(buffer));
  console.log(`WAV written to ${fileName}`);
}

// Generate bubble force events via Poisson process with random freq
interface ForceEvent { time: number; force: number; freq: number; }
function simulateFluidForces(duration: number): ForceEvent[] {
  const events: ForceEvent[] = [];
  const bubbleRate = 3000; // avg bubbles/sec
  let t = 0;
  while (t < duration) {
    const interval = -Math.log(Math.random()) / bubbleRate;
    t += interval;
    if (t >= duration) break;
    const freq = 500 + Math.random() * 1500;
    events.push({ time: t, force: 1, freq });
  }
  return events;
}

// Synthesize audio: pulses + continuous gurgle noise
function synthesizeAudio(forces: ForceEvent[], sampleRate = 44100): Float32Array {
  const decay = 0.05;
  const duration = forces[forces.length - 1].time + decay;
  const len = Math.ceil(duration * sampleRate);
  const audio = new Float32Array(len);

  // 1) Add bubble pulses
  forces.forEach(f => {
    const idx = Math.floor(f.time * sampleRate);
    const irLen = Math.ceil(decay * sampleRate);
    for (let n = 0; n < irLen && idx + n < len; n++) {
      const t = n / sampleRate;
      const env = Math.exp(-t / decay);
      audio[idx + n] += f.force * env * Math.sin(2 * Math.PI * f.freq * t);
    }
  });

  // 2) Add low-frequency gurgle: filtered white noise envelope
  const gurgle = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    gurgle[i] = (Math.random() * 2 - 1);
  }
  // simple low-pass filter at ~500 Hz
  let prev = 0;
  const rc = 1 / (2 * Math.PI * 500);
  const alpha = (1 / sampleRate) / (rc + 1 / sampleRate);
  for (let i = 0; i < len; i++) {
    prev = prev + alpha * (gurgle[i] - prev);
    audio[i] += 0.2 * prev;  // lower volume for gurgle
  }

  // Normalize
  const max = Math.max(...audio.map(Math.abs));
  if (max > 0) for (let i = 0; i < len; i++) audio[i] /= max;
  return audio;
}

// Main
const duration = 1.0;
const forces = simulateFluidForces(duration);
const audio = synthesizeAudio(forces);
writeWav(audio);
