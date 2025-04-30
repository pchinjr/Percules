// sim/engine.js

import { createVessel }      from './vessel.js';
import { createConnection }  from './connection.js';
import { shouldFormBubble, createBubbleEvent } from './bubble.js';
import { MOL_PER_LITER, ATM_PRESSURE }        from './constants.js';

export function createEngine({
  waterDepthCm     = 5,       // cm of water column
  leakRate         = 0.002,   // L/tick: percolator hum
  ventRate         = 0.001,   // L/tick: chamber→ambient bleed
  bubbleVol        = 0.0001,  // L per bubble (~100 µL)
  suctionFlowRate  = 0.016    // L/tick: inhale (~1 L/s)
} = {}) {
  // mutable parameters
  let currentWaterDepthCm = waterDepthCm;
  let currentLeak         = leakRate;
  let currentVent         = ventRate;
  let currentBubbleV      = bubbleVol;
  let currentSuction      = suctionFlowRate;

  // simulation state
  const state = {
    timestamp:  0,
    bubbleLog:  [],

    downstem: createVessel({ volumeLiters: 0.1 }),  // 100 mL
    chamber:  createVessel({ volumeLiters: 0.6 }),  // 600 mL
    ambient:  createVessel({                         // “outside” reservoir
      volumeLiters:   1e6,
      moleculeCount:  MOL_PER_LITER * 1e6,
      kineticEnergy:  ATM_PRESSURE * (1e6 / 1000)
    })
  };

  // percolator and bleed connections
  const leakConn = createConnection({
    from:     state.downstem,
    to:       state.chamber,
    leakRate: currentLeak
  });
  const ventConn = createConnection({
    from:     state.chamber,
    to:       state.ambient,
    leakRate: currentVent
  });

  let lastBubbleTime  = 0;
  const bubbleCooldown = 50; // ticks

  function simulateStep(dt = 1) {
    state.timestamp += dt;

    // A) Forced “inhale”: move a fixed volume from ambient → downstem
    {
      const molPump    = currentSuction * MOL_PER_LITER * dt;
      const energyPump = molPump * state.ambient.temperature;
      state.ambient.removeMolecules(molPump, energyPump);
      state.downstem.addMolecules(molPump, energyPump);
    }

    // B) Percolator leak: downstem → chamber
    leakConn.simulateFlow(dt);

    // C) Vent bleed: chamber → ambient
    ventConn.simulateFlow(dt);

    // D) Bubble event when downstem pressure overcomes water head
    const pDown = state.downstem.pressure;
    if (
      state.timestamp - lastBubbleTime > bubbleCooldown &&
      shouldFormBubble({ pressure: pDown, waterDepthCm: currentWaterDepthCm })
    ) {
      const molFlow    = currentBubbleV * MOL_PER_LITER;
      const energyFlow = molFlow * state.downstem.temperature;

      state.downstem.removeMolecules(molFlow, energyFlow);
      state.chamber.addMolecules(molFlow, energyFlow);

      state.bubbleLog.push(createBubbleEvent({
        timestamp: state.timestamp,
        pressure:  pDown,
        volume:    currentBubbleV,
        energy:    energyFlow
      }));

      lastBubbleTime = state.timestamp;
    }
  }

  function getState() {
    return {
      downstem:  state.downstem,
      chamber:   state.chamber,
      ambient:   state.ambient,
      bubbleLog: state.bubbleLog,
      debug: {
        downstem: state.downstem.debug(),
        chamber:  state.chamber.debug(),
        ambient:  state.ambient.debug(),
        bubbles:  state.bubbleLog.length
      }
    };
  }

  function setParams({
    waterDepthCm:    wd,
    leakRate:        lr,
    ventRate:        vr,
    bubbleVol:       bv,
    suctionFlowRate: sf
  } = {}) {
    if (wd != null) currentWaterDepthCm = wd;
    if (lr != null) { currentLeak    = lr; leakConn.leakRate = lr; }
    if (vr != null) { currentVent    = vr; ventConn.leakRate = vr; }
    if (bv != null)  currentBubbleV  = bv;
    if (sf != null) currentSuction    = sf;
  }

  return { simulateStep, getState, setParams };
}