// public/audioScheduler.js
// Turns bubble pop events from the simulation into scheduled audio callbacks.

import { getAudioState, setTurbulenceLevel } from "./audio.js";

class ClockMapper {
  constructor() {
    this.offset = null;
    this.lastSimTime = null;
  }

  sync(simTime, audioTime) {
    this.lastSimTime = simTime;
    if (audioTime === null || audioTime === undefined) return;

    const targetOffset = audioTime - simTime;
    if (!Number.isFinite(targetOffset)) return;

    if (this.offset === null) {
      this.offset = targetOffset;
      return;
    }

    const delta = targetOffset - this.offset;
    const absDelta = Math.abs(delta);
    const slew = absDelta > 0.05 ? 0.35 : 0.1;
    this.offset += delta * slew;
  }

  isReady() {
    return this.offset !== null;
  }

  audioTimeFor(simTime) {
    if (this.offset === null) return null;
    return simTime + this.offset;
  }
}

class BubbleAudioScheduler {
  constructor() {
    this.clock = new ClockMapper();
    this.pending = [];
    this.handler = null;
    this.lookahead = 0.25;
    this.minLead = 0.08;
    this.bucketSize = 0.01;
    this.maxVoicesPerBucket = 2;
    this.maxVoicesPerOutlet = 8;
    this.maxVoicesPerCycle = 16;
    this.turbulenceLevels = [];
    this.rateNormalization = 40; // events/s for full turbulence
    this.timer = setInterval(() => this.processQueue(), 40);
  }

  setHandler(fn) {
    this.handler = fn;
  }

  ingestSnapshot(snapshot) {
    const audioState = getAudioState();
    const ctx = audioState.ctx;
    const ctxTime = ctx && ctx.state === "running" ? ctx.currentTime : null;

    this.clock.sync(snapshot.t, ctxTime);

    if (Array.isArray(snapshot.pops) && snapshot.pops.length > 0) {
      this.pending.push(...snapshot.pops);
      this.pending.sort((a, b) => a.simTime - b.simTime);
    }

    this.processQueue();
  }

  notifyAudioResumed() {
    const { ctx } = getAudioState();
    if (!ctx || this.clock.lastSimTime === null) return;
    this.clock.sync(this.clock.lastSimTime, ctx.currentTime);
    this.processQueue();
  }

  processQueue() {
    const audioState = getAudioState();
    const ctx = audioState.ctx;
    if (!ctx || ctx.state !== "running" || !this.clock.isReady()) return;

    const now = ctx.currentTime;
    const maxTime = now + this.lookahead;
    const minTime = now + this.minLead;

    const outletCount = audioState.outlets?.length ?? 4;
    const counts = new Array(outletCount).fill(0);
    if (this.turbulenceLevels.length !== outletCount) {
      this.turbulenceLevels = new Array(outletCount).fill(0);
    }

    const remaining = [];
    const bucketCounts = new Map();
    const outletVoiceCount = new Array(outletCount).fill(0);
    let globalVoices = 0;

    for (const event of this.pending) {
      const target = this.clock.audioTimeFor(event.simTime);
      const outletIndex = clampIndex(event.outletIndex ?? 0, outletCount);

      if (target === null) {
        remaining.push(event);
        continue;
      }

      if (target > maxTime) {
        remaining.push(event);
        continue;
      }

      counts[outletIndex] += 1;

      if (target < now) {
        continue;
      }

      // Quantise into 10 ms buckets per outlet so extremely dense bursts are blended.
      const bucketKey = bucketId(outletIndex, target, this.bucketSize);
      const bucketValue = bucketCounts.get(bucketKey) ?? 0;

      if (bucketValue >= this.maxVoicesPerBucket) {
        continue;
      }
      if (outletVoiceCount[outletIndex] >= this.maxVoicesPerOutlet) {
        continue;
      }
      if (globalVoices >= this.maxVoicesPerCycle) {
        continue;
      }

      bucketCounts.set(bucketKey, bucketValue + 1);
      outletVoiceCount[outletIndex] += 1;
      globalVoices += 1;

      const scheduledTime = Math.max(target, minTime);
      if (this.handler) {
        this.handler(event, scheduledTime);
      }
    }

    this.pending = remaining;
    this.updateTurbulenceLevels(counts);
  }

  updateTurbulenceLevels(counts) {
    const audioState = getAudioState();
    if (!audioState.ctx || !audioState.outlets?.length) return;
    const smoothingSeconds = 0.18; // exponential smoothing window for gurgle level
    const alpha = 1 - Math.exp(-this.lookahead / smoothingSeconds);

    for (let i = 0; i < counts.length; i++) {
      const eventsPerSecond = counts[i] / this.lookahead;
      const target = Math.min(1, eventsPerSecond / this.rateNormalization);
      const current = this.turbulenceLevels[i] ?? 0;
      const next = current + (target - current) * alpha;
      this.turbulenceLevels[i] = next;
      setTurbulenceLevel(i, next);
    }
  }
}

export const scheduler = new BubbleAudioScheduler();

function bucketId(outletIndex, audioTime, bucketSize) {
  const bucket = Math.floor(audioTime / bucketSize);
  return `${outletIndex}:${bucket}`;
}

function clampIndex(index, count) {
  if (index < 0) return 0;
  if (index >= count) return count - 1;
  return index;
}
