import { collectAudioSignals, type AudioSignals } from './audio-signals';
import { collectMediaSignals, type MediaSignals } from './media-signals';
import { collectWebRTCSignals, type WebRTCSignals } from './webrtc-signals';

export interface AsyncSignals {
  audio: AudioSignals;
  media: MediaSignals;
  webrtc: WebRTCSignals;
}

export async function collectAsyncSignals(): Promise<AsyncSignals> {
  const [audio, media, webrtc] = await Promise.all([
    collectAudioSignals(),
    collectMediaSignals(),
    collectWebRTCSignals(),
  ]);

  return { audio, media, webrtc };
}

export type { AudioSignals, MediaSignals, WebRTCSignals };
