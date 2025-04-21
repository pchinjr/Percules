export class FluidBongPhysics {
    constructor() {
      this.downstemDepth = 0.12; // meters
      this.bubbleThreshold = 0.0003; // air mass threshold for a bubble
      this.airAccumulator = 0;
      this.inhaling = false;
      this.suction = 0.8; // 0-1 scale
    }
  
    startInhaling() {
      this.inhaling = true;
    }
  
    stopInhaling() {
      this.inhaling = false;
    }
  
    step(dt = 0.05) {
      const rho = 1000;
      const g = 9.8;
      const P_water = this.downstemDepth * rho * g; // pressure in Pascals
      const P_suction = this.inhaling ? this.suction * 12000 : 0;
  
      let bubbleSizes = [];
  
      if (P_suction > P_water) {
        const airFlow = (P_suction - P_water) * dt * 0.00002;
        this.airAccumulator += airFlow;
  
        while (this.airAccumulator > this.bubbleThreshold) {
          const radius = 0.007 + Math.random() * 0.004;
          bubbleSizes.push(radius);
          this.airAccumulator -= this.bubbleThreshold;
        }
      } else {
        this.airAccumulator = 0;
      }
  
      return {
        bubbleCount: bubbleSizes.length,
        bubbleSizes
      };
    }
  }
  