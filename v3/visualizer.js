// visualizer.js

/**
 * Start drawing the time-domain waveform from an AnalyserNode
 * into the given <canvas>.
 * Returns a function to stop the drawing loop.
 */
export function startWaveform(canvas, analyser) {
  const ctx = canvas.getContext('2d');
  analyser.fftSize = analyser.fftSize || 1024;
  const bufferLength = analyser.fftSize;
  const dataArray = new Uint8Array(bufferLength);

  let rafId;

  function draw() {
    rafId = requestAnimationFrame(draw);

    analyser.getByteTimeDomainData(dataArray);

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#333';
    ctx.beginPath();

    const sliceWidth = canvas.width / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;
      if (i === 0) ctx.moveTo(x, y);
      else         ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  }

  draw();

  return () => cancelAnimationFrame(rafId);
}
