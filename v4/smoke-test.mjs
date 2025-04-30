// smoke-test.js
import { createEngine } from './sim/engine.js';

(async function runSmokeTest() {
  console.log('🔎 Starting smoke test…');

  // 1) Build the engine with default parameters
  const engine = createEngine({
    waterDepthCm:   5,
    leakRate:       0.002,
    ventRate:       0.001,
    bubbleVol:      0.0001,
    suctionFlowRate:0.016
  });

  // 2) Run N ticks
  const N = 100;
  let sawBubble = false;

  for (let i = 0; i < N; i++) {
    engine.simulateStep(1);

    // ─── DEBUG LOG ───────────────────────────────────────────
    const { downstem, chamber, bubbleLog } = engine.getState();
    console.log(
      `tick ${i + 1}: downstem=${downstem.pressure.toFixed(2)}, ` +
      `chamber=${chamber.pressure.toFixed(2)}, ` +
      `bubblesSoFar=${bubbleLog.length}`
    );

    if (bubbleLog.length > 0) sawBubble = true;
  }

  // 3) Grab final pressures
  const { downstem, chamber } = engine.getState();
  const downP    = downstem.pressure;
  const chamberP = chamber.pressure;

  console.log(`⏲ After ${N} ticks:`);
  console.log(`   downstem pressure = ${downP.toFixed(2)}`);
  console.log(`   chamber  pressure = ${chamberP.toFixed(2)}`);
  console.assert(
    isFinite(downP) && downP > 0,
    '✗ downstem pressure should be finite and > 0'
  );
  console.assert(
    isFinite(chamberP) && chamberP > 0,
    '✗ chamber pressure should be finite and > 0'
  );
  console.assert(
    sawBubble,
    '✗ at least one bubble should have formed'
  );

  if (
    isFinite(downP) && downP > 0 &&
    isFinite(chamberP) && chamberP > 0 &&
    sawBubble
  ) {
    console.log('✅ Smoke test passed!');
  } else {
    console.error('❌ Smoke test failed!');
  }
})();
