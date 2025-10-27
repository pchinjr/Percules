// ===== Constants (units in SI) =====
const GAS_CONSTANT = 8.314462618; // J/(mol·K) “joules of energy per mole of gas per kelvin of temperature”
const ROOM_TEMPERATURE = 293; // K
const AIR_PRESSURE_AT_SEA_LEVEL = 101_325; // Pa
const HEADSPACE_VOLUME = 0.0005; // m^3 (0.5 L)

const WATER_DENSITY = 998; // kg/m^3
const GRAVITY = 9.80665; // m/s^2
const submergedDepthMeters = 0.06; // m (6 cm)

const AIR_PRESSURE_AT_BOWL = AIR_PRESSURE_AT_SEA_LEVEL;
const STEM_CONDUCTANCE = 1.2e-6; // m^3 / (s * sqrt(Pa))

const MOUTH_CONDUCTANCE = 6e-9; // m^3 / (s * Pa)
const DRAW_DEPTH_PA = 7000; // Pa below atm at peak (try 7000 to force bubbling with 6 cm depth)
const RAMP_IN_SECONDS = 0.4;
const RAMP_OUT_SECONDS = 0.3;

const DRAG_COEFF = 0.8; // C_d ~0.6–1.0 for small bubbles; tune

// ===== Step 5 constants (detachment + rise) =====
// Pick a typical detachment radius for the bubble that forms at the downstem tip.
const DETACH_RADIUS_METERS = 1.2e-3; // 1.2 mm
const MEAN_DETACH_VOLUME = (4 / 3) * Math.PI * DETACH_RADIUS_METERS ** 3; // m^3
const DETACH_JITTER_MIN = 0.90; // +/- ~10% jitter to feel organic
const DETACH_JITTER_MAX = 1.10;

// ===== State =====
let airMolesInHeadspace = (AIR_PRESSURE_AT_SEA_LEVEL * HEADSPACE_VOLUME) /
  (GAS_CONSTANT * ROOM_TEMPERATURE);

let underwaterAirVolumeAtTip = 0; // m^3 waiting to detach as bubbles

// Step 5 state: active bubbles in the water column
type Bubble = {
  id: number;
  radiusMeters: number; // current radius (updates as it rises)
  depthMeters: number; // 0 at surface
  riseSpeedMps: number; // updated each step
  volumeM3: number; // current volume (updates as it rises)
  initialVolumeM3: number; // volume at detachment
  detachPressurePa: number; // headspace + rho*g*h at spawn
};

let bubbles: Bubble[] = [];
let bubbleCounter = 0;

// ===== Helpers =====
function getHeadspacePressure(): number {
  return (airMolesInHeadspace * GAS_CONSTANT * ROOM_TEMPERATURE) /
    HEADSPACE_VOLUME;
}

function getPressureAtStemTip(): number {
  return getHeadspacePressure() +
    WATER_DENSITY * GRAVITY * submergedDepthMeters;
}

function getAirflowIntoWater(): number {
  const pressureDrop = AIR_PRESSURE_AT_BOWL - getPressureAtStemTip(); // Pa
  return pressureDrop > 0 ? STEM_CONDUCTANCE * Math.sqrt(pressureDrop) : 0; // m^3/s
}

function getMouthTargetPressure(
  currentTime: number,
  simulationDuration: number,
): number {
  const startTarget = AIR_PRESSURE_AT_SEA_LEVEL;
  const endTarget = AIR_PRESSURE_AT_SEA_LEVEL - DRAW_DEPTH_PA;

  if (currentTime < RAMP_IN_SECONDS) {
    const a = currentTime / RAMP_IN_SECONDS; // ramp-in 0→1
    return startTarget + a * (endTarget - startTarget);
  }
  const tailStart = Math.max(0, simulationDuration - RAMP_OUT_SECONDS);
  if (currentTime > tailStart) {
    const a = (currentTime - tailStart) / RAMP_OUT_SECONDS; // ramp-out 0→1
    return endTarget + a * (startTarget - endTarget);
  }
  return endTarget; // hold
}

function getAirflowOutOfHeadspace(
  headspacePressure: number,
  currentTime: number,
  simulationDuration: number,
): number {
  const mouthTarget = getMouthTargetPressure(currentTime, simulationDuration);
  const pressureDrop = headspacePressure - mouthTarget; // Pa
  return pressureDrop > 0 ? MOUTH_CONDUCTANCE * pressureDrop : 0; // m^3/s
}

// ===== Step 5 helpers =====
function randBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

// Convert the tip reservoir into one or more bubbles whenever it’s large enough.
function spawnBubblesFromTipReservoir(): number {
  let spawned = 0;
  while (underwaterAirVolumeAtTip >= MEAN_DETACH_VOLUME * DETACH_JITTER_MIN) {
    const detachVolume = MEAN_DETACH_VOLUME *
      randBetween(DETACH_JITTER_MIN, DETACH_JITTER_MAX);
    if (underwaterAirVolumeAtTip < detachVolume) break;

    underwaterAirVolumeAtTip -= detachVolume;

    const detachPressurePa = getHeadspacePressure() +
      WATER_DENSITY * GRAVITY * submergedDepthMeters;
    const initialVolume = detachVolume;
    const initialRadius = Math.cbrt((3 * initialVolume) / (4 * Math.PI));

    // Determine radius from volume (assume spherical)
    bubbles.push({
      id: ++bubbleCounter,
      radiusMeters: initialRadius,
      depthMeters: submergedDepthMeters,
      riseSpeedMps: 0,
      volumeM3: initialVolume,
      initialVolumeM3: initialVolume,
      detachPressurePa,
    });
    spawned++;
  }
  return spawned;
}

// Advance bubbles; return total volume that reached the surface this step.
function advanceBubblesAndCollectPopped(timeStep: number): number {
  let poppedVolume = 0;
  const Ph = getHeadspacePressure();

  for (const b of bubbles) {
    // Update size from pressure change (Boyle's law)
    updateBubbleSizeWithBoyle(b, Ph);
    // Compute terminal speed for current size
    b.riseSpeedMps = terminalRiseSpeed(b);
    // Move upward
    b.depthMeters = Math.max(0, b.depthMeters - b.riseSpeedMps * timeStep);
  }

  const still: Bubble[] = [];
  for (const b of bubbles) {
    if (b.depthMeters <= 0) poppedVolume += b.volumeM3;
    else still.push(b);
  }
  bubbles = still;
  return poppedVolume;
}

function localWaterPressureAtDepth(
  headspacePa: number,
  depthMeters: number,
): number {
  return headspacePa + WATER_DENSITY * GRAVITY * Math.max(0, depthMeters);
}

function updateBubbleSizeWithBoyle(b: Bubble, headspacePa: number) {
  // V(d) = V0 * (P_detach / P_local)
  const P_local = localWaterPressureAtDepth(headspacePa, b.depthMeters);
  const V = b.initialVolumeM3 * (b.detachPressurePa / Math.max(1e-2, P_local));
  b.volumeM3 = V;
  b.radiusMeters = Math.cbrt((3 * V) / (4 * Math.PI));
}

function terminalRiseSpeed(b: Bubble): number {
  // v = sqrt( 2 g V / (C_d A) ), A = pi r^2
  const A = Math.PI * b.radiusMeters * b.radiusMeters;
  const V = b.volumeM3;
  return Math.sqrt(Math.max(0, (2 * GRAVITY * V) / (DRAG_COEFF * A)));
}

// Map a number from one range to another (clamped)
function remapClamped(
  x: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
) {
  const t = Math.max(0, Math.min(1, (x - inMin) / (inMax - inMin)));
  return outMin + t * (outMax - outMin);
}

// Quick ASCII renderer: a vertical strip of water with bubbles 'o'
// top row = surface (depth 0), bottom = stem tip depth
function renderAsciiBong(
  bubbles: { depthMeters: number }[],
  submergedDepthMeters: number,
) {
  const rows = 20; // taller = more detail, slower output
  const cols = 24; // width of the strip
  const grid: string[][] = Array.from(
    { length: rows },
    () => Array(cols).fill(" "),
  );

  // Draw water column background char
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) grid[r][c] = "·"; // faint water dots
  }

  // Surface line at top
  for (let c = 0; c < cols; c++) grid[0][c] = "=";

  // Stem tip marker at bottom-left
  const bottomRow = rows - 1;
  grid[bottomRow][0] = "|";
  grid[bottomRow][1] = "|";

  // Place bubbles: map depth (0..submergedDepthMeters) to row (0..rows-1)
  for (const b of bubbles) {
    const r = Math.round(
      remapClamped(b.depthMeters, 0, submergedDepthMeters, 0, rows - 1),
    );
    const c = 3 + Math.floor(Math.random() * (cols - 4)); // jitter column so they don't stack
    grid[r][c] = "o";
  }

  // Compose lines
  const lines = grid.map((row) => row.join(""));
  return lines.join("\n");
}

// ===== Simulation Heartbeat =====
const simulationDuration = .5; // s
const timeStep = 1 / 500; // s (0.002)
let currentTime = 0;
let nextLogTime = 0;

console.log(
  "starting headspace pressure:",
  (getHeadspacePressure() / 1000).toFixed(1),
  "kPa",
);
console.log("starting air amount:", airMolesInHeadspace.toFixed(5), "moles");

while (currentTime < simulationDuration) {
  // 1) compute pressures at this instant
  const Ph = getHeadspacePressure(); // Pa
  const Ptip = getPressureAtStemTip(); // Pa

  // 2) bowl → water inflow (underwater reservoir at the tip)
  const inflowVolumePerSecond = getAirflowIntoWater(); // m^3/s
  underwaterAirVolumeAtTip += inflowVolumePerSecond * timeStep; // m^3

  // ===== Step 5A: convert reservoir volume into discrete bubbles (detachment) =====
  const spawnedCount = spawnBubblesFromTipReservoir();

  // ===== Step 5B: advance bubbles & collect popped volume this step =====
  const poppedVolumeThisStep = advanceBubblesAndCollectPopped(timeStep); // m^3

  // ===== Step 5C: popped bubbles add air back into headspace =====
  // Convert popped volume to moles at current headspace conditions (n = (P/RT) * V)
  if (poppedVolumeThisStep > 0) {
    const molesIn = (Ph / (GAS_CONSTANT * ROOM_TEMPERATURE)) *
      poppedVolumeThisStep;
    airMolesInHeadspace += molesIn;
  }

  // 3) headspace → mouth outflow (remove moles from headspace)
  const outflowVolumePerSecond = getAirflowOutOfHeadspace(
    Ph,
    currentTime,
    simulationDuration,
  ); // m^3/s

  const molesPerSecondOut = (Ph / (GAS_CONSTANT * ROOM_TEMPERATURE)) *
    outflowVolumePerSecond; // mol/s
  airMolesInHeadspace = Math.max(
    1e-12,
    airMolesInHeadspace - molesPerSecondOut * timeStep,
  );

  // 4) (logging) every ~0.1s
  if (currentTime >= nextLogTime) {
    const mouthTarget = getMouthTargetPressure(currentTime, simulationDuration);
    console.log(
      `t=${currentTime.toFixed(2)}s  ` +
        `Ph=${(Ph / 1000).toFixed(1)}kPa  ` +
        `Pmouth*=${(mouthTarget / 1000).toFixed(1)}kPa  ` +
        `Ptip=${(Ptip / 1000).toFixed(1)}kPa  ` +
        `ΔP_bowl→tip=${(AIR_PRESSURE_AT_BOWL - Ptip).toFixed(0)} Pa  ` +
        `Q_in=${(inflowVolumePerSecond * 1e6).toFixed(2)} cm^3/s  ` +
        `Q_out=${(outflowVolumePerSecond * 1e6).toFixed(2)} cm^3/s  ` +
        `tipReservoir=${(underwaterAirVolumeAtTip * 1e6).toFixed(2)} cm^3  ` +
        `spawned=${spawnedCount}  ` +
        `liveBubbles=${bubbles.length}  ` +
        `poppedVol=${(poppedVolumeThisStep * 1e6).toFixed(2)} cm^3`,
    );
    // ASCII snapshot (prints every ~0.1s with your existing logger cadence)
    console.log(renderAsciiBong(bubbles, submergedDepthMeters));
    nextLogTime += 0.1;
  }

  // 5) advance time
  currentTime += timeStep;
}

// final report
console.log("Simulation finished after", currentTime.toFixed(3), "seconds");
