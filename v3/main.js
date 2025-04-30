import { createEngine } from './sim/engine.js';
import { initAudio }    from './audio/signal.js';

const engine = createEngine();

// Bind slider controls and update engine parameters
function bindSlider(id, multiplier = 1) {
  const slider = document.getElementById(id);
  const display = document.getElementById(id + 'Val');
  const update = () => {
    const val = parseFloat(slider.value) * multiplier;
    display.textContent = val.toFixed(3);
    updateParams();
  };
  slider.addEventListener('input', update);
  update();
}

function updateParams() {
  engine.setParams({
    leakRate:        parseFloat(document.getElementById('leakRate').value) / 1000,
    ventRate:        parseFloat(document.getElementById('ventRate').value) / 1000,
    bubbleVol:       parseFloat(document.getElementById('bubbleVol').value) / 1000,
    suctionStrength: parseFloat(document.getElementById('suction').value)
  });
}

// Initialize all sliders
bindSlider('leakRate');
bindSlider('ventRate');
bindSlider('bubbleVol');
bindSlider('suction', 1);

document.getElementById('start').addEventListener('click', async () => {
  const chamber = engine.getState().chamber;

  updateParams(); // apply initial parameter values

  // Initialize audio and get the analyser node
  const { analyser } = await initAudio(chamber, () => engine.getState().bubbleLog);

  // Set up waveform canvas
  const canvas = document.getElementById('waveform');
  const ctx    = canvas.getContext('2d');
  analyser.fftSize = 1024;
  const bufferLength = analyser.fftSize;
  const dataArray = new Uint8Array(bufferLength);

  function drawWaveform() {
    requestAnimationFrame(drawWaveform);
    analyser.getByteTimeDomainData(dataArray);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#333';
    ctx.beginPath();
    const slice = canvas.width / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = v * canvas.height / 2;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      x += slice;
    }
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  }
  drawWaveform();

  // Start simulation loop
  setInterval(() => {
    engine.simulateStep(1);
    document.getElementById('pressureDisplay').textContent =
      engine.getState().chamber.pressure.toFixed(2);
  }, 16);
});
