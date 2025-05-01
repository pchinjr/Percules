// sim/contours.js

/**
 * Run a simple marching-squares on a 2D scalar grid to get 0.5-level contours.
 * @param {number[][]} grid  M×N array of values in [0…1]
 * @returns {Array<Array<{x:number,y:number}>>}  List of contours, each is an array of {x,y} points
 */
export function extractContours(grid) {
    const rows = grid.length;
    const cols = grid[0]?.length || 0;
    const contours = [];
  
    // Offsets for the 4 cell corners
    const dx = [0, 1, 1, 0];
    const dy = [0, 0, 1, 1];
  
    // For each cell
    for (let i = 0; i < rows - 1; i++) {
      for (let j = 0; j < cols - 1; j++) {
        // Determine 4-bit case index
        let idx = 0;
        for (let k = 0; k < 4; k++) {
          if (grid[i + dy[k]][j + dx[k]] >= 0.5) idx |= 1 << k;
        }
        // Skip empty or full cells
        if (idx === 0 || idx === 15) continue;
  
        // For simplicity, emit each edge midpoint as a “vertex”
        // (You can refine this to linear interpolation for higher fidelity)
        const pts = [];
        // Edge 0-1
        if ([1, 3, 5, 7, 9, 11, 13, 15].includes(idx)) {
          pts.push({ x: j + 0.5, y: i });
        }
        // Edge 1-2
        if ([2, 3, 6, 7, 10, 11, 14, 15].includes(idx)) {
          pts.push({ x: j + 1,   y: i + 0.5 });
        }
        // Edge 2-3
        if ([4, 6, 5, 7, 12, 14, 13, 15].includes(idx)) {
          pts.push({ x: j + 0.5, y: i + 1 });
        }
        // Edge 3-0
        if ([8, 9, 10, 11, 12, 13, 14, 15].includes(idx)) {
          pts.push({ x: j,       y: i + 0.5 });
        }
        if (pts.length > 0) contours.push(pts);
      }
    }
  
    return contours;
  }
  