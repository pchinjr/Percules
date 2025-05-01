import {
    computeCapacitance2D,
    computeMinnaertFreq
} from '../sim/acoustics.js';
import { ATM_PRESSURE } from '../sim/constants.js';

function assert(cond, msg) {
    if (!cond) throw new Error('✗ ' + msg);
}

// 2D Capacitance monotonicity
const C1 = computeCapacitance2D(0.01);   // R=1 cm
const C2 = computeCapacitance2D(0.02);   // R=2 cm
assert(C2 > C1, 'Capacitance should increase with radius');

// Reject too-small R
let threw = false;
try { computeCapacitance2D(1e-4, 1e-3); } catch (e) { threw = true; }
assert(threw, 'Should throw if R ≤ a');

// Minnaert frequency behavior
const fSmall = computeMinnaertFreq(1e-3, ATM_PRESSURE);
const fLarge = computeMinnaertFreq(2e-3, ATM_PRESSURE);
assert(fSmall > fLarge, 'Smaller bubbles should resonate at higher freq');

console.log('✅ Acoustics tests passed!');
