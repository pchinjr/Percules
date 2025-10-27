// public/plinkSynth.js
// Procedural plink synthesis for bubble pop events.

import {
  getAudioState,
  getNoiseBuffer,
  getOutletBus,
  getPlinkMix,
} from "./audio.js";

const WATER_DENSITY = 998;
const GRAVITY = 9.80665;
const GAMMA = 1.4;
const MIN_FREQ = 200;
const MAX_FREQ = 4000;

function computeMinnaertFrequency(radiusM, localPressure) {
  if (!Number.isFinite(radiusM) || radiusM <= 0) return 400;
  if (!Number.isFinite(localPressure) || localPressure <= 0) {
    localPressure = 101_325;
  }
  const base = (1 / (2 * Math.PI * radiusM)) *
    Math.sqrt((3 * GAMMA * localPressure) / WATER_DENSITY);
  return clamp(base, MIN_FREQ, MAX_FREQ);
}

function voiceEnvelope(radiusM) {
  const radiusMm = clamp(radiusM * 1000, 0.4, 2.5);
  const t = (radiusMm - 0.4) / (2.5 - 0.4);
  const attack = lerp(0.0025, 0.006, t);
  const decay = lerp(0.09, 0.18, t);
  const sustain = attack + decay;
  return { attack, decay, sustain };
}

function amplitudeFromVolume(volume) {
  if (!Number.isFinite(volume) || volume <= 0) return 0.08;
  const ref = 7e-9; // approximate detach volume
  const norm = clamp(volume / ref, 0.4, 4);
  return clamp(0.1 * Math.pow(norm, 0.6), 0.05, 0.45);
}

function mapQ(radiusM) {
  const radiusMm = clamp(radiusM * 1000, 0.4, 2.5);
  return lerp(9, 13, 1 - (radiusMm - 0.4) / (2.5 - 0.4));
}

function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}

export function schedulePlinkVoice(event, when) {
  const { ctx } = getAudioState();
  const noiseBuffer = getNoiseBuffer();
  if (!ctx || ctx.state !== "running" || !noiseBuffer) return;

  const outlet = getOutletBus(event.outletIndex);
  const dest = outlet?.plinkGain ??
    getAudioState().masterGain ??
    ctx.destination;

  const localPressure = (event.headspacePa ?? 101_325) +
    WATER_DENSITY * GRAVITY * Math.max(0, event.depth_m || 0);
  const freq = computeMinnaertFrequency(event.radius_m, localPressure);
  const { attack, decay } = voiceEnvelope(event.radius_m);
  const mix = getPlinkMix();
  if (mix <= 0) return;
  // Bubble volume drives overall loudness; mix slider scales it globally.
  const amplitude = amplitudeFromVolume(event.volume_m3) * mix;
  const q = mapQ(event.radius_m);
  const stopTime = when + attack + decay + 0.05;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(amplitude, when + attack);
  gain.gain.linearRampToValueAtTime(0.0001, when + attack + decay);
  gain.connect(dest);

  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.setValueAtTime(freq, when);
  band.Q.setValueAtTime(q, when);
  band.connect(gain);

  const highShelf = ctx.createBiquadFilter();
  highShelf.type = "highshelf";
  highShelf.frequency.setValueAtTime(freq * 1.5, when);
  highShelf.gain.setValueAtTime(4, when);
  highShelf.connect(gain);

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = false;
  noise.connect(band);
  noise.start(when);
  noise.stop(stopTime);

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq * 0.98, when);
  osc.frequency.linearRampToValueAtTime(freq * 1.05, when + decay * 0.6);
  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(amplitude * 0.5, when);
  oscGain.gain.exponentialRampToValueAtTime(amplitude * 0.08, when + decay);
  osc.connect(oscGain);
  oscGain.connect(highShelf);
  osc.start(when);
  osc.stop(stopTime);

  noise.onended = () => {
    band.disconnect();
    highShelf.disconnect();
    gain.disconnect();
  };
}
