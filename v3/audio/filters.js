// audio/filters.js

export function createFilters(audioCtx) {
  const highpass = audioCtx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 100;
  highpass.Q.value = 0.7;

  const peak1 = audioCtx.createBiquadFilter();
  peak1.type = 'peaking';
  peak1.frequency.value = 250;
  peak1.Q.value = 1;
  peak1.gain.value = 6;

  const peak2 = audioCtx.createBiquadFilter();
  peak2.type = 'peaking';
  peak2.frequency.value = 600;
  peak2.Q.value = 1;
  peak2.gain.value = 4;

  const lowpass = audioCtx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 1200;
  lowpass.Q.value = 1;

  highpass.connect(peak1);
  peak1.connect(peak2);
  peak2.connect(lowpass);

  return { input: highpass, output: lowpass };
}
