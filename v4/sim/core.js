/* File: sim/core.js */
import { createVessel } from './vessel.js';
import { createConnection } from './connection.js';

export class FluidCore {
  /** @param {{name: string, vessel: import('./vessel.js').Vessel}[]} initialVessels */
  constructor(initialVessels = [], initialConns = []) {
    this.vessels = new Map();
    initialVessels.forEach(({ name, vessel }) => this.vessels.set(name, vessel));
    this.connections = initialConns;
  }

  /** Step all flows and update vessel states */
  step(dt = 1) {
    // TODO: apply each connection.simulateFlow(dt)
    this.connections.forEach(conn => conn.simulateFlow(dt));
  }

  /** @returns import('./vessel.js').Vessel */
  getVessel(name) {
    return this.vessels.get(name);
  }

  /** Set simulation parameters on vessels or connections */
  setParams(params) {
    // TODO: distribute params (leakRate, ventRate, suctionFlowRate, etc.)
  }
}
