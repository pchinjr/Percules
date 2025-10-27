export class BongSoundEngine {
    constructor() {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      this.master.connect(this.ctx.destination);
  
      // Preset values
      this.baseRadius = 0.01;
      this.currentQ = 6;
      this.currentFreq = 300;
    }
  
    setBubbleSize(size) {
      this.baseRadius = size;
    }
  
    setFilterQ(q) {
      this.currentQ = q;
    }
  
    setFilterFreq(freq) {
      this.currentFreq = freq;
    }
  
    startSuction() {
      this.ctx.resume();
    }
  
    stopSuction() {}
  
    triggerBurst(bubbleCount = 1) {
      for (let i = 0; i < bubbleCount; i++) {
        const radius = this.baseRadius + (Math.random() - 0.5) * 0.004;
        const delay = i * 40;
        setTimeout(() => this._playBubble(radius), delay);
      }
    }
  
    _playBubble(radiusMeters) {
      const f = (1 / (2 * Math.PI * radiusMeters)) * Math.sqrt((3 * 1.4 * 101325) / 1000);
      const baseF = this.currentFreq > 0 ? this.currentFreq : f;
  
      const buffer = this.ctx.createBuffer(1, 2048, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < buffer.length; i++) {
        data[i] = (Math.random() * 2 - 1);
      }
  
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
  
      const band = this.ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = baseF;
      band.Q.value = this.currentQ;
  
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1800;
  
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(1.0, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  
      src.connect(band).connect(lp).connect(gain).connect(this.master);
      src.start(now);
      src.stop(now + 0.2);
    }
  }
  