export interface AudioSignals {
  audioHash: string;
  audioSupported: boolean;
}

const UNAVAILABLE = 'unavailable';

function simpleHash(arr: Float32Array): string {
  let hash = 0;
  for (let i = 0; i < arr.length; i++) {
    const val = Math.round(arr[i] * 1e6);
    hash = ((hash << 5) - hash + val) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export async function collectAudioSignals(): Promise<AudioSignals> {
  try {
    const OfflineCtx =
      (globalThis as unknown as { OfflineAudioContext?: typeof OfflineAudioContext })
        .OfflineAudioContext ??
      (globalThis as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
        .webkitOfflineAudioContext;

    if (!OfflineCtx) {
      return { audioHash: UNAVAILABLE, audioSupported: false };
    }

    const context = new OfflineCtx(1, 4410, 44100);

    const oscillator = context.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(10000, context.currentTime);

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-50, context.currentTime);
    compressor.knee.setValueAtTime(40, context.currentTime);
    compressor.ratio.setValueAtTime(12, context.currentTime);
    compressor.attack.setValueAtTime(0, context.currentTime);
    compressor.release.setValueAtTime(0.25, context.currentTime);

    oscillator.connect(compressor);
    compressor.connect(context.destination);
    oscillator.start(0);

    const buffer = await context.startRendering();
    const data = buffer.getChannelData(0);

    // Hash a slice of the output — floating-point rounding is hardware-specific
    const slice = data.slice(4000, 4410);
    const hash = simpleHash(slice);

    return { audioHash: hash, audioSupported: true };
  } catch {
    return { audioHash: UNAVAILABLE, audioSupported: false };
  }
}
