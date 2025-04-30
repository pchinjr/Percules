import { shouldFormBubble, createBubbleEvent } from '../sim/bubble.js';

function assert(condition, message) {
  if (!condition) console.error(`❌ FAIL: ${message}`);
  else console.log(`✅ PASS: ${message}`);
}

function runBubbleTests() {
  console.log("Running Bubble Tests...");

  assert(
    !shouldFormBubble({ pressure: 102000, waterDepthCm: 10 }),
    "No bubble at low pressure / deeper water"
  );

  assert(
    shouldFormBubble({ pressure: 120000, waterDepthCm: 5 }),
    "Bubble forms when pressure exceeds water resistance"
  );

  const evt = createBubbleEvent({ timestamp: 1234, pressure: 120000, volume: 0.002 });
  assert(evt.timestamp === 1234, "BubbleEvent stores timestamp");
  assert(evt.pressure === 120000, "BubbleEvent stores pressure");
  assert(evt.energy > 0, "BubbleEvent computes non-zero energy");

  console.log("✅ Bubble Tests Complete.\n");
}

runBubbleTests();
