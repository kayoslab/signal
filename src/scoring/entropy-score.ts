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

/**
 * Common-value sets for signals where most browsers share a small set of values.
 * Values found here are considered low-entropy (common); values not found are
 * considered distinguishing and contribute more to the score.
 */
const COMMON_VALUES: Record<string, Set<string>> = {
  timezone: new Set([
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
    'Asia/Kolkata', 'Australia/Sydney', 'UTC',
  ]),
  languages: new Set([
    'en-US', 'en-GB', 'en', 'de', 'fr', 'es', 'zh-CN', 'ja', 'pt-BR', 'ko',
  ]),
  platform: new Set(['Win32', 'MacIntel', 'Linux x86_64']),
  screenResolution: new Set([
    '1920x1080', '1366x768', '1536x864', '1440x900', '2560x1440',
    '1280x720', '1600x900', '3840x2160', '2560x1600', '1280x800',
  ]),
  vendor: new Set(['Google Inc.', 'Apple Computer, Inc.', 'Google Inc. (Apple)']),
  hardwareConcurrency: new Set(['4', '8', '2', '6', '12', '16']),
  devicePixelRatio: new Set(['1', '2', '3']),
  colorDepth: new Set(['24', '30']),
  maxTouchPoints: new Set(['0', '1', '5', '10']),
  deviceMemory: new Set(['8', '4', '2', '16']),
  doNotTrack: new Set(['Not Set', 'Enabled', 'Disabled']),
  networkType: new Set(['4g']),
  webglVersion: new Set(['WebGL 1.0', 'WebGL 2.0']),
  touchSupport: new Set(['true', 'false']),
  storageSupport: new Set(['111']),
  webglSupported: new Set(['true']),
};

/** Fraction of weight credited to a signal whose value is common (0–1). */
const COMMON_DISCOUNT = 0.15;

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
 * Determine the distinctiveness factor for a signal value.
 *
 * - Missing signals contribute 0.
 * - Signals with a value in the COMMON_VALUES set for that signal are discounted
 *   to COMMON_DISCOUNT of their weight (they don't distinguish the user much).
 * - Signals with no common-value set (e.g. canvasHash, fonts, renderer) or whose
 *   value is not in the common set get their full weight (high distinctiveness).
 */
function distinctivenessFactor(signal: string, value: string): number {
  if (isMissing(value)) return 0;
  const commonSet = COMMON_VALUES[signal];
  if (!commonSet) return 1; // No common-value list → treat as distinguishing (e.g. canvasHash)

  // For compound values like languages "en-US,en", check if the primary token is common
  const primary = value.split(',')[0];
  if (commonSet.has(value) || commonSet.has(primary)) return COMMON_DISCOUNT;
  return 1;
}

/**
 * Calculates a deterministic entropy score on a 0–100 scale.
 *
 * Unlike a simple presence/absence check, this scorer accounts for how
 * *distinguishing* each signal's value is. A common screen resolution
 * like 1920×1080 contributes far less than a rare GPU renderer string.
 *
 * Scoring formula:
 *   score = round(sum_of_weighted_contributions / sum_of_all_weights × 100)
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
    const factor = distinctivenessFactor(signal, value);
    const contribution = weight * factor;
    contributionSum += contribution;
    breakdown.push({ signal, value, weight, contribution: Math.round(contribution * 100) / 100 });
  }

  const raw = totalSum > 0 ? (contributionSum / totalSum) * 100 : 0;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  return { score, maxPossible: totalSum, breakdown };
}
