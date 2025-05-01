import { trackLoops } from '../sim/contourTracker.js';

// two simple segments forming an “L” shape
const segs1 = [
  [ {x:0,y:0}, {x:1,y:0} ],
  [ {x:1,y:0}, {x:1,y:1} ]
];
const loops1 = trackLoops(segs1);
console.assert(loops1.length === 1, 'Should merge 2 segments into 1 loop');
console.assert(loops1[0].id === 1, 'First loop should get ID 1');

// Next frame: same loop slightly moved
const segs2 = [
  [ {x:0.1,y:0}, {x:1.1,y:0} ],
  [ {x:1.1,y:0}, {x:1.1,y:1} ]
];
const loops2 = trackLoops(segs2, loops1);
console.assert(loops2.length === 1, 'Still 1 loop');
console.assert(loops2[0].id === 1, 'Should preserve ID 1');

console.log('✅ ContourTracker tests passed!');
