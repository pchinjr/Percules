/* File: sim/bubbles.js */
import { shouldFormBubble, createBubbleEvent } from './bubble.js';
import { extractContours } from './contours.js';
import { trackLoops } from './contourTracker.js';
import { generateHeightMap } from './heightMap.js';

export class BubbleManager {
  /** @param {FluidCore} core */
  constructor(core, settings = {}) {
    this.core = core;
    this.settings = settings;
    this.lastLoops = [];
    this.lastTime = 0;
  }

  /**
    * @param {number} dt
    * @returns {import('./bubble.js').BubbleEvent[]}
    */
  step(dt = 1) {
    this.lastTime += dt;
    const downstem = this.core.getVessel('downstem');
    const p = downstem.pressure;

    // ─── 1) Generate height-map & extract raw segments
    const grid = generateHeightMap(downstem, this.settings.waterDepthCm);
    const segments = extractContours(grid);

    // ─── 2) Stitch segments into loops & assign stable IDs
    const loops = trackLoops(segments, this.lastLoops);
    this.lastLoops = loops;

    // Debug: print loop IDs and lengths
    console.log(
      `🔸 contours: ${segments.length} segments → ${loops.length} loops`,
      loops.map(l => l.id)
    );

    // ─── 3) Legacy threshold bubble
    const events = [];
    if (
      this.lastTime > (this._lastBubbleTime || 0) + this.settings.bubbleCooldown &&
      shouldFormBubble({ pressure: p, waterDepthCm: this.settings.waterDepthCm })
    ) {
      events.push(
        createBubbleEvent({
          timestamp: this.lastTime,
          pressure: p,
          volume: this.settings.bubbleVol,
          energy: this.settings.bubbleVol * MOL_PER_LITER * downstem.temperature
        })
      );
      this._lastBubbleTime = this.lastTime;
    }

    return events;
  }
}
