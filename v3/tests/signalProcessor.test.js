function SignalTestProcessor() {
    this.pressure = 101325;
    this.scale = 1 / 5000;
    this.bursts = [];
  
    this.process = function(bufferSize = 128) {
      const output = new Float32Array(bufferSize);
      const delta = this.pressure - 101325;
  
      for (let i = 0; i < bufferSize; i++) {
        let signal = this.scale * delta;
  
        for (let b of this.bursts) {
          if (b.remaining > 0) {
            signal += Math.sin((50 - b.remaining) * 0.2) * b.strength * 0.2;
            b.remaining--;
          }
        }
  
        this.bursts = this.bursts.filter(b => b.remaining > 0);
        output[i] = signal;
      }
  
      return output;
    };
  }
  
  // Unit test for SignalTestProcessor
  function runShadowProcessorTest() {
    console.log("Running Signal Processor Math Test...");
  
    const processor = new SignalTestProcessor();
    processor.pressure = 105325; // 4kPa above ambient
    processor.bursts.push({ remaining: 50, strength: 1.0 });
  
    const output = processor.process();
  
    const hasNonZero = output.some(sample => Math.abs(sample) > 0.0001);
    console.assert(hasNonZero, "Output should contain non-zero values from pressure and bubble burst");
  
    console.log("✅ Signal Processor Math Test Complete.\\n");
  }
  
  runShadowProcessorTest();
  