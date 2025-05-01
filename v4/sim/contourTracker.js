// sim/contourTracker.js

let nextId = 1;

/**
 * Given an array of raw contour segments (arrays of {x,y}),
 * stitch into loops and assign stable IDs using lastFrameLoops.
 *
 * @param {Array<Array<{x:number,y:number}>>} segments
 * @param {Array<{id:number, points: Array<{x,y}>}>} lastLoops
 * @returns {Array<{id:number, points: Array<{x,y}>}>}
 */
export function trackLoops(segments, lastLoops = []) {
  // 1) Build adjacency: each segment is a node, if two share an endpoint they’re neighbors
  const n = segments.length;
  const adj = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (sharesEndpoint(segments[i], segments[j])) {
        adj[i].push(j);
        adj[j].push(i);
      }
    }
  }

  // 2) Find connected components (simple DFS)
  const visited = new Array(n).fill(false);
  const loops = [];
  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;
    const stack = [i], comp = [];
    visited[i] = true;
    while (stack.length) {
      const u = stack.pop();
      comp.push(u);
      for (const v of adj[u]) {
        if (!visited[v]) {
          visited[v] = true;
          stack.push(v);
        }
      }
    }
    // 3) Merge segments in this component into one polyline
    const points = comp.flatMap(idx => segments[idx]);
    loops.push({ id: null, points });
  }

  // 4) Match against lastLoops by centroid proximity
  const result = [];
  const usedLast = new Set();
  for (const loop of loops) {
    const c = centroid(loop.points);
    let best = null, bestDist = Infinity;
    for (const old of lastLoops) {
      if (usedLast.has(old.id)) continue;
      const d = distance(c, centroid(old.points));
      if (d < bestDist) {
        bestDist = d;
        best = old;
      }
    }
    if (best && bestDist < 1.0) {  // threshold in grid‐units
      loop.id = best.id;
      usedLast.add(best.id);
    } else {
      loop.id = nextId++;
    }
    result.push(loop);
  }

  return result;
}

// Helpers
function sharesEndpoint(a, b) {
  return a.some(p => b.some(q => p.x === q.x && p.y === q.y));
}

function centroid(pts) {
  const sum = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / pts.length, y: sum.y / pts.length };
}

function distance(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.hypot(dx, dy);
}
