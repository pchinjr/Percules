// sim/bubble.js

import { ATM_PRESSURE } from './constants.js';

const WATER_DENSITY = 1000; // kg/m³
const GRAVITY      = 9.81; // m/s²

/**
 * Returns true if gas pressure exceeds the water column resistance.
 * @param {number} pressure    - in Pascals
 * @param {number} waterDepthCm- depth of water in cm
 */
export function shouldFormBubble({ pressure, waterDepthCm }) {
  // hydrostatic head P = ρ g h
  const waterDepthM = waterDepthCm / 100;
  const required = ATM_PRESSURE + WATER_DENSITY * GRAVITY * waterDepthM;
  return pressure >= required;
}

export function createBubbleEvent({ timestamp, pressure, volume = 0.001, energy } = {}) {
  return {
    timestamp,
    pressure,
    volume,
    energy: energy !== undefined ? energy : pressure * volume
  };
}
