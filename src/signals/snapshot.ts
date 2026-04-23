import { collectLocaleSignals, type LocaleSignals } from './locale-signals';
import { collectDeviceCapabilitySignals, type DeviceCapabilitySignals } from './device-signals';
import { collectRenderingSignals, type RenderingSignals } from './rendering-signals';

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
  collectedAt: string;
  version: number;
}

export function collectSnapshot(): SignalSnapshot {
  const snapshot: SignalSnapshot = {
    locale: collectLocaleSignals(),
    device: collectDeviceCapabilitySignals(),
    rendering: collectRenderingSignals(),
    collectedAt: new Date().toISOString(),
    version: 1,
  };

  return Object.freeze(snapshot);
}
