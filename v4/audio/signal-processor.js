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
    return pink * 0.11;  // scale down
  }
}

class SignalProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.pressure   = 101325;
    this.scaleDelta = 1 / 2000;
    this.bursts     = [];
    this.pinkGen    = new PinkNoiseGenerator();
    this.port.onmessage = e => {
      if (e.data.type === 'pressure')     this.pressure = e.data.value;
      else if (e.data.type === 'bubble') {
        this.bursts.push({ remaining: 60, strength: Math.max(e.data.strength, 0.2) });
      }
    };
  }

  process(_, outputs) {
    const out = outputs[0][0];
    const delta = this.pressure - 101325;
    for (let i = 0; i < out.length; i++) {
      let sig = this.scaleDelta * delta;
      // pink noise turbulence
      sig += this.pinkGen.next() * (Math.abs(delta) / 500) * 0.1;
      // bubble impulses
      this.bursts.forEach(b => {
        if (b.remaining > 0) {
          const t = 60 - b.remaining;
          sig += b.strength * Math.exp(-0.1 * t) * Math.sin(t * 0.3);
          b.remaining--;
        }
      });
      this.bursts = this.bursts.filter(b => b.remaining > 0);
      out[i] = sig;
    }
    return true;
  }
}

registerProcessor('signal-processor', SignalProcessor);
