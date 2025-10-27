/**
 * Audio synthesis and Web Audio API integration
 * Generates real-time audio from physics simulation
 */

import { BongState, BongParams, getAudioSample } from "./physics.ts";

export interface AudioEngine {
  context: AudioContext;
  processor: AudioWorkletNode | ScriptProcessorNode;
  gainNode: GainNode;
  analyser: AnalyserNode;
  isRunning: boolean;
}

/**
 * Initialize Web Audio API for real-time synthesis
 */
export async function initAudio(): Promise<AudioEngine> {
  const context = new AudioContext({ sampleRate: 44100 });

  // Create gain node for volume control
  const gainNode = context.createGain();
  gainNode.gain.value = 0.5;

  // Create analyser for visualization
  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;

  // Use ScriptProcessorNode (deprecated but widely supported)
  // In production, should use AudioWorklet
  const bufferSize = 4096;
  const processor = context.createScriptProcessor(bufferSize, 0, 1);

  // Connect: processor -> gain -> analyser -> destination
  processor.connect(gainNode);
  gainNode.connect(analyser);
  analyser.connect(context.destination);

  return {
    context,
    processor,
    gainNode,
    analyser,
    isRunning: false,
  };
}

/**
 * Start audio synthesis with physics simulation
 */
export function startAudio(
  engine: AudioEngine,
  state: BongState,
  params: BongParams,
  getInletVelocity: () => number
): void {
  if (engine.isRunning) return;

  const { context, processor } = engine;
  const sampleRate = context.sampleRate;

  // Time accumulator for physics steps
  let timeAccum = 0;

  processor.onaudioprocess = (e: AudioProcessingEvent) => {
    const output = e.outputBuffer.getChannelData(0);

    for (let i = 0; i < output.length; i++) {
      // Run physics at its own rate (could be higher than audio rate)
      const physicsStepsNeeded = Math.ceil(1 / (sampleRate * params.dt));

      for (let step = 0; step < physicsStepsNeeded; step++) {
        const inletVel = getInletVelocity();

        // Import step function
        // Note: This needs to be passed in or imported
        // For now, we'll accumulate samples
        timeAccum += params.dt;
      }

      // Get audio sample from physics state
      output[i] = getAudioSample(state, params);
    }
  };

  engine.isRunning = true;
}

/**
 * Stop audio synthesis
 */
export function stopAudio(engine: AudioEngine): void {
  if (!engine.isRunning) return;

  engine.processor.onaudioprocess = null;
  engine.isRunning = false;
}

/**
 * Create audio buffer from simulation run
 * Useful for offline rendering and testing
 */
export function renderAudioBuffer(
  duration: number,
  state: BongState,
  params: BongParams,
  velocityProfile: (t: number) => number,
  stepFn: (state: BongState, params: BongParams, velocity: number) => void
): AudioBuffer {
  const sampleRate = 44100;
  const numSamples = Math.floor(duration * sampleRate);

  const context = new OfflineAudioContext(1, numSamples, sampleRate);
  const buffer = context.createBuffer(1, numSamples, sampleRate);
  const channelData = buffer.getChannelData(0);

  // Simulate and render
  let simTime = 0;
  const dt = 1 / sampleRate;

  for (let i = 0; i < numSamples; i++) {
    // Run multiple physics steps per audio sample if needed
    const physicsStepsPerSample = Math.max(1, Math.floor(dt / params.dt));

    for (let step = 0; step < physicsStepsPerSample; step++) {
      const velocity = velocityProfile(simTime);
      stepFn(state, params, velocity);
      simTime += params.dt;
    }

    // Get audio sample
    channelData[i] = getAudioSample(state, params);
  }

  return buffer;
}

/**
 * Apply post-processing effects to enhance realism
 */
export function createEffectsChain(context: AudioContext): {
  input: GainNode;
  output: GainNode;
} {
  const input = context.createGain();
  const output = context.createGain();

  // Add subtle reverb for chamber acoustics
  const convolver = context.createConvolver();
  // In a real implementation, load impulse response

  // Low-pass filter to remove high-frequency artifacts
  const lowpass = context.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 8000;  // Remove > 8kHz
  lowpass.Q.value = 0.7;

  // High-pass to remove DC offset and very low rumble
  const highpass = context.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 50;
  highpass.Q.value = 0.7;

  // Compression to even out dynamic range
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 30;
  compressor.ratio.value = 12;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;

  // Connect effects chain
  input.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(compressor);
  compressor.connect(output);

  return { input, output };
}

/**
 * Create a resonant filter bank for bubble frequencies
 * Enhances the characteristic bubble sounds
 */
export function createBubbleFilterBank(context: AudioContext): BiquadFilterNode[] {
  // Typical bubble frequencies range from 100 Hz to 3 kHz
  const frequencies = [150, 300, 600, 1200, 2400];
  const filters: BiquadFilterNode[] = [];

  for (const freq of frequencies) {
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = 5;  // Narrow resonance
    filters.push(filter);
  }

  return filters;
}

/**
 * Analyser helper to get frequency data for visualization
 */
export function getFrequencyData(analyser: AnalyserNode): Uint8Array {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);
  return dataArray;
}

/**
 * Analyser helper to get waveform data for visualization
 */
export function getWaveformData(analyser: AnalyserNode): Uint8Array {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteTimeDomainData(dataArray);
  return dataArray;
}
