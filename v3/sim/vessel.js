// sim/vessel.js

import { ATM_PRESSURE, MOL_PER_LITER } from './constants.js';

export function createVessel({
  volumeLiters   = 1,
  moleculeCount = MOL_PER_LITER * volumeLiters,
  kineticEnergy = ATM_PRESSURE * (volumeLiters / 1000)
} = {}) {
  return {
    volumeLiters,
    moleculeCount,
    kineticEnergy,

    // Convert volumeLiters → m³ for pressure = KE / m³
    get pressure() {
      const volumeM3 = this.volumeLiters / 1000;
      return this.kineticEnergy / volumeM3;
    },

    // True average energy per molecule
    get temperature() {
      return this.kineticEnergy / this.moleculeCount;
    },

    addMolecules(count, energy) {
      this.moleculeCount += count;
      this.kineticEnergy += energy;
    },

    removeMolecules(count, energy) {
      this.moleculeCount = Math.max(1e10, this.moleculeCount - count);
      this.kineticEnergy = Math.max(0, this.kineticEnergy - energy);
    },

    debug() {
      return {
        pressure: this.pressure.toFixed(2),
        temperature: this.temperature.toExponential(2),
        moleculeCount: this.moleculeCount.toExponential(2),
        kineticEnergy: this.kineticEnergy.toExponential(2)
      };
    }
  };
}
