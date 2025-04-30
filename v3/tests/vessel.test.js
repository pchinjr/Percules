import { createVessel } from '../sim/vessel.js';

function assertEqual(actual, expected, message) {
  if (Math.abs(actual - expected) > 1e-6) {
    console.error(`❌ FAIL: ${message}\nExpected: ${expected}, Got: ${actual}`);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

function runVesselTests() {
  console.log("Running Vessel Tests...");

  const vessel = createVessel({
    volumeLiters: 1,
    moleculeCount: 1e20,
    kineticEnergy: 1e5
  });

  // volume 1 L = 0.001 m³, so pressure = 1e5 / 0.001 = 1e8
  assertEqual(vessel.pressure, 1e8, "Pressure = KE / Volume");

  // temperature = KE / moleculeCount
  assertEqual(vessel.temperature, 1e5 / 1e20, "Temperature = KE / moleculeCount");

  vessel.addMolecules(1e20, 5e4);
  assertEqual(vessel.moleculeCount, 2e20, "Molecule count increases correctly");
  assertEqual(vessel.kineticEnergy, 1.5e5, "Kinetic energy increases correctly");

  vessel.removeMolecules(1e20, 5e4);
  assertEqual(vessel.moleculeCount, 1e20, "Molecule count decreases correctly");
  assertEqual(vessel.kineticEnergy, 1e5, "Kinetic energy decreases correctly");

  console.log("✅ Vessel tests complete.\n");
}

runVesselTests();
