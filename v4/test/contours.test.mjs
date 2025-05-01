// test/contours.test.mjs

import { extractContours } from '../sim/contours.js';

function assert(cond, msg) {
  if (!cond) throw new Error('✗ ' + msg);
}

// Synthetic 5×5 grid with a single “blob” in center
const grid = [
  [0,0,0,0,0],
  [0,1,1,1,0],
  [0,1,1,1,0],
  [0,1,1,1,0],
  [0,0,0,0,0]
];

const contours = extractContours(grid);
console.log('contours:', contours);

assert(contours.length > 0, 'Should detect at least one contour segment');
contours.forEach((pts, i) => {
  assert(pts.length >= 1, `Contour segment ${i} should have ≥1 point`);
});

console.log('✅ Contour extraction test passed!');
