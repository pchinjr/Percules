// sim.ts
export type Params = {
  headspaceVolume: number; // m^3
  submergedDepth: number; // m
  stemConductance: number; // m^3/(s*sqrt(Pa))
  mouthConductance: number; // m^3/(s*Pa)
  drawDepthPa: number; // Pa
  rampInS: number;
};

export type Bubble = { depth: number; r: number; x: number }; // minimal for viz

export type BubblePopEvent = {
  simTime: number;
  outletIndex: number;
  radius_m: number;
  depth_m: number;
  x_m: number;
  volume_m3: number;
  headspacePa: number;
};

// Physics runtime representation; superset of the public Bubble shape.
type InternalBubble = Bubble & {
  vol: number;
  initVol: number;
  detachP: number;
  vx: number;
  outletIndex: number;
};

// Single-instance container for the entire simulation.
type SimulationState = {
  t: number;
  params: Params;
  nHead: number;
  outletReservoirs: number[];
  bubbles: InternalBubble[];
  popEvents: BubblePopEvent[];
};

// Data we stream to the UI on each tick.
export type Snapshot = {
  t: number;
  Ph: number; // Pa
  Pbowl: number; // Pa
  Pmouth: number; // Pa
  Pambient: number; // Pa
  Ptip: number; // Pa
  dP_bowl_tip: number; // Pa
  Qin: number; // m^3/s
  Qout: number; // m^3/s
  tipReservoir: number; // m^3
  submergedDepth: number;
  percDepth: number;
  headspaceHeight: number;
  columnHeight: number;
  tankWidth: number;
  outlets: number[];
  bubbles: Bubble[]; // trimmed for bandwidth
  pops: BubblePopEvent[];
};

const GAS_CONSTANT = 8.314462618;
const ROOM_TEMPERATURE = 293;
const AIR_PRESSURE_AT_SEA_LEVEL = 101_325;
const WATER_DENSITY = 998;
const GRAVITY = 9.80665;
const DRAG_COEFF = 0.8;
// --- add near top (geometry & layout) ---
const TANK_WIDTH_M = 0.12; // 12 cm visual tank width
const STEM_X_M = 0.02; // downstem enters ~2 cm from left wall
const TANK_DEPTH_M = 0.12; // treat cross-section as square for viz
const TANK_AREA_M2 = TANK_WIDTH_M * TANK_DEPTH_M;

// detachment
const detachRadius = 1.2e-3; // m
const DETACH_MIN = 0.90, DETACH_MAX = 1.10;

function randBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

// --- state (replace single tipReservoir with array) ---
const NUM_OUTLETS = 4;
const defaultParams: Params = {
  headspaceVolume: 0.0005,
  submergedDepth: 0.06,
  stemConductance: 1.2e-6,
  mouthConductance: 6e-9,
  drawDepthPa: 7000, // start strong so you see bubbles
  rampInS: 0.4,
};

const state: SimulationState = {
  t: 0,
  params: { ...defaultParams },
  nHead: 0, // moles
  outletReservoirs: new Array(NUM_OUTLETS).fill(0), // m^3 per outlet
  bubbles: [],
  popEvents: [],
};

state.nHead = (AIR_PRESSURE_AT_SEA_LEVEL * state.params.headspaceVolume) /
  (GAS_CONSTANT * ROOM_TEMPERATURE);

function headspacePressure() {
  return (state.nHead * GAS_CONSTANT * ROOM_TEMPERATURE) /
    state.params.headspaceVolume;
}
// Ramp target mouth pressure from ambient down to the requested draw depth.
function mouthTargetPressure() {
  const end = AIR_PRESSURE_AT_SEA_LEVEL - state.params.drawDepthPa;
  const a = Math.max(0, Math.min(1, state.t / state.params.rampInS));
  return AIR_PRESSURE_AT_SEA_LEVEL + a * (end - AIR_PRESSURE_AT_SEA_LEVEL);
}
// Linear conductance model for the mouthpiece outflow.
function airflowOutOfHeadspace() {
  const dP = headspacePressure() - mouthTargetPressure();
  return dP > 0 ? state.params.mouthConductance * dP : 0;
}
// Nominal volume a bubble needs before detaching from an outlet.
function meanDetachVolume() {
  return (4 / 3) * Math.PI * detachRadius ** 3;
}

// Boyle's law: bubbles expand as hydrostatic pressure falls with depth.
function updateBubbleSize(b: InternalBubble) {
  const P_local = headspacePressure() +
    WATER_DENSITY * GRAVITY * Math.max(0, b.depth);
  const V = b.initVol * (b.detachP / Math.max(1e-2, P_local));
  b.vol = V;
  b.r = Math.cbrt((3 * V) / (4 * Math.PI));
}
// Crude drag model for terminal rise speed (good enough for visualization).
function terminalRiseSpeed(b: InternalBubble) {
  const A = Math.PI * b.r * b.r;
  return Math.sqrt(Math.max(0, (2 * GRAVITY * b.vol) / (DRAG_COEFF * A)));
}

// Perc head depth is a bit above the downstem tip (closer to the tip than surface)
function percHeadDepth(submergedDepth: number) {
  return Math.min(submergedDepth, Math.max(0.01, submergedDepth * 0.85));
}

// Place 4 outlets across a small span centered ~4 cm right of the stem
function percOutletXs(): number[] {
  const center = STEM_X_M + 0.04; // centerline of perc
  const span = 0.028; // ~2.8 cm spread
  const halfSpan = span / 2;
  const step = span / (NUM_OUTLETS - 1);
  return Array.from(
    { length: NUM_OUTLETS },
    (_, i) => center - halfSpan + step * i,
  );
}

// Pressure at perc outlets (use perc head depth, not tip)
function pressureAtPercOutlets() {
  return headspacePressure() +
    WATER_DENSITY * GRAVITY * percHeadDepth(state.params.submergedDepth);
}

// Airflow down the stem into the perc chamber (then split to outlets)
function airflowIntoPerc(): number {
  const dP = AIR_PRESSURE_AT_SEA_LEVEL - pressureAtPercOutlets();
  return dP > 0 ? state.params.stemConductance * Math.sqrt(dP) : 0; // m^3/s (total)
}

// Lateral plume “pull” toward perc centerline + tiny noise
function lateralFlow(b: InternalBubble) {
  const center = STEM_X_M + 0.04;
  const k = 1.5;
  const noise = randBetween(-0.02, 0.02);
  b.vx += (-k * (b.x - center) + noise) * 0.02;
  b.vx = Math.max(-0.06, Math.min(0.06, b.vx));
}
function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

// --- spawn from each outlet’s reservoir ---
// Pull volume from each outlet reservoir and convert it into individual bubbles.
function spawnFromPercOutlets() {
  const meanV = meanDetachVolume();
  const outs = percOutletXs();
  let spawned = 0;

  for (let i = 0; i < NUM_OUTLETS; i++) {
    while (state.outletReservoirs[i] >= meanV * DETACH_MIN) {
      const v = meanV * randBetween(DETACH_MIN, DETACH_MAX);
      if (state.outletReservoirs[i] < v) break;
      state.outletReservoirs[i] -= v;

      const detachP = pressureAtPercOutlets();
      const r0 = Math.cbrt((3 * v) / (4 * Math.PI));
      const yDepth = percHeadDepth(state.params.submergedDepth);
      const x0 = outs[i] + randBetween(-0.0015, 0.0015); // slight per-hole jitter

      state.bubbles.push({
        depth: yDepth,
        r: r0,
        vol: v,
        initVol: v,
        detachP,
        x: x0,
        vx: randBetween(-0.01, 0.01),
        outletIndex: i,
      });
      spawned++;
      if (state.bubbles.length > 4000) {
        state.bubbles.splice(0, state.bubbles.length - 4000);
      }
    }
  }
  return spawned;
}

export function setParams(patch: Partial<Params>) {
  Object.assign(state.params, patch);
}
export function reset() {
  // Recreate initial conditions while preserving current params.
  state.t = 0;
  state.outletReservoirs.fill(0);
  state.bubbles.length = 0;
  state.nHead = (AIR_PRESSURE_AT_SEA_LEVEL * state.params.headspaceVolume) /
    (GAS_CONSTANT * ROOM_TEMPERATURE);
}
export function tick(dt: number) {
  const headspaceBefore = headspacePressure();
  // 1) inflow to perc chamber, split among outlets equally (simple model)
  const Qin_total = airflowIntoPerc();
  const Qin_each = Qin_total / NUM_OUTLETS;
  for (let i = 0; i < NUM_OUTLETS; i++) {
    state.outletReservoirs[i] += Qin_each * dt;
  }

  // 2) detachment from each outlet
  spawnFromPercOutlets();

  // 3) rise & pop
  let poppedVol = 0;
  const eventsThisTick: BubblePopEvent[] = [];
  for (const b of state.bubbles) {
    updateBubbleSize(b);
    const vy = terminalRiseSpeed(b);
    b.depth = Math.max(0, b.depth - vy * dt);
    lateralFlow(b);
    b.x += b.vx * dt; // advance x
    const x01 = clamp01(b.x / TANK_WIDTH_M);
    b.x = x01 * TANK_WIDTH_M; // clamp to tank walls
  }
  const keep: InternalBubble[] = [];
  for (const b of state.bubbles) {
    if (b.depth <= 0) {
      poppedVol += b.vol;
      eventsThisTick.push({
        simTime: state.t + dt,
        outletIndex: b.outletIndex,
        radius_m: b.r,
        depth_m: b.depth,
        x_m: b.x,
        volume_m3: b.vol,
        headspacePa: headspaceBefore,
      });
    } else {
      keep.push(b);
    }
  }
  state.bubbles = keep;
  if (eventsThisTick.length > 0) {
    state.popEvents.push(...eventsThisTick);
    if (state.popEvents.length > 1024) {
      state.popEvents.splice(0, state.popEvents.length - 1024);
    }
  }

  // 4) mouth outflow & popped return
  const Ph = headspacePressure();
  const Qout = airflowOutOfHeadspace();
  const nOut = (Ph / (GAS_CONSTANT * ROOM_TEMPERATURE)) * Qout;
  state.nHead = Math.max(1e-12, state.nHead - nOut * dt);

  if (poppedVol > 0) {
    const nIn = (Ph / (GAS_CONSTANT * ROOM_TEMPERATURE)) * poppedVol;
    state.nHead += nIn;
  }

  state.t += dt;
}

// Copy the current state into a light-weight structure for the UI.
export function getSnapshot(): Snapshot {
  const Ph = headspacePressure();
  const Pperc = pressureAtPercOutlets();
  const Pmouth = mouthTargetPressure();
  const headspaceHeight = state.params.headspaceVolume / TANK_AREA_M2;
  const columnHeight = headspaceHeight + state.params.submergedDepth;
  const outs = percOutletXs();
  const pops = state.popEvents;
  state.popEvents = [];
  return {
    t: state.t,
    Ph,
    Pbowl: AIR_PRESSURE_AT_SEA_LEVEL,
    Pmouth,
    Pambient: AIR_PRESSURE_AT_SEA_LEVEL,
    Ptip: Pperc, // show perc outlet pressure in HUD
    dP_bowl_tip: AIR_PRESSURE_AT_SEA_LEVEL - Pperc,
    Qin: airflowIntoPerc(),
    Qout: airflowOutOfHeadspace(),
    tipReservoir: state.outletReservoirs.reduce((a, b) => a + b, 0),
    submergedDepth: state.params.submergedDepth,
    percDepth: percHeadDepth(state.params.submergedDepth),
    headspaceHeight,
    columnHeight,
    tankWidth: TANK_WIDTH_M,
    outlets: outs, // for drawing the perc holes
    bubbles: state.bubbles.map((b) => ({ depth: b.depth, r: b.r, x: b.x })),
    pops,
  };
}
