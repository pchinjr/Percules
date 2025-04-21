export class RealisticBongAudio {
    constructor() {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      this.master.connect(this.ctx.destination);
  
      this.baseRadius = 0.01;
      this.baseQ = 10;
      this.baseFreq = 300;
    }
  
    setBubbleSize(size) {
      this.baseRadius = size;
    }
  
    setFilterQ(q) {
      this.baseQ = q;
    }
  
    setFilterFreq(freq) {
      this.baseFreq = freq;
    }
  
    startInhale() {
      // Optional: ambient rumble/gurgle based on settings
    }
  
    stopInhale() {
      // Optional: fade ambient noise
    }
  
    playBubbles(radii = []) {
      radii.forEach(radius => {
        const effectiveRadius = this.baseRadius;
        const f = (1 / (2 * Math.PI * effectiveRadius)) * Math.sqrt((3 * 1.4 * 101325) / 1000);
  
        const src = this.ctx.createBufferSource();
        const buf = this.ctx.createBuffer(1, 512, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
  
        for (let i = 0; i < data.length; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / 40);
        }
  
        const band = this.ctx.createBiquadFilter();
        band.type = 'bandpass';
        band.frequency.value = this.baseFreq || f;
        band.Q.value = this.baseQ;
  
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
  
        src.buffer = buf;
        src.connect(band).connect(gain).connect(this.master);
        src.start();
        src.stop(this.ctx.currentTime + 0.25);
      });
    }
  }