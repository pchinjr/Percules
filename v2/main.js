import { FluidBongPhysics } from './fluidBongPhysics.js';
import { RealisticBongAudio } from './realisticBongAudio.js';
import { drawBongVisual } from './drawBongVisual.js';

const canvas = document.getElementById('bongCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const physics = new FluidBongPhysics();
const audio = new RealisticBongAudio();

let isHitting = false;
let visualBubbles = [];
let visualSmoke = 0;
let currentPreset = 'milky';

// Add the missing method to audio
audio.setBubbleSize = function (size) {
  this.baseRadius = size;
};

window.addEventListener("DOMContentLoaded", () => {
  const suctionSlider = document.getElementById('suctionSlider');
  const bubbleSlider = document.getElementById('bubbleSlider');
  const filterQSlider = document.getElementById('filterQSlider');
  const filterFreqSlider = document.getElementById('filterFreqSlider');
  const presetSelect = document.getElementById('presetSelect');

  const presets = {
    milky:  { suction: 0.8, bubbleSize: 0.011, filterQ: 12, filterFreq: 300 },
    deep:   { suction: 0.6, bubbleSize: 0.015, filterQ: 5,  filterFreq: 220 },
    bubbly: { suction: 1.0, bubbleSize: 0.008, filterQ: 8,  filterFreq: 400 },
    harsh:  { suction: 1.0, bubbleSize: 0.01,  filterQ: 14, filterFreq: 650 }
  };

  function applyPreset(presetName) {
    currentPreset = presetName;
    const preset = presets[presetName];

    suctionSlider.value = preset.suction;
    bubbleSlider.value = preset.bubbleSize;
    filterQSlider.value = preset.filterQ;
    filterFreqSlider.value = preset.filterFreq;

    physics.suction = parseFloat(preset.suction);
    audio.setBubbleSize(parseFloat(preset.bubbleSize));
    audio.setFilterQ(parseFloat(preset.filterQ));
    audio.setFilterFreq(parseFloat(preset.filterFreq));
  }

  presetSelect.addEventListener('change', () => {
    applyPreset(presetSelect.value);
  });

  suctionSlider.addEventListener('input', () => {
    physics.suction = parseFloat(suctionSlider.value);
  });

  bubbleSlider.addEventListener('input', () => {
    audio.setBubbleSize(parseFloat(bubbleSlider.value));
  });

  filterQSlider.addEventListener('input', () => {
    audio.setFilterQ(parseFloat(filterQSlider.value));
  });

  filterFreqSlider.addEventListener('input', () => {
    audio.setFilterFreq(parseFloat(filterFreqSlider.value));
  });

  canvas.addEventListener('mousedown', () => startHit());
  canvas.addEventListener('mouseup', () => stopHit());
  canvas.addEventListener('mouseleave', () => stopHit());
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startHit();
  }, { passive: false });
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    stopHit();
  }, { passive: false });

  function startHit() {
    isHitting = true;
    physics.startInhaling();
    audio.startInhale();
    visualSmoke = 0.6;
  }

  function stopHit() {
    isHitting = false;
    physics.stopInhaling();
    audio.stopInhale();
    visualSmoke = 0;
  }

  setInterval(() => {
    const event = physics.step();

    if (event.bubbleCount > 0) {
      audio.playBubbles(Array(event.bubbleCount).fill(audio.baseRadius));
      event.bubbleSizes.forEach(size => {
        visualBubbles.push({
          x: (Math.random() - 0.5) * 40,
          y: -20,
          r: size * 2000
        });
      });
    }

    visualBubbles.forEach(b => b.y -= 2);
    visualBubbles = visualBubbles.filter(b => b.y > -160);
  }, 50);

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBongVisual({
      bubbles: visualBubbles,
      smokeOpacity: visualSmoke,
      presetName: presets[currentPreset] ? presetSelect.options[presetSelect.selectedIndex].text : "",
      presetKey: currentPreset,
      bubbleScale: audio.baseRadius * 20
    });
    requestAnimationFrame(draw);
  }

  applyPreset('milky');
  draw();
});
