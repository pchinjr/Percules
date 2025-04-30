// sim/engine.js

import { createVessel }      from './vessel.js';
import { createConnection }  from './connection.js';
import { createBubbleEvent } from './bubble.js';
import { MOL_PER_LITER, ATM_PRESSURE } from './constants.js';

export function createEngine({
  waterDepthCm    = 5,
  leakRate        = 0.0001,
  ventRate        = 0.001,
  bubbleVol       = 0.005,
  suctionStrength = 2000
} = {}) {
  let currentLeak    = leakRate;
  let currentVent    = ventRate;
  let currentBubbleV = bubbleVol;
  let currentSuction = suctionStrength;

  const state = {
    timestamp: 0,
    bubbleLog: [],

    downstem: createVessel({ volumeLiters: 0.1 }),
    chamber:  createVessel({ volumeLiters: 0.6 }),
    ambient:  createVessel({
      volumeLiters: 1e6,
      moleculeCount: MOL_PER_LITER * 1e6,
      kineticEnergy: ATM_PRESSURE * (1e6 / 1000)
    }),

    connections: []
  };

  // setup connections
  const leakConn = createConnection({
    from: state.downstem,
    to:   state.chamber,
    leakRate: currentLeak
  });
  const ventConn = createConnection({
    from: state.chamber,
    to:   state.ambient,
    leakRate: currentVent
  });
  state.connections.push(leakConn, ventConn);

  let lastBubbleTime = 0;
  const bubbleCooldown = 50;

  function simulateStep(dt = 1) {
    state.timestamp += dt;

    // suction on chamber
    state.chamber.kineticEnergy = Math.max(
      0,
      state.chamber.kineticEnergy - currentSuction * dt
    );

    // continuous flows
    leakConn.simulateFlow(dt);
    ventConn.simulateFlow(dt);

    // discrete bubble event
    if (state.timestamp - lastBubbleTime > bubbleCooldown) {
      const vol        = currentBubbleV;
      const molFlow    = vol * MOL_PER_LITER;
      const energyFlow = molFlow * state.chamber.temperature;

      state.downstem.removeMolecules(molFlow, energyFlow);
      state.chamber.addMolecules(molFlow, energyFlow);

      state.bubbleLog.push(createBubbleEvent({
        timestamp: state.timestamp,
        pressure:  state.chamber.pressure,
        volume:    vol,
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

  function setParams({ leakRate, ventRate, bubbleVol, suctionStrength }) {
    if (leakRate    != null) { currentLeak = leakRate; leakConn.leakRate = leakRate; }
    if (ventRate    != null) { currentVent = ventRate; ventConn.leakRate = ventRate; }
    if (bubbleVol   != null) { currentBubbleV = bubbleVol; }
    if (suctionStrength != null) currentSuction = suctionStrength;
  }

  return { simulateStep, getState, setParams };
}
