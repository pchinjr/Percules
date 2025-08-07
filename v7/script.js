/* script.js */
(function() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioContext();
  const SAMPLE_RATE = audioCtx.sampleRate;

  // UI elements
  const bubbleRateInput = document.getElementById('bubbleRate');
  const bubbleRateVal = document.getElementById('bubbleRateVal');
  const freqMinInput   = document.getElementById('freqMin');
  const freqMinVal     = document.getElementById('freqMinVal');
  const freqMaxInput   = document.getElementById('freqMax');
  const freqMaxVal     = document.getElementById('freqMaxVal');
  const decayInput     = document.getElementById('decay');
  const decayVal       = document.getElementById('decayVal');
  const gurgleInput    = document.getElementById('gurgleLevel');
  const gurgleVal      = document.getElementById('gurgleVal');

  // Update displayed values
  [bubbleRateInput, freqMinInput, freqMaxInput, decayInput, gurgleInput].forEach(input => {
    input.addEventListener('input', () => {
      document.getElementById(input.id + 'Val').textContent = input.value;
    });
  });

  function generateForces(windowDuration) {
    const events = [];
    const bubbleRate = +bubbleRateInput.value;
    let t = 0;
    while (t < windowDuration) {
      const interval = -Math.log(Math.random()) / bubbleRate;
      t += interval;
      if (t >= windowDuration) break;
      const freqMin = +freqMinInput.value;
      const freqMax = +freqMaxInput.value;
      const freq = freqMin + Math.random() * (freqMax - freqMin);
      events.push({ time: t, force: 1, freq });
    }
    return events;
  }

  function synthesizeChunk(duration) {
    const decay = +decayInput.value;
    const length = Math.ceil((duration + decay) * SAMPLE_RATE);
    const buffer = audioCtx.createBuffer(1, length, SAMPLE_RATE);
    const data = buffer.getChannelData(0);
    const forces = generateForces(duration);

    // Bubble pulses
    forces.forEach(f => {
      const start = Math.floor(f.time * SAMPLE_RATE);
      const irLen = Math.ceil(decay * SAMPLE_RATE);
      for (let n = 0; n < irLen && (start + n) < length; n++) {
        const tt = n / SAMPLE_RATE;
        const env = Math.exp(-tt / decay);
        data[start + n] += f.force * env * Math.sin(2 * Math.PI * f.freq * tt);
      }
    });

    // Gurgle noise
    let prev = 0;
    const rc = 1 / (2 * Math.PI * 500);
    const alpha = (1 / SAMPLE_RATE) / (rc + 1 / SAMPLE_RATE);
    const gurgleLevel = +gurgleInput.value;
    for (let i = 0; i < length; i++) {
      const noise = Math.random() * 2 - 1;
      prev = prev + alpha * (noise - prev);
      data[i] += gurgleLevel * prev;
    }

    // Normalize
    let maxVal = 0;
    for (let i = 0; i < length; i++) {
      if (Math.abs(data[i]) > maxVal) maxVal = Math.abs(data[i]);
    }
    if (maxVal > 0) {
      for (let i = 0; i < length; i++) data[i] /= maxVal;
    }

    return buffer;
  }

  const hitBtn = document.getElementById('hitBtn');
  let playing = false;
  let nextTime = 0;
  const chunkDuration = 0.5;

  function scheduleChunk() {
    if (!playing) return;
    const buf = synthesizeChunk(chunkDuration);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);
    src.start(nextTime);
    nextTime += chunkDuration;
    const now = audioCtx.currentTime;
    const delay = nextTime - now - 0.1;
    setTimeout(scheduleChunk, Math.max(0, delay * 1000));
  }

  function startHit() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (playing) return;
    playing = true;
    nextTime = audioCtx.currentTime + 0.05;
    scheduleChunk();
  }

  function stopHit() {
    playing = false;
  }

  hitBtn.addEventListener('mousedown', startHit);
  hitBtn.addEventListener('mouseup', stopHit);
  hitBtn.addEventListener('mouseleave', stopHit);
})();
