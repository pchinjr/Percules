/* File: sim/bubbles.js */
import { shouldFormBubble, createBubbleEvent } from './bubble.js';

export class BubbleManager {
  /** @param {FluidCore} core */
  constructor(core, settings = {}) {
    this.core = core;
    this.settings = settings;
    this.lastTime = 0;
  }

  /** @returns {import('./bubble.js').BubbleEvent[]} */
  step(dt = 1) {
    const events = [];
    this.lastTime += dt;
    const downstem = this.core.getVessel('downstem');
    const p = downstem.pressure;
    // TODO: use shouldFormBubble and cooldown to emit events
    if (shouldFormBubble({ pressure: p, waterDepthCm: this.settings.waterDepthCm })) {
      events.push(createBubbleEvent({ timestamp: this.lastTime, pressure: p }));
    }
    return events;
  }
}
