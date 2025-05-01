// audio/signal-processor.js

class PinkNoiseGenerator {
  constructor() {
    this.b0 = this.b1 = this.b2 = this.b3 = this.b4 = this.b5 = this.b6 = 0;
  }
  next() {
    const white = Math.random() * 2 - 1;
    this.b0 = 0.99886 * this.b0 + white * 0.0555179;
    this.b1 = 0.99332 * this.b1 + white * 0.0750759;
    this.b2 = 0.96900 * this.b2 + white * 0.1538520;
    this.b3 = 0.86650 * this.b3 + white * 0.3104856;
    this.b4 = 0.55000 * this.b4 + white * 0.5329522;
    this.b5 = -0.7616 * this.b5 - white * 0.0168980;
    const pink = this.b0 + this.b1 + this.b2 + this.b3 + this.b4 + this.b5 + this.b6 + white * 0.5362;
    this.b6 = white * 0.115926;
    return pink * 0.11;
  }
}

class SignalProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.pressure    = 101325;   // last chamber pressure (Pa)
    this.prevDelta   = 0;        // for smoothing pressure delta
    this.scaleDelta  = 1 / 2000; // scale factor for pressure→amplitude
    this.noiseGen    = new PinkNoiseGenerator();
    this.bursts      = [];       // pending bubble impulses

    // One-pole high-pass filter state to kill DC
    this.hpPrevOut   = 0;
    this.hpAlpha     = 0.995;    // cutoff ~ a few Hz

    this.port.onmessage = event => {
      const d = event.data;
      if (d.type === 'pressure') {
        this.pressure = d.value;
      } else if (d.type === 'bubble') {
        // d.strength is energy-based amplitude, d.freq is resonance in Hz
        const deltaPhase = 2 * Math.PI * d.freq / sampleRate;
        this.bursts.push({
          remaining: 60,
          strength:  d.strength,
          phase:     0,
          deltaPhase
        });
      }
    };
  }

  process(inputs, outputs) {
    const out = outputs[0][0];
    const AMB = 101325;

    for (let i = 0; i < out.length; i++) {
      // 1) Compute pressure delta above ambient
      let delta = this.pressure - AMB;
      if (delta < 0) delta = 0;

      // 2) Smooth (15% new, 85% old)
      this.prevDelta = 0.85 * this.prevDelta + 0.15 * delta;

      // 3) Base signal from pressure
      let sig = this.scaleDelta * this.prevDelta;

      // 4) Pink-noise turbulence scaled by pressure
      sig += this.noiseGen.next() * (this.prevDelta / 500);

      // 5) Bubble impulses with per-burst pitch & envelope
      for (const b of this.bursts) {
        if (b.remaining > 0) {
          const t = 60 - b.remaining;
          const env = Math.exp(-0.1 * t);
          sig += b.strength * env * Math.sin(b.phase);
          b.phase += b.deltaPhase;
          b.remaining--;
        }
      }
      // remove finished bursts
      this.bursts = this.bursts.filter(b => b.remaining > 0);

      // 6) One-pole high-pass to remove DC/low-frequency drift
      const hpOut = sig - this.hpPrevOut + this.hpAlpha * this.hpPrevOut;
      this.hpPrevOut = hpOut;

      out[i] = hpOut;
    }

    return true;
  }
}

registerProcessor('signal-processor', SignalProcessor);
