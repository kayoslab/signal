import { collectLocaleSignals, type LocaleSignals } from './locale-signals';
import { collectDeviceCapabilitySignals, type DeviceCapabilitySignals } from './device-signals';
import { collectRenderingSignals, type RenderingSignals } from './rendering-signals';
import { collectCanvasSignals, type CanvasSignals } from './canvas-signals';
import { collectWebGLParamSignals, type WebGLParamSignals } from './webgl-param-signals';
import { collectFontSignals, type FontSignals } from './font-signals';
import { collectSpeechSignals, type SpeechSignals } from './speech-signals';
import { collectMediaFeatureSignals, type MediaFeatureSignals } from './media-feature-signals';
import { collectNetworkSignals, type NetworkSignals } from './network-signals';

/**
 * Canonical missing-value sentinels.
 *
 * - `'unknown'`     – the browser has no concept of the API (it was never obtainable).
 * - `'unavailable'` – the API exists but the value could not be read (e.g. security restriction, private browsing).
 */
export const MISSING = Object.freeze({
  unknown: 'unknown' as const,
  unavailable: 'unavailable' as const,
});

export interface SignalSnapshot {
  locale: LocaleSignals;
  device: DeviceCapabilitySignals;
  rendering: RenderingSignals;
  canvas: CanvasSignals;
  webglParams: WebGLParamSignals;
  fonts: FontSignals;
  speech: SpeechSignals;
  mediaFeatures: MediaFeatureSignals;
  network: NetworkSignals;
  collectedAt: string;
  version: number;
}

export function collectSnapshot(): SignalSnapshot {
  const snapshot: SignalSnapshot = {
    locale: collectLocaleSignals(),
    device: collectDeviceCapabilitySignals(),
    rendering: collectRenderingSignals(),
    canvas: collectCanvasSignals(),
    webglParams: collectWebGLParamSignals(),
    fonts: collectFontSignals(),
    speech: collectSpeechSignals(),
    mediaFeatures: collectMediaFeatureSignals(),
    network: collectNetworkSignals(),
    collectedAt: new Date().toISOString(),
    version: 2,
  };

  return Object.freeze(snapshot);
}
