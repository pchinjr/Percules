import { createEngine } from '../sim/engine.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

function runEngineTest() {
  console.log("Running Engine Integration Test...");

  const COOLDOWN = 50;
  // <— set waterDepthCm to 0 so hydrostatic gating is disabled
  const engine = createEngine({ suctionStrength: 2000, waterDepthCm: 0 });

  const initialBubbles = engine.getState().bubbleLog.length;
  const initialKE      = engine.getState().chamber.kineticEnergy;

  for (let i = 0; i < COOLDOWN + 10; i++) {
    engine.simulateStep(1);
  }

  const state    = engine.getState();
  const bubbles  = state.bubbleLog.length;
  const finalKE  = state.chamber.kineticEnergy;
  const pressure = state.downstem.pressure;

  assert(
    bubbles > initialBubbles,
    "At least one bubble should have formed after the cooldown"
  );
  assert(
    finalKE < initialKE,
    `Chamber KE should have decreased from ${initialKE} to a lower value`
  );
  assert(
    finalKE >= 0,
    `Chamber KE should never be negative, got ${finalKE}`
  );
  assert(
    pressure >= 0,
    `Downstem pressure should remain ≥ 0, got ${pressure}`
  );

  console.log("✅ Engine Test Complete.\n");
}

runEngineTest();
