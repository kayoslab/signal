import { describe, it, expect } from 'vitest';
import type { SignalSnapshot } from '../../src/signals/snapshot';
import type { PermissionCheckResult } from '../../src/permissions/permissions-adapter';
import {
  isValidInference,
  INFERENCE_MARKER,
  type InferenceStatement,
} from '../../src/modules/shadow-profile/inference-schema';
import {
  inferDesktopUsage,
  inferGeographicRegion,
  inferPrivacyConscious,
  inferHighEndHardware,
  inferMultilingualUser,
  applyInferenceRules,
} from '../../src/modules/shadow-profile/inference-rules';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CERTAINTY_PATTERN =
  /\b(definitely|certainly|always|never|proves|guaranteed|undoubtedly|without doubt)\b/i;

function makeSnapshot(overrides: {
  locale?: Partial<SignalSnapshot['locale']>;
  device?: Partial<SignalSnapshot['device']>;
  rendering?: Partial<SignalSnapshot['rendering']>;
} = {}): SignalSnapshot {
  return {
    locale: {
      timezone: 'America/New_York',
      languages: ['en-US'] as unknown as readonly string[],
      platform: 'MacIntel',
      doNotTrack: 'unspecified',
      ...overrides.locale,
    },
    device: {
      screenWidth: 1920,
      screenHeight: 1080,
      devicePixelRatio: 1,
      hardwareConcurrency: 4,
      touchSupport: false,
      storageSupport: {
        localStorage: true,
        sessionStorage: true,
        indexedDB: true,
      },
      ...overrides.device,
    },
    rendering: {
      webglSupported: true,
      renderer: 'ANGLE (Intel, Mesa Intel UHD Graphics 630)',
      vendor: 'Google Inc. (Intel)',
      webglVersion: 'WebGL 2.0',
      ...overrides.rendering,
    },
    collectedAt: new Date().toISOString(),
    version: 1,
  };
}

function makePermissions(
  overrides: Record<string, 'granted' | 'denied' | 'prompt' | 'unsupported'> = {},
): PermissionCheckResult[] {
  const defaults: Record<string, 'granted' | 'denied' | 'prompt' | 'unsupported'> = {
    geolocation: 'prompt',
    notifications: 'prompt',
    camera: 'prompt',
    microphone: 'prompt',
  };
  return Object.entries({ ...defaults, ...overrides }).map(([name, state]) => ({
    name,
    state,
  }));
}

function assertNoCertaintyLanguage(inference: InferenceStatement): void {
  expect(inference.statement).not.toMatch(CERTAINTY_PATTERN);
}

function assertValidInference(inference: InferenceStatement): void {
  expect(isValidInference(inference)).toBe(true);
  expect(inference.marker).toBe(INFERENCE_MARKER);
}

// ---------------------------------------------------------------------------
// Rule 1: Desktop daytime usage pattern
// ---------------------------------------------------------------------------

describe('inferDesktopUsage', () => {
  it('returns an InferenceStatement when signals match desktop profile', () => {
    const snapshot = makeSnapshot({
      device: { hardwareConcurrency: 8, touchSupport: false, screenWidth: 1920 },
    });
    const result = inferDesktopUsage(snapshot);
    expect(result).not.toBeNull();
    assertValidInference(result!);
  });

  it('returns null when touchSupport is true', () => {
    const snapshot = makeSnapshot({
      device: { hardwareConcurrency: 8, touchSupport: true, screenWidth: 1920 },
    });
    expect(inferDesktopUsage(snapshot)).toBeNull();
  });

  it('returns null when hardwareConcurrency is below threshold', () => {
    const snapshot = makeSnapshot({
      device: { hardwareConcurrency: 2, touchSupport: false, screenWidth: 1920 },
    });
    expect(inferDesktopUsage(snapshot)).toBeNull();
  });

  it('returns null when screenWidth is below threshold', () => {
    const snapshot = makeSnapshot({
      device: { hardwareConcurrency: 8, touchSupport: false, screenWidth: 768 },
    });
    expect(inferDesktopUsage(snapshot)).toBeNull();
  });

  it('matches at boundary value: hardwareConcurrency exactly 4', () => {
    const snapshot = makeSnapshot({
      device: { hardwareConcurrency: 4, touchSupport: false, screenWidth: 1280 },
    });
    const result = inferDesktopUsage(snapshot);
    expect(result).not.toBeNull();
  });

  it('matches at boundary value: screenWidth exactly 1280', () => {
    const snapshot = makeSnapshot({
      device: { hardwareConcurrency: 4, touchSupport: false, screenWidth: 1280 },
    });
    const result = inferDesktopUsage(snapshot);
    expect(result).not.toBeNull();
  });

  it('returns null when hardwareConcurrency is unavailable', () => {
    const snapshot = makeSnapshot({
      device: { hardwareConcurrency: 'unavailable' as unknown as number, touchSupport: false, screenWidth: 1920 },
    });
    expect(inferDesktopUsage(snapshot)).toBeNull();
  });

  it('contains no certainty language in the statement', () => {
    const snapshot = makeSnapshot({
      device: { hardwareConcurrency: 8, touchSupport: false, screenWidth: 1920 },
    });
    const result = inferDesktopUsage(snapshot);
    assertNoCertaintyLanguage(result!);
  });

  it('references correct evidence signals', () => {
    const snapshot = makeSnapshot({
      device: { hardwareConcurrency: 8, touchSupport: false, screenWidth: 1920 },
    });
    const result = inferDesktopUsage(snapshot);
    const signalNames = result!.evidence.map((e) => e.signal);
    expect(signalNames).toContain('hardwareConcurrency');
    expect(signalNames).toContain('touchSupport');
    expect(signalNames).toContain('screenWidth');
  });
});

// ---------------------------------------------------------------------------
// Rule 2: Geographic region from timezone
// ---------------------------------------------------------------------------

describe('inferGeographicRegion', () => {
  it('returns an InferenceStatement for a known timezone', () => {
    const snapshot = makeSnapshot({ locale: { timezone: 'America/New_York' } });
    const result = inferGeographicRegion(snapshot);
    expect(result).not.toBeNull();
    assertValidInference(result!);
  });

  it('returns null for an unknown or unavailable timezone', () => {
    const snapshot = makeSnapshot({ locale: { timezone: 'unknown' } });
    expect(inferGeographicRegion(snapshot)).toBeNull();
  });

  it('maps European timezone to a European region', () => {
    const snapshot = makeSnapshot({ locale: { timezone: 'Europe/London' } });
    const result = inferGeographicRegion(snapshot);
    expect(result).not.toBeNull();
    expect(result!.statement.toLowerCase()).toContain('europe');
  });

  it('maps Asia timezone to an Asian region', () => {
    const snapshot = makeSnapshot({ locale: { timezone: 'Asia/Tokyo' } });
    const result = inferGeographicRegion(snapshot);
    expect(result).not.toBeNull();
    expect(result!.statement.toLowerCase()).toContain('asia');
  });

  it('contains no certainty language in the statement', () => {
    const snapshot = makeSnapshot({ locale: { timezone: 'America/Chicago' } });
    const result = inferGeographicRegion(snapshot);
    if (result) assertNoCertaintyLanguage(result);
  });

  it('references timezone signal in evidence', () => {
    const snapshot = makeSnapshot({ locale: { timezone: 'Europe/Berlin' } });
    const result = inferGeographicRegion(snapshot);
    const signalNames = result!.evidence.map((e) => e.signal);
    expect(signalNames).toContain('timezone');
  });

  it('sets confidence to medium', () => {
    const snapshot = makeSnapshot({ locale: { timezone: 'America/New_York' } });
    const result = inferGeographicRegion(snapshot);
    expect(result!.confidence).toBe('medium');
  });
});

// ---------------------------------------------------------------------------
// Rule 3: Privacy-conscious user
// ---------------------------------------------------------------------------

describe('inferPrivacyConscious', () => {
  it('returns an InferenceStatement when doNotTrack is enabled and permissions are denied', () => {
    const snapshot = makeSnapshot({ locale: { doNotTrack: '1' } });
    const permissions = makePermissions({ camera: 'denied', microphone: 'denied' });
    const result = inferPrivacyConscious(snapshot, permissions);
    expect(result).not.toBeNull();
    assertValidInference(result!);
  });

  it('returns null when no privacy signals are active', () => {
    const snapshot = makeSnapshot({ locale: { doNotTrack: 'unspecified' } });
    const permissions = makePermissions();
    const result = inferPrivacyConscious(snapshot, permissions);
    expect(result).toBeNull();
  });

  it('returns an InferenceStatement when only denied permissions meet the threshold', () => {
    const snapshot = makeSnapshot({ locale: { doNotTrack: 'unspecified' } });
    const permissions = makePermissions({
      camera: 'denied',
      microphone: 'denied',
      geolocation: 'denied',
    });
    const result = inferPrivacyConscious(snapshot, permissions);
    expect(result).not.toBeNull();
  });

  it('returns an InferenceStatement when doNotTrack plus one denied permission meets threshold', () => {
    const snapshot = makeSnapshot({ locale: { doNotTrack: '1' } });
    const permissions = makePermissions({ camera: 'denied' });
    const result = inferPrivacyConscious(snapshot, permissions);
    expect(result).not.toBeNull();
  });

  it('handles missing permissions gracefully (undefined)', () => {
    const snapshot = makeSnapshot({ locale: { doNotTrack: '1' } });
    const result = inferPrivacyConscious(snapshot, undefined);
    expect(result).toBeNull();
  });

  it('handles empty permissions array', () => {
    const snapshot = makeSnapshot({ locale: { doNotTrack: '1' } });
    const result = inferPrivacyConscious(snapshot, []);
    expect(result).toBeNull();
  });

  it('contains no certainty language in the statement', () => {
    const snapshot = makeSnapshot({ locale: { doNotTrack: '1' } });
    const permissions = makePermissions({ camera: 'denied', microphone: 'denied' });
    const result = inferPrivacyConscious(snapshot, permissions);
    if (result) assertNoCertaintyLanguage(result);
  });

  it('references doNotTrack or denied permissions in evidence', () => {
    const snapshot = makeSnapshot({ locale: { doNotTrack: '1' } });
    const permissions = makePermissions({ camera: 'denied' });
    const result = inferPrivacyConscious(snapshot, permissions);
    if (result) {
      const signalNames = result.evidence.map((e) => e.signal);
      expect(
        signalNames.includes('doNotTrack') || signalNames.some((s) => s.includes('permission')),
      ).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Rule 4: High-end hardware profile
// ---------------------------------------------------------------------------

describe('inferHighEndHardware', () => {
  it('returns an InferenceStatement for high-end hardware', () => {
    const snapshot = makeSnapshot({
      device: { hardwareConcurrency: 16, devicePixelRatio: 2 },
      rendering: { renderer: 'ANGLE (Apple, Apple M2 Pro)' },
    });
    const result = inferHighEndHardware(snapshot);
    expect(result).not.toBeNull();
    assertValidInference(result!);
  });

  it('returns null when hardwareConcurrency is below threshold', () => {
    const snapshot = makeSnapshot({
      device: { hardwareConcurrency: 4, devicePixelRatio: 2 },
      rendering: { renderer: 'ANGLE (Apple, Apple M2 Pro)' },
    });
    expect(inferHighEndHardware(snapshot)).toBeNull();
  });

  it('returns null when devicePixelRatio is below threshold', () => {
    const snapshot = makeSnapshot({
      device: { hardwareConcurrency: 16, devicePixelRatio: 1 },
      rendering: { renderer: 'ANGLE (Apple, Apple M2 Pro)' },
    });
    expect(inferHighEndHardware(snapshot)).toBeNull();
  });

  it('returns null when renderer does not match known high-end keywords', () => {
    const snapshot = makeSnapshot({
      device: { hardwareConcurrency: 16, devicePixelRatio: 2 },
      rendering: { renderer: 'ANGLE (Intel, Mesa Intel UHD Graphics 630)' },
    });
    expect(inferHighEndHardware(snapshot)).toBeNull();
  });

  it('detects RTX in renderer string', () => {
    const snapshot = makeSnapshot({
      device: { hardwareConcurrency: 12, devicePixelRatio: 2 },
      rendering: { renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4090)' },
    });
    const result = inferHighEndHardware(snapshot);
    expect(result).not.toBeNull();
  });

  it('detects M1 in renderer string', () => {
    const snapshot = makeSnapshot({
      device: { hardwareConcurrency: 8, devicePixelRatio: 2 },
      rendering: { renderer: 'ANGLE (Apple, Apple M1)' },
    });
    const result = inferHighEndHardware(snapshot);
    expect(result).not.toBeNull();
  });

  it('detects Radeon Pro in renderer string', () => {
    const snapshot = makeSnapshot({
      device: { hardwareConcurrency: 8, devicePixelRatio: 2 },
      rendering: { renderer: 'ANGLE (AMD, Radeon Pro 5500M)' },
    });
    const result = inferHighEndHardware(snapshot);
    expect(result).not.toBeNull();
  });

  it('matches at boundary: hardwareConcurrency exactly 8', () => {
    const snapshot = makeSnapshot({
      device: { hardwareConcurrency: 8, devicePixelRatio: 2 },
      rendering: { renderer: 'ANGLE (Apple, Apple M3 Pro)' },
    });
    const result = inferHighEndHardware(snapshot);
    expect(result).not.toBeNull();
  });

  it('contains no certainty language in the statement', () => {
    const snapshot = makeSnapshot({
      device: { hardwareConcurrency: 16, devicePixelRatio: 2 },
      rendering: { renderer: 'ANGLE (Apple, Apple M2 Pro)' },
    });
    const result = inferHighEndHardware(snapshot);
    if (result) assertNoCertaintyLanguage(result);
  });

  it('references correct evidence signals', () => {
    const snapshot = makeSnapshot({
      device: { hardwareConcurrency: 16, devicePixelRatio: 2 },
      rendering: { renderer: 'ANGLE (Apple, Apple M2 Pro)' },
    });
    const result = inferHighEndHardware(snapshot);
    const signalNames = result!.evidence.map((e) => e.signal);
    expect(signalNames).toContain('hardwareConcurrency');
    expect(signalNames).toContain('devicePixelRatio');
    expect(signalNames).toContain('renderer');
  });
});

// ---------------------------------------------------------------------------
// Rule 5: Multilingual user
// ---------------------------------------------------------------------------

describe('inferMultilingualUser', () => {
  it('returns an InferenceStatement when 2+ languages are present', () => {
    const snapshot = makeSnapshot({
      locale: { languages: ['en-US', 'es-ES'] as unknown as readonly string[] },
    });
    const result = inferMultilingualUser(snapshot);
    expect(result).not.toBeNull();
    assertValidInference(result!);
  });

  it('returns null when only one language is present', () => {
    const snapshot = makeSnapshot({
      locale: { languages: ['en-US'] as unknown as readonly string[] },
    });
    expect(inferMultilingualUser(snapshot)).toBeNull();
  });

  it('returns null when languages array is empty', () => {
    const snapshot = makeSnapshot({
      locale: { languages: [] as unknown as readonly string[] },
    });
    expect(inferMultilingualUser(snapshot)).toBeNull();
  });

  it('contains no certainty language in the statement', () => {
    const snapshot = makeSnapshot({
      locale: { languages: ['en-US', 'fr-FR', 'de-DE'] as unknown as readonly string[] },
    });
    const result = inferMultilingualUser(snapshot);
    if (result) assertNoCertaintyLanguage(result);
  });

  it('references languages signal in evidence', () => {
    const snapshot = makeSnapshot({
      locale: { languages: ['en-US', 'ja-JP'] as unknown as readonly string[] },
    });
    const result = inferMultilingualUser(snapshot);
    const signalNames = result!.evidence.map((e) => e.signal);
    expect(signalNames).toContain('languages');
  });

  it('sets confidence to low', () => {
    const snapshot = makeSnapshot({
      locale: { languages: ['en-US', 'zh-CN'] as unknown as readonly string[] },
    });
    const result = inferMultilingualUser(snapshot);
    expect(result!.confidence).toBe('low');
  });
});

// ---------------------------------------------------------------------------
// applyInferenceRules — integration
// ---------------------------------------------------------------------------

describe('applyInferenceRules', () => {
  it('returns at least 4 InferenceStatements with a richly populated snapshot', () => {
    const snapshot = makeSnapshot({
      locale: {
        timezone: 'America/New_York',
        languages: ['en-US', 'es-ES'] as unknown as readonly string[],
        doNotTrack: '1',
      },
      device: {
        hardwareConcurrency: 16,
        touchSupport: false,
        screenWidth: 2560,
        devicePixelRatio: 2,
      },
      rendering: { renderer: 'ANGLE (Apple, Apple M2 Max)' },
    });
    const permissions = makePermissions({
      camera: 'denied',
      microphone: 'denied',
      geolocation: 'denied',
    });

    const results = applyInferenceRules({ snapshot, permissions });
    expect(results.length).toBeGreaterThanOrEqual(4);
  });

  it('every returned statement passes isValidInference()', () => {
    const snapshot = makeSnapshot({
      locale: {
        timezone: 'Europe/Berlin',
        languages: ['de-DE', 'en-US'] as unknown as readonly string[],
        doNotTrack: '1',
      },
      device: {
        hardwareConcurrency: 12,
        touchSupport: false,
        screenWidth: 1920,
        devicePixelRatio: 2,
      },
      rendering: { renderer: 'ANGLE (Apple, Apple M3 Pro)' },
    });
    const permissions = makePermissions({ camera: 'denied', microphone: 'denied' });

    const results = applyInferenceRules({ snapshot, permissions });
    for (const inference of results) {
      expect(isValidInference(inference)).toBe(true);
    }
  });

  it('no statement uses certainty language', () => {
    const snapshot = makeSnapshot({
      locale: {
        timezone: 'Asia/Tokyo',
        languages: ['ja-JP', 'en-US'] as unknown as readonly string[],
        doNotTrack: '1',
      },
      device: {
        hardwareConcurrency: 16,
        touchSupport: false,
        screenWidth: 2560,
        devicePixelRatio: 2,
      },
      rendering: { renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4080)' },
    });
    const permissions = makePermissions({ camera: 'denied', geolocation: 'denied' });

    const results = applyInferenceRules({ snapshot, permissions });
    for (const inference of results) {
      assertNoCertaintyLanguage(inference);
    }
  });

  it('every statement has the [Inference] marker', () => {
    const snapshot = makeSnapshot({
      locale: {
        timezone: 'America/Los_Angeles',
        languages: ['en-US', 'fr-FR'] as unknown as readonly string[],
      },
      device: { hardwareConcurrency: 8, touchSupport: false, screenWidth: 1440 },
    });

    const results = applyInferenceRules({ snapshot });
    for (const inference of results) {
      expect(inference.marker).toBe(INFERENCE_MARKER);
    }
  });

  it('returns an empty array when no rules match', () => {
    const snapshot = makeSnapshot({
      locale: {
        timezone: 'unknown',
        languages: ['en-US'] as unknown as readonly string[],
        doNotTrack: 'unspecified',
      },
      device: {
        hardwareConcurrency: 2,
        touchSupport: true,
        screenWidth: 375,
        devicePixelRatio: 1,
      },
      rendering: { renderer: 'unavailable' },
    });

    const results = applyInferenceRules({ snapshot });
    expect(results).toEqual([]);
  });

  it('works without permissions parameter', () => {
    const snapshot = makeSnapshot({
      locale: { timezone: 'America/New_York' },
      device: { hardwareConcurrency: 8, touchSupport: false, screenWidth: 1920 },
    });

    expect(() => applyInferenceRules({ snapshot })).not.toThrow();
    const results = applyInferenceRules({ snapshot });
    expect(Array.isArray(results)).toBe(true);
  });

  it('each evidence entry references a real signal field path', () => {
    const validSignalFields = new Set([
      'timezone',
      'languages',
      'platform',
      'doNotTrack',
      'screenWidth',
      'screenHeight',
      'devicePixelRatio',
      'hardwareConcurrency',
      'touchSupport',
      'renderer',
      'vendor',
      'webglSupported',
      'webglVersion',
      'permission:camera',
      'permission:microphone',
      'permission:geolocation',
      'permission:notifications',
      'permission:persistent-storage',
      'permission:push',
      'permission:screen-wake-lock',
      'permission:accelerometer',
      'permission:gyroscope',
      'permission:magnetometer',
      'permission:midi',
    ]);

    const snapshot = makeSnapshot({
      locale: {
        timezone: 'America/New_York',
        languages: ['en-US', 'es-ES'] as unknown as readonly string[],
        doNotTrack: '1',
      },
      device: {
        hardwareConcurrency: 16,
        touchSupport: false,
        screenWidth: 2560,
        devicePixelRatio: 2,
      },
      rendering: { renderer: 'ANGLE (Apple, Apple M2 Max)' },
    });
    const permissions = makePermissions({
      camera: 'denied',
      microphone: 'denied',
      geolocation: 'denied',
    });

    const results = applyInferenceRules({ snapshot, permissions });
    for (const inference of results) {
      for (const entry of inference.evidence) {
        expect(validSignalFields.has(entry.signal)).toBe(true);
      }
    }
  });
});
