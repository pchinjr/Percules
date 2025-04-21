import { BongPhysicsEngine } from './bongPhysicsEngine.js';
import { BongSoundEngine } from './bongSoundEngine.js';

const canvas = document.getElementById('bongCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const physics = new BongPhysicsEngine();
const audio = new BongSoundEngine();

let isHitting = false;
let currentBubblesArray = [];
let currentSmokeValue = 0;

// --- Presets
const presets = {
  milky: { name: "Milky Stack", bubbleSize: 0.011, filterFreq: 320, filterQ: 5, suction: 0.8 },
  deep:  { name: "Deep Chug", bubbleSize: 0.014, filterFreq: 220, filterQ: 4, suction: 0.6 },
  bubbly:{ name: "Bubbly Burst", bubbleSize: 0.008, filterFreq: 440, filterQ: 7, suction: 1.0 },
  harsh: { name: "Harsh Ripper", bubbleSize: 0.01,  filterFreq: 650, filterQ: 14, suction: 1.0 }
};

const presetSelect = document.getElementById('presetSelect');
const suctionSlider = document.getElementById('suctionSlider');
const bubbleSizeSlider = document.getElementById('bubbleSizeSlider');
const filterQSlider = document.getElementById('filterQSlider');
const filterFreqSlider = document.getElementById('filterFreqSlider');

// --- Preset Logic
function applyPreset(preset) {
  // Update sliders
  suctionSlider.value = preset.suction;
  bubbleSizeSlider.value = preset.bubbleSize;
  filterFreqSlider.value = preset.filterFreq;
  filterQSlider.value = preset.filterQ;

  // Apply to engines
  audio.setBubbleSize(preset.bubbleSize);
  audio.setFilterFreq(preset.filterFreq);
  audio.setFilterQ(preset.filterQ);
  if (isHitting) {
    physics.setSuction(preset.suction);
    audio.startSuction();
  }
}

// --- Sliders Live Update
suctionSlider.addEventListener('input', () => {
  if (isHitting) {
    physics.setSuction(parseFloat(suctionSlider.value));
  }
});

bubbleSizeSlider.addEventListener('input', () => {
  audio.setBubbleSize(parseFloat(bubbleSizeSlider.value));
});

filterQSlider.addEventListener('input', () => {
  audio.setFilterQ(parseFloat(filterQSlider.value));
});

filterFreqSlider.addEventListener('input', () => {
  audio.setFilterFreq(parseFloat(filterFreqSlider.value));
});

presetSelect.addEventListener('change', () => {
  const preset = presets[presetSelect.value];
  if (preset) {
    applyPreset(preset);
  }
});

// --- Visual Loop
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height - 120); // leave bottom UI area

  drawBongPresetVisual(presetSelect.value, {
    bubbles: currentBubblesArray,
    smokeOpacity: currentSmokeValue,
  });

  // Hit Zone Button
  ctx.fillStyle = isHitting ? "#3cf" : "#555";
  ctx.fillRect(canvas.width / 2 - 50, canvas.height - 100, 100, 60);
  ctx.fillStyle = "#fff";
  ctx.font = "16px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`HOLD TO HIT`, canvas.width / 2, canvas.height - 65);
  ctx.fillText(`Suction: ${physics.suction.toFixed(2)}`, canvas.width / 2, canvas.height - 25);
  ctx.fillText(`Bubble Size: ${audio.baseRadius.toFixed(4)}`, canvas.width / 2, canvas.height - 10);

  requestAnimationFrame(draw);
}
draw();

// --- Input Controls
canvas.addEventListener('mousedown', () => {
  isHitting = true;
  physics.setSuction(parseFloat(suctionSlider.value));
  audio.startSuction();
  currentSmokeValue = 0.5;
});

canvas.addEventListener('mouseup', () => {
  isHitting = false;
  physics.setSuction(0);
  audio.stopSuction();
  currentSmokeValue = 0;
});

canvas.addEventListener('mouseleave', () => {
  isHitting = false;
  physics.setSuction(0);
  audio.stopSuction();
  currentSmokeValue = 0;
});

// --- Bubble Loop
setInterval(() => {
  const count = physics.step();
  if (count > 0) {
    audio.triggerBurst(count);
    for (let i = 0; i < count; i++) {
      currentBubblesArray.push({
        x: (Math.random() - 0.5) * 40,
        y: -20,
        r: 3 + Math.random() * 3
      });
    }
  }

  // Animate bubbles upward
  currentBubblesArray.forEach(b => (b.y -= 2));
  currentBubblesArray = currentBubblesArray.filter(b => b.y > -160);
}, 50);

// Call this in main.js after everything else is set up
function drawBongPresetVisual(presetName, state = {}) {
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
  
    // Clear upper area for drawing
    ctx.clearRect(0, 0, width, height);
  
    ctx.save();
    ctx.translate(width / 2, height - 500); // Centered bottom
  
    ctx.strokeStyle = "#0ff";
    ctx.lineWidth = 2;
    ctx.fillStyle = "rgba(80, 200, 255, 0.2)";
  
    let waterTop = -20;
    let bodyTop = -160;
    let bodyBottom = 0;
    let tubeWidth = 60;
  
    switch (presetName) {
      case "milky":
        // Tube
        ctx.beginPath();
        ctx.rect(-tubeWidth / 2, bodyTop, tubeWidth, bodyBottom - bodyTop);
        ctx.stroke();
        ctx.fill();
        // Perc discs
        for (let y = bodyTop + 20; y < waterTop; y += 30) {
          ctx.beginPath();
          ctx.moveTo(-tubeWidth / 2, y);
          ctx.lineTo(tubeWidth / 2, y);
          ctx.stroke();
        }
        break;
  
      case "deep":
        // Beaker base
        ctx.beginPath();
        ctx.moveTo(-50, 0);
        ctx.lineTo(-70, -60);
        ctx.lineTo(-30, -90);
        ctx.lineTo(-30, -160);
        ctx.lineTo(30, -160);
        ctx.lineTo(30, -90);
        ctx.lineTo(70, -60);
        ctx.lineTo(50, 0);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
        break;
  
      case "bubbly":
        // Bubble base
        ctx.beginPath();
        ctx.ellipse(0, -40, 50, 60, 0, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fill();
        // Neck
        ctx.beginPath();
        ctx.rect(-20, -140, 40, 100);
        ctx.stroke();
        ctx.fill();
        break;
  
      case "harsh":
        // Straight tube
        ctx.beginPath();
        ctx.rect(-20, -160, 40, 160);
        ctx.stroke();
        ctx.fill();
        break;
  
      default:
        break;
    }
  
    // Waterline
    ctx.beginPath();
    ctx.fillStyle = "rgba(0, 180, 255, 0.3)";
    ctx.fillRect(-tubeWidth, waterTop, tubeWidth * 2, 10);
  
    // Bubbles
    if (state.bubbles) {
      ctx.fillStyle = "rgba(200, 255, 255, 0.7)";
      for (let bubble of state.bubbles) {
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  
    // Smoke
    if (state.smokeOpacity) {
      const grd = ctx.createLinearGradient(0, bodyTop, 0, waterTop);
      grd.addColorStop(0, `rgba(255,255,255,${state.smokeOpacity})`);
      grd.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grd;
      ctx.fillRect(-tubeWidth / 2, bodyTop, tubeWidth, waterTop - bodyTop);
    }
  
    ctx.restore();
  }
  
  
  // Call once on load
  window.addEventListener("DOMContentLoaded", () => {
    drawBongPresetVisual(presetSelect.value);
  });
  