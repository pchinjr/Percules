/* File: ui/visualizer.js */
export function startWaveform(canvas, analyser) {
  const ctx = canvas.getContext('2d');
  analyser.fftSize = 1024;
  const bufferLength = analyser.fftSize;
  const data = new Uint8Array(bufferLength);
  let raf;

  function draw() {
    raf = requestAnimationFrame(draw);
    analyser.getByteTimeDomainData(data);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#333';
    ctx.beginPath();
    const slice = canvas.width / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = data[i] / 128.0;
      const y = v * canvas.height / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += slice;
    }
    ctx.lineTo(canvas.width, canvas.height/2);
    ctx.stroke();
  }

  draw();
  return () => cancelAnimationFrame(raf);
}

export function bindPressureDisplay(el, core, vesselName) {
  setInterval(() => {
    const v = core.getVessel(vesselName).pressure;
    el.textContent = v.toFixed(2);
  }, 60);
}
