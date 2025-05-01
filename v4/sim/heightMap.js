// sim/heightMap.js

/**
 * Generate a binary height-map for a vertical downstem.
 * Cells below the water line (=1) will contour the air–water interface.
 *
 * @param {import('./vessel.js').Vessel} vessel
 * @param {number} waterDepthCm  // water depth in cm
 * @param {number} cols         // horizontal resolution
 * @param {number} rows         // vertical resolution
 * @returns {number[][]}        // rows×cols grid of 0 or 1
 */
export function generateHeightMap(vessel, waterDepthCm, cols = 10, rows = 20) {
    // Assume the downstem is a uniform column of height maxDepthCm.
    // Choose a max depth of 20 cm for mapping.
    const maxDepthCm = 20;
    // Compute how many rows should be “wet”
    const wetRows = Math.min(
      rows,
      Math.max(0, Math.round((waterDepthCm / maxDepthCm) * rows))
    );
  
    // Fill grid: row=0 at surface, row=rows-1 at bottom
    const grid = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, () =>
        /* 1 if r ≥ rows - wetRows, else 0 */ r >= rows - wetRows ? 1 : 0
      )
    );
  
    return grid;
  }
  