// smoke-test.mjs
import { createEngine } from '../sim/engine.js';

(async function runSmokeTest() {
  console.log('🔎 Starting smoke test…');

  // 1) Instantiate engine
  const engine = createEngine({
    waterDepthCm:    5,
    leakRate:        0.002,
    ventRate:        0.001,
    bubbleVol:       0.0001,
    suctionFlowRate: 0.016
  });

  // 2) Run N ticks
  const N = 100;
  let sawBubble = false;

  for (let i = 1; i <= N; i++) {
    engine.simulateStep(1);
    const { downstem, chamber, bubbleLog } = engine.getState();

    // debug first few ticks if still at equilibrium
    if (i <= 5) {
      console.log(
        ` tick ${i}: downstem=${downstem.pressure.toFixed(2)}, ` +
        `chamber=${chamber.pressure.toFixed(2)}, ` +
        `bubblesSoFar=${bubbleLog.length}`
      );
    }

    if (bubbleLog.length > 0) sawBubble = true;
  }

  // 3) Final state
  const { downstem, chamber, bubbleLog } = engine.getState();
  const downP    = downstem.pressure;
  const chamberP = chamber.pressure;

  console.log(`⏲ After ${N} ticks:`);
  console.log(`   downstem pressure = ${downP.toFixed(2)}`);
  console.log(`   chamber  pressure = ${chamberP.toFixed(2)}`);
  console.assert(
    isFinite(downP) && downP > 101325,
    '✗ downstem pressure should have risen above ambient'
  );
  console.assert(
    isFinite(chamberP) && chamberP > 101325,
    '✗ chamber pressure should have risen above ambient'
  );
  console.assert(
    sawBubble,
    '✗ at least one bubble should have formed'
  );

  if (
    isFinite(downP) && downP > 101325 &&
    isFinite(chamberP) && chamberP > 101325 &&
    sawBubble
  ) {
    console.log('✅ Smoke test passed!');
    process.exit(0);
  } else {
    console.error('❌ Smoke test failed!');
    process.exit(1);
  }
})();
