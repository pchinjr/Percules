export class BongPhysicsEngine {
  constructor() {
    this.cylinderHeight = 0.3;    // meters
    this.waterLevel = 0.15;       // meters
    this.downstemDepth = 0.12;    // meters
    this.airFlow = 0;
    this.suction = 0;

    this.bubbleThreshold = 0.02;  // pressure threshold for bubbling
    this.bubbleAccumulator = 0;
  }

  setSuction(value) {
    this.suction = Math.max(0, Math.min(1, value));
  }

  step() {
    // water resistance: deeper downstem = higher pressure required
    const requiredPressure = this.downstemDepth * 9800; // ~water weight
    const currentPressure = this.suction * 10000;

    let bubbleCount = 0;

    if (currentPressure > requiredPressure) {
      // accumulate "air mass" being pulled in
      const flow = (currentPressure - requiredPressure) * 0.00001;
      this.bubbleAccumulator += flow;

      if (this.bubbleAccumulator > 0.02) {
        bubbleCount = Math.floor(this.bubbleAccumulator / 0.02);
        this.bubbleAccumulator -= bubbleCount * 0.02;
      }
    } else {
      this.bubbleAccumulator = 0;
    }

    return bubbleCount;
  }
}
