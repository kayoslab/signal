import type { SignalSnapshot } from '../signals/snapshot';

export interface EntropyBreakdownEntry {
  signal: string;
  value: string;
  weight: number;
  contribution: number;
}

export interface EntropyResult {
  score: number;
  maxPossible: number;
  breakdown: EntropyBreakdownEntry[];
}

/**
 * Heuristic weights estimating how distinguishing each browser signal is.
 *
 * Higher weights indicate signals that vary more across the global browser
 * population and therefore contribute more to fingerprint uniqueness.
 */
export const ENTROPY_WEIGHTS: Record<string, number> = {
  // Original signals
  renderer: 15,
  languages: 12,
  screenResolution: 10,
  timezone: 10,
  vendor: 8,
  platform: 7,
  hardwareConcurrency: 6,
  devicePixelRatio: 5,
  webglVersion: 3,
  touchSupport: 3,
  doNotTrack: 2,
  storageSupport: 2,
  webglSupported: 1,

  // New signals — canvas & audio are the highest-entropy fingerprinting vectors
  canvasHash: 18,
  fonts: 16,
  webglParams: 14,
  colorDepth: 3,
  maxTouchPoints: 3,
  deviceMemory: 4,
  speechVoices: 10,
  mediaFeatures: 6,
  networkType: 3,
  webglExtensions: 8,
};

const MISSING_SENTINELS = new Set(['unknown', 'unavailable']);

function isMissing(value: string): boolean {
  return MISSING_SENTINELS.has(value);
}

function extractSignalValue(
  signal: string,
  snapshot: SignalSnapshot,
): string {
  switch (signal) {
    case 'renderer':
      return String(snapshot.rendering.renderer);
    case 'languages':
      return snapshot.locale.languages.join(',');
    case 'screenResolution': {
      const w = String(snapshot.device.screenWidth);
      const h = String(snapshot.device.screenHeight);
      if (isMissing(w) || isMissing(h)) return 'unavailable';
      return `${w}x${h}`;
    }
    case 'timezone':
      return snapshot.locale.timezone;
    case 'vendor':
      return String(snapshot.rendering.vendor);
    case 'platform':
      return snapshot.locale.platform;
    case 'hardwareConcurrency':
      return String(snapshot.device.hardwareConcurrency);
    case 'devicePixelRatio':
      return String(snapshot.device.devicePixelRatio);
    case 'webglVersion':
      return String(snapshot.rendering.webglVersion);
    case 'touchSupport':
      return String(snapshot.device.touchSupport);
    case 'doNotTrack':
      return snapshot.locale.doNotTrack;
    case 'storageSupport': {
      const s = snapshot.device.storageSupport;
      const ls = s.localStorage === true ? '1' : '0';
      const ss = s.sessionStorage === true ? '1' : '0';
      const idb = s.indexedDB === true ? '1' : '0';
      if (ls === '0' && ss === '0' && idb === '0') {
        const allSentinel =
          isMissing(String(s.localStorage)) &&
          isMissing(String(s.sessionStorage)) &&
          isMissing(String(s.indexedDB));
        if (allSentinel) return 'unavailable';
      }
      return `${ls}${ss}${idb}`;
    }
    case 'webglSupported':
      return snapshot.rendering.webglSupported ? 'true' : 'unavailable';

    // New signals
    case 'canvasHash':
      return snapshot.canvas.canvasSupported ? snapshot.canvas.canvasHash : 'unavailable';
    case 'fonts':
      return snapshot.fonts.fontCount > 0
        ? `${snapshot.fonts.fontCount}:${snapshot.fonts.detectedFonts.join(',')}`
        : 'unavailable';
    case 'webglParams': {
      const p = snapshot.webglParams;
      const val = String(p.maxTextureSize);
      return isMissing(val) ? 'unavailable' : `${p.maxTextureSize}|${p.maxRenderbufferSize}|${p.maxVertexAttribs}`;
    }
    case 'colorDepth':
      return String(snapshot.device.colorDepth);
    case 'maxTouchPoints':
      return String(snapshot.device.maxTouchPoints);
    case 'deviceMemory':
      return String(snapshot.device.deviceMemory);
    case 'speechVoices':
      return typeof snapshot.speech.voiceCount === 'number' && snapshot.speech.voiceCount > 0
        ? `${snapshot.speech.voiceCount}:${snapshot.speech.voiceList.slice(0, 5).join(',')}`
        : 'unavailable';
    case 'mediaFeatures': {
      const mf = snapshot.mediaFeatures;
      return `${mf.prefersColorScheme}|${mf.colorGamut}|${mf.dynamicRange}|${mf.prefersReducedMotion}`;
    }
    case 'networkType':
      return String(snapshot.network.effectiveType);
    case 'webglExtensions':
      return snapshot.webglParams.extensions.length > 0
        ? String(snapshot.webglParams.extensionCount)
        : 'unavailable';
    default:
      return 'unknown';
  }
}

/**
 * Calculates a deterministic entropy score on a 0–100 scale.
 *
 * Scoring formula:
 *   score = round(sum_of_contributions / sum_of_all_weights × 100)
 *
 * Each signal contributes its full weight when present (not a missing sentinel),
 * and 0 when absent ('unknown' or 'unavailable').
 * The result is clamped to [0, 100] and returned as an integer.
 *
 * This is a heuristic estimate, not a scientific measurement.
 */
export function calculateEntropyScore(
  snapshot: SignalSnapshot,
): EntropyResult {
  let contributionSum = 0;
  let totalSum = 0;
  const breakdown: EntropyBreakdownEntry[] = [];

  for (const [signal, weight] of Object.entries(ENTROPY_WEIGHTS)) {
    totalSum += weight;
    const value = extractSignalValue(signal, snapshot);
    const contribution = isMissing(value) ? 0 : weight;
    contributionSum += contribution;
    breakdown.push({ signal, value, weight, contribution });
  }

  const raw = totalSum > 0 ? (contributionSum / totalSum) * 100 : 0;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  return { score, maxPossible: totalSum, breakdown };
}
