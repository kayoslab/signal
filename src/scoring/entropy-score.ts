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
 *
 * - renderer (15) — hundreds of unique GPU strings, highest entropy
 * - languages (12) — rare language combos are highly distinguishing
 * - screenResolution (10) — thousands of width×height combinations
 * - timezone (10) — ~400 IANA zones worldwide
 * - vendor (8) — dozens of WebGL vendor strings
 * - platform (7) — ~10 major platforms, correlates with other signals
 * - hardwareConcurrency (6) — 1–64 cores, moderately distinguishing
 * - devicePixelRatio (5) — ~20–30 common values
 * - webglVersion (3) — 2–3 states, low entropy
 * - touchSupport (3) — binary, low entropy
 * - doNotTrack (2) — 3–4 states, very common values
 * - storageSupport (2) — most browsers support all three, low entropy
 * - webglSupported (1) — nearly always true, minimal entropy
 *
 * These are heuristic approximations, not scientifically measured values.
 */
export const ENTROPY_WEIGHTS: Record<string, number> = {
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
      // webglSupported is boolean — false means no WebGL, no fingerprint signal
      return snapshot.rendering.webglSupported ? 'true' : 'unavailable';
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
