// sim/acoustics.js

/**
 * Compute a 2D “capacitance” for a bubble of radius R (in meters),
 * using the thin‐wire approximation: C = 2π R / ln(2R / a),
 * where a is a small core radius to avoid the singularity.
 *
 * @param {number} R  Bubble radius in meters
 * @param {number} a  Core/bandwidth radius in meters (default 1 mm)
 * @returns {number}
 */
export function computeCapacitance2D(R, a = 1e-3) {
    if (R <= a) throw new Error('Radius must exceed core radius');
    return (2 * Math.PI * R) / Math.log((2 * R) / a);
  }
  
  /**
   * Compute Minnaert frequency f₀ (Hz) for a 3D bubble:
   *   f₀ = (1 / 2πR) * sqrt(3γP₀ / ρ)
   *
   * @param {number} R      Bubble radius (m)
   * @param {number} P0     Ambient pressure (Pa)
   * @param {number} gamma  Heat capacity ratio (default 1.4)
   * @param {number} rho    Fluid density (kg/m³, default water≈1000)
   */
  export function computeMinnaertFreq(R, P0, gamma = 1.4, rho = 1000) {
    return (1 / (2 * Math.PI * R)) * Math.sqrt((3 * gamma * P0) / rho);
  }
  