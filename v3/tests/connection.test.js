import { createVessel } from '../sim/vessel.js';
import { createConnection } from '../sim/connection.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

function runConnectionTests() {
  console.log("Running Connection Tests...");

  const A = createVessel({
    volumeLiters: 1,
    moleculeCount: 1e20,
    kineticEnergy: 2e5 // higher pressure
  });

  const B = createVessel({
    volumeLiters: 1,
    moleculeCount: 1e20,
    kineticEnergy: 1e5 // lower pressure
  });

  // Increase flowRate to ensure transfer is noticeable
  const connection = createConnection({ from: A, to: B, flowRate: 0.1 });

  const pressureBefore = {
    from: A.pressure,
    to: B.pressure
  };

  connection.simulateFlow(1); // 1 time unit

  const pressureAfter = {
    from: A.pressure,
    to: B.pressure
  };

  assert(
    pressureAfter.from < pressureBefore.from,
    "From-vessel pressure should decrease after flow"
  );

  assert(
    pressureAfter.to > pressureBefore.to,
    "To-vessel pressure should increase after flow"
  );

  assert(
    A.moleculeCount < 1e20,
    "From-vessel molecule count should decrease"
  );

  assert(
    B.moleculeCount > 1e20,
    "To-vessel molecule count should increase"
  );

  console.log("Connection Tests Complete.\n");
}

runConnectionTests();
