// sim/connection.js

import { MOL_PER_LITER } from './constants.js';

// Leak rate in liters per tick (e.g. 0.0001 L/tick = 0.1 mL/tick)
const BASE_LEAK_RATE = 0.0001;

export function createConnection({ from, to, leakRate = BASE_LEAK_RATE } = {}) {
  return {
    from,
    to,
    leakRate,

    simulateFlow(dt = 1) {
      const ΔP = this.from.pressure - this.to.pressure;
      if (ΔP <= 0) return;

      // Molecules moved per tick
      const molFlow = this.leakRate * MOL_PER_LITER * dt;
      const energyFlow = molFlow * this.from.temperature;

      this.from.removeMolecules(molFlow, energyFlow);
      this.to.addMolecules(molFlow, energyFlow);
    }
  };
}
