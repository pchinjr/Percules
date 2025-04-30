function runSignalTests() {
    console.log("Running Signal Tests...");
  
    // Mock AudioContext
    const mockCtx = {
      audioWorklet: {
        addModule: async (url) => {
          console.log(`Mock load: ${url}`);
        }
      },
      destination: "speakers"
    };
  
    // Override global AudioContext with our mock
    window.AudioContext = function () {
      return mockCtx;
    };
  
    // Mock vessel
    let fakePressure = 123456;
    const fakeVessel = {
      get pressure() {
        return fakePressure;
      }
    };
  
    let messages = [];
  
    // Mock node
    const mockNode = {
      port: {
        postMessage: (msg) => messages.push(msg)
      },
      connect: () => {}
    };
  
    // Patch AudioWorkletNode constructor
    window.AudioWorkletNode = function () {
      return mockNode;
    };
  
    import('../audio/signal.js').then(({ initAudio }) => {
      initAudio(fakeVessel, () => [{ energy: 999 }]);
  
      setTimeout(() => {
        const pressureMsg = messages.find(m => m.type === 'pressure');
        const bubbleMsg = messages.find(m => m.type === 'bubble');
  
        console.assert(pressureMsg, "Should send pressure message");
        console.assert(bubbleMsg, "Should send bubble message");
        console.assert(bubbleMsg.strength > 0, "Bubble strength should be positive");
  
        console.log("✅ Signal Tests Complete.\n");
      }, 50);
    });
  }
  
  runSignalTests();
  