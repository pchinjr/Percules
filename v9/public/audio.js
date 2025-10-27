// public/audio.js
// Phase 0 audio bootstrap: build a reusable Web Audio graph with per-outlet buses
// that downstream code can wire bubble sources into.

const NUM_OUTLETS = 4;
const PAN_RANGE = 0.6; // map to [-0.6, 0.6]

const audioState = {
  ctx: null,
  masterGain: null,
  limiter: null,
  outlets: [],
  masterVolume: 0.8,
  muted: false,
  started: false,
  noiseBuffer: null,
  plinkMix: 0.75,
  turbulenceMix: 0.5,
};

function configureLimiter(compressor) {
  compressor.threshold.value = -12;
  compressor.knee.value = 15;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;
}

function applyVolume() {
  if (!audioState.masterGain) return;
  const target = audioState.muted ? 0 : audioState.masterVolume;
  audioState.masterGain.gain.setTargetAtTime(
    target,
    audioState.ctx.currentTime,
    0.01,
  );
}

export async function initAudio() {
  if (audioState.ctx) {
    await audioState.ctx.resume();
    audioState.started = true;
    applyVolume();
    return audioState;
  }

  const ctx = new AudioContext({ latencyHint: "interactive" });
  const masterGain = ctx.createGain();
  masterGain.gain.value = audioState.masterVolume;

  const limiter = ctx.createDynamicsCompressor();
  configureLimiter(limiter);

  masterGain.connect(limiter);
  limiter.connect(ctx.destination);

  const noiseBuffer = createNoiseBuffer(ctx);
  audioState.noiseBuffer = noiseBuffer;

  const outlets = [];
  for (let i = 0; i < NUM_OUTLETS; i++) {
    outlets.push(createOutlet(ctx, masterGain, noiseBuffer));
  }

  audioState.ctx = ctx;
  audioState.masterGain = masterGain;
  audioState.limiter = limiter;
  audioState.outlets = outlets;
  audioState.started = true;
  audioState.muted = false;

  return audioState;
}

export async function suspendAudio() {
  if (!audioState.ctx) return;
  await audioState.ctx.suspend();
}

export function setMasterVolume(value) {
  audioState.masterVolume = Math.max(0, Math.min(1, value));
  applyVolume();
}

export function setMute(flag) {
  audioState.muted = Boolean(flag);
  applyVolume();
}

export function toggleMute() {
  setMute(!audioState.muted);
  return audioState.muted;
}

export function getOutletBus(index) {
  if (!audioState.ctx) return null;
  return audioState.outlets[index] ?? null;
}

export function getAudioState() {
  return audioState;
}

function createNoiseBuffer(ctx) {
  const duration = 1.0;
  const sampleRate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, Math.floor(duration * sampleRate), sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

export function getNoiseBuffer() {
  return audioState.noiseBuffer;
}

export function getPlinkMix() {
  return audioState.plinkMix;
}

export function getTurbulenceMix() {
  return audioState.turbulenceMix;
}

export function setPlinkTurbulenceMix(value) {
  const clamped = Math.max(0, Math.min(1, value));
  audioState.plinkMix = clamped;
  audioState.turbulenceMix = 1 - clamped;
  // Re-apply current turbulence envelope with new global mix factor.
  audioState.outlets.forEach((_, index) => {
    const outlet = audioState.outlets[index];
    if (outlet) {
      setTurbulenceLevel(index, outlet.currentTurbulenceLevel ?? 0);
    }
  });
}

export function setOutletPan(index, normalizedX) {
  const outlet = audioState.outlets[index];
  if (!outlet || !audioState.ctx) return;
  const pan = Math.max(-PAN_RANGE, Math.min(PAN_RANGE, normalizedX));
  outlet.currentPan = pan;
  outlet.panner.pan.setTargetAtTime(
    pan,
    audioState.ctx.currentTime,
    0.05,
  );
}

export function setOutletPans(xs, tankWidth) {
  if (!Array.isArray(xs) || !audioState.ctx) return;
  const width = tankWidth || 0.12;
  xs.forEach((x, i) => {
    const normalized = (x / width) * (PAN_RANGE * 2) - PAN_RANGE;
    setOutletPan(i, normalized);
  });
}

export function setTurbulenceLevel(index, level) {
  const outlet = audioState.outlets[index];
  if (!outlet || !audioState.ctx) return;
  const clampedLevel = Math.max(0, Math.min(1, level));
  outlet.currentTurbulenceLevel = clampedLevel;
  const gain = clampedLevel * audioState.turbulenceMix;
  outlet.turbulenceGain.gain.setTargetAtTime(
    gain,
    audioState.ctx.currentTime,
    0.08,
  );
}

function createOutlet(ctx, masterGain, noiseBuffer) {
  const panner = ctx.createStereoPanner();
  const plinkGain = ctx.createGain();
  const turbulenceGain = ctx.createGain();
  turbulenceGain.gain.value = 0;

  // Small filtered noise bed that can be faded up as bubble rate increases.
  const turbulenceFilter = ctx.createBiquadFilter();
  turbulenceFilter.type = "bandpass";
  turbulenceFilter.frequency.value = 550;
  turbulenceFilter.Q.value = 0.9;

  const turbulenceSource = ctx.createBufferSource();
  turbulenceSource.buffer = noiseBuffer;
  turbulenceSource.loop = true;
  turbulenceSource.connect(turbulenceFilter);
  turbulenceFilter.connect(turbulenceGain);
  turbulenceSource.start();

  plinkGain.connect(panner);
  turbulenceGain.connect(panner);
  panner.connect(masterGain);

  // Turbulence source runs continuously; we only modulate gain per outlet.
  return {
    panner,
    plinkGain,
    turbulenceGain,
    turbulenceFilter,
    turbulenceSource,
    currentPan: 0,
    currentTurbulenceLevel: 0,
  };
}
