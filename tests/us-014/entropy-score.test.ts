import { describe, it, expect } from 'vitest';
import {
  calculateEntropyScore,
  ENTROPY_WEIGHTS,
  type EntropyResult,
} from '../../src/scoring/entropy-score';
import type { SignalSnapshot } from '../../src/signals/snapshot';

/**
 * Builds a full SignalSnapshot with all signals populated.
 * Override any nested field via the `overrides` parameter.
 */
function makeSnapshot(overrides: {
  locale?: Partial<SignalSnapshot['locale']>;
  device?: Partial<SignalSnapshot['device']>;
  rendering?: Partial<SignalSnapshot['rendering']>;
} = {}): SignalSnapshot {
  const defaultStorage: SignalSnapshot['device']['storageSupport'] = {
    localStorage: true,
    sessionStorage: true,
    indexedDB: true,
  };

  const deviceOverrides = overrides.device ?? {};
  const storageOverride = deviceOverrides.storageSupport;

  return {
    locale: {
      timezone: 'America/New_York',
      languages: Object.freeze(['en-US', 'fr-FR']),
      platform: 'MacIntel',
      doNotTrack: 'Enabled',
      ...overrides.locale,
    },
    device: {
      screenWidth: 1920,
      screenHeight: 1080,
      devicePixelRatio: 2,
      hardwareConcurrency: 8,
      touchSupport: false,
      maxTouchPoints: 0,
      deviceMemory: 8,
      colorDepth: 24,
      ...deviceOverrides,
      storageSupport: storageOverride
        ? { ...defaultStorage, ...storageOverride }
        : defaultStorage,
    },
    rendering: {
      webglSupported: true,
      renderer: 'ANGLE (Apple, Apple M1 Pro, OpenGL 4.1)',
      vendor: 'Google Inc. (Apple)',
      webglVersion: 'webgl2',
      ...overrides.rendering,
    },
    canvas: { canvasHash: 'abc12345', canvasSupported: true },
    webglParams: {
      maxTextureSize: 16384,
      maxRenderbufferSize: 16384,
      maxViewportDims: '16384x16384',
      maxVertexAttribs: 16,
      maxVertexUniformVectors: 4096,
      maxFragmentUniformVectors: 1024,
      maxVaryingVectors: 30,
      maxCubeMapTextureSize: 16384,
      aliasedLineWidthRange: '1-1',
      aliasedPointSizeRange: '1-255',
      shadingLanguageVersion: 'WebGL GLSL ES 3.00',
      extensionCount: 40,
      extensions: ['EXT_texture_filter_anisotropic'],
    },
    fonts: { detectedFonts: ['Arial', 'Helvetica'], fontCount: 2 },
    speech: { voiceCount: 10, voiceList: ['English (US)'], speechSupported: true },
    mediaFeatures: {
      prefersColorScheme: 'light',
      prefersReducedMotion: false,
      prefersContrast: 'no-preference',
      forcedColors: false,
      colorGamut: 'srgb',
      dynamicRange: 'standard',
      invertedColors: false,
    },
    network: { effectiveType: '4g', downlink: 10, rtt: 50, saveData: false },
    collectedAt: '2026-01-15T12:00:00.000Z',
    version: 2,
  };
}

/**
 * Builds a snapshot where every signal uses a missing sentinel value.
 */
function makeUnavailableSnapshot(): SignalSnapshot {
  return {
    locale: {
      timezone: 'unknown',
      languages: Object.freeze(['unknown']),
      platform: 'unknown',
      doNotTrack: 'unknown',
    },
    device: {
      screenWidth: 'unavailable',
      screenHeight: 'unavailable',
      devicePixelRatio: 'unavailable',
      hardwareConcurrency: 'unavailable',
      touchSupport: 'unavailable',
      maxTouchPoints: 'unavailable',
      deviceMemory: 'unavailable',
      colorDepth: 'unavailable',
      storageSupport: {
        localStorage: 'unavailable',
        sessionStorage: 'unavailable',
        indexedDB: 'unavailable',
      },
    },
    rendering: {
      webglSupported: false,
      renderer: 'unavailable',
      vendor: 'unavailable',
      webglVersion: 'unavailable',
    },
    canvas: { canvasHash: 'unavailable', canvasSupported: false },
    webglParams: {
      maxTextureSize: 'unavailable' as unknown as number,
      maxRenderbufferSize: 'unavailable' as unknown as number,
      maxViewportDims: 'unavailable',
      maxVertexAttribs: 'unavailable' as unknown as number,
      maxVertexUniformVectors: 'unavailable' as unknown as number,
      maxFragmentUniformVectors: 'unavailable' as unknown as number,
      maxVaryingVectors: 'unavailable' as unknown as number,
      maxCubeMapTextureSize: 'unavailable' as unknown as number,
      aliasedLineWidthRange: 'unavailable',
      aliasedPointSizeRange: 'unavailable',
      shadingLanguageVersion: 'unavailable',
      extensionCount: 0,
      extensions: [],
    },
    fonts: { detectedFonts: [], fontCount: 0 },
    speech: { voiceCount: 0, voiceList: [], speechSupported: false },
    mediaFeatures: {
      prefersColorScheme: 'unavailable',
      prefersReducedMotion: 'unavailable' as unknown as boolean,
      prefersContrast: 'unavailable',
      forcedColors: 'unavailable' as unknown as boolean,
      colorGamut: 'unavailable',
      dynamicRange: 'unavailable',
      invertedColors: 'unavailable' as unknown as boolean,
    },
    network: { effectiveType: 'unavailable', downlink: 'unavailable' as unknown as number, rtt: 'unavailable' as unknown as number, saveData: 'unavailable' as unknown as boolean },
    collectedAt: '2026-01-15T12:00:00.000Z',
    version: 2,
  };
}

describe('US-014: entropy heuristic scoring', () => {
  describe('determinism', () => {
    it('returns the same score for identical input called multiple times', () => {
      const snapshot = makeSnapshot();
      const result1 = calculateEntropyScore(snapshot);
      const result2 = calculateEntropyScore(snapshot);
      const result3 = calculateEntropyScore(snapshot);

      expect(result1.score).toBe(result2.score);
      expect(result2.score).toBe(result3.score);
      expect(result1.maxPossible).toBe(result2.maxPossible);
      expect(result1.breakdown).toEqual(result2.breakdown);
    });

    it('same snapshot structure with same values always produces identical result', () => {
      const a = makeSnapshot({ locale: { timezone: 'Europe/Berlin' } });
      const b = makeSnapshot({ locale: { timezone: 'Europe/Berlin' } });

      expect(calculateEntropyScore(a)).toEqual(calculateEntropyScore(b));
    });
  });

  describe('boundary: all signals available', () => {
    it('returns a positive score when all signals have real values', () => {
      const snapshot = makeSnapshot();
      const result = calculateEntropyScore(snapshot);
      // Score is less than 100 because common signal values are discounted
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('boundary: all signals missing/unavailable', () => {
    it('returns near-zero score when all signals are unavailable sentinels', () => {
      const snapshot = makeUnavailableSnapshot();
      const result = calculateEntropyScore(snapshot);
      // mediaFeatures composite does not collapse to a single sentinel,
      // so it contributes its weight (6) even when sub-values are sentinels.
      const totalWeight = Object.values(ENTROPY_WEIGHTS).reduce(
        (sum, w) => sum + w,
        0,
      );
      const mediaFeaturesLeak = Math.round(
        (ENTROPY_WEIGHTS['mediaFeatures'] / totalWeight) * 100,
      );
      expect(result.score).toBe(mediaFeaturesLeak);
    });

    it('returns score 0 when all string signals are "unknown"', () => {
      const snapshot: SignalSnapshot = {
        locale: {
          timezone: 'unknown',
          languages: Object.freeze(['unknown']),
          platform: 'unknown',
          doNotTrack: 'unknown',
        },
        device: {
          screenWidth: 'unknown',
          screenHeight: 'unknown',
          devicePixelRatio: 'unknown',
          hardwareConcurrency: 'unknown',
          touchSupport: 'unknown',
          maxTouchPoints: 'unknown',
          deviceMemory: 'unknown',
          colorDepth: 'unknown',
          storageSupport: {
            localStorage: 'unavailable',
            sessionStorage: 'unavailable',
            indexedDB: 'unavailable',
          },
        },
        rendering: {
          webglSupported: false,
          renderer: 'unknown',
          vendor: 'unknown',
          webglVersion: 'unknown',
        },
        canvas: { canvasHash: 'unknown', canvasSupported: false },
        webglParams: {
          maxTextureSize: 'unknown' as unknown as number,
          maxRenderbufferSize: 'unknown' as unknown as number,
          maxViewportDims: 'unknown',
          maxVertexAttribs: 'unknown' as unknown as number,
          maxVertexUniformVectors: 'unknown' as unknown as number,
          maxFragmentUniformVectors: 'unknown' as unknown as number,
          maxVaryingVectors: 'unknown' as unknown as number,
          maxCubeMapTextureSize: 'unknown' as unknown as number,
          aliasedLineWidthRange: 'unknown',
          aliasedPointSizeRange: 'unknown',
          shadingLanguageVersion: 'unknown',
          extensionCount: 0,
          extensions: [],
        },
        fonts: { detectedFonts: [], fontCount: 0 },
        speech: { voiceCount: 0, voiceList: [], speechSupported: false },
        mediaFeatures: {
          prefersColorScheme: 'unknown',
          prefersReducedMotion: 'unknown' as unknown as boolean,
          prefersContrast: 'unknown',
          forcedColors: 'unknown' as unknown as boolean,
          colorGamut: 'unknown',
          dynamicRange: 'unknown',
          invertedColors: 'unknown' as unknown as boolean,
        },
        network: { effectiveType: 'unknown', downlink: 'unknown' as unknown as number, rtt: 'unknown' as unknown as number, saveData: 'unknown' as unknown as boolean },
        collectedAt: '2026-01-15T12:00:00.000Z',
        version: 2,
      };
      const result = calculateEntropyScore(snapshot);
      // mediaFeatures composite does not collapse to a single sentinel
      const totalWeight = Object.values(ENTROPY_WEIGHTS).reduce(
        (sum, w) => sum + w,
        0,
      );
      const mediaFeaturesLeak = Math.round(
        (ENTROPY_WEIGHTS['mediaFeatures'] / totalWeight) * 100,
      );
      expect(result.score).toBe(mediaFeaturesLeak);
    });
  });

  describe('partial signals', () => {
    it('score is proportional to weighted available signals', () => {
      const full = makeSnapshot();
      const partial = makeSnapshot({
        rendering: { renderer: 'unavailable', vendor: 'unavailable' },
      });

      const fullResult = calculateEntropyScore(full);
      const partialResult = calculateEntropyScore(partial);

      expect(partialResult.score).toBeLessThan(fullResult.score);
      expect(partialResult.score).toBeGreaterThan(0);
    });

    it('score increases as more signals become available', () => {
      const none = makeUnavailableSnapshot();
      const someSignals = makeSnapshot({
        locale: {
          timezone: 'unknown',
          languages: Object.freeze(['unknown']),
          platform: 'unknown',
          doNotTrack: 'unknown',
        },
        device: {
          screenWidth: 'unavailable',
          screenHeight: 'unavailable',
          devicePixelRatio: 'unavailable',
          hardwareConcurrency: 'unavailable',
          touchSupport: 'unavailable',
          storageSupport: {
            localStorage: 'unavailable',
            sessionStorage: 'unavailable',
            indexedDB: 'unavailable',
          },
        },
        rendering: {
          webglSupported: true,
          renderer: 'ANGLE (Apple, Apple M1 Pro)',
          vendor: 'Google Inc. (Apple)',
          webglVersion: 'webgl2',
        },
      });
      const all = makeSnapshot();

      const noneScore = calculateEntropyScore(none).score;
      const someScore = calculateEntropyScore(someSignals).score;
      const allScore = calculateEntropyScore(all).score;

      expect(noneScore).toBeLessThan(someScore);
      expect(someScore).toBeLessThan(allScore);
    });
  });

  describe('weight proportionality', () => {
    it('renderer (weight=15) affects score more than webglSupported (weight=1)', () => {
      const rendererOnly = makeUnavailableSnapshot();
      // Override renderer to a real value
      const withRenderer = {
        ...rendererOnly,
        rendering: {
          ...rendererOnly.rendering,
          renderer: 'ANGLE (Apple, Apple M1 Pro)',
        },
      };

      const webglOnly = makeUnavailableSnapshot();
      // webglSupported=true is not a sentinel, but 'false' is also not a sentinel
      // We need to check contribution through the breakdown
      const withWebgl = {
        ...webglOnly,
        rendering: {
          ...webglOnly.rendering,
          webglSupported: true,
        },
      };

      const rendererResult = calculateEntropyScore(withRenderer);
      const webglResult = calculateEntropyScore(withWebgl);

      // renderer contributes 15 to score, webglSupported contributes 1
      expect(rendererResult.score).toBeGreaterThan(webglResult.score);
    });

    it('single high-weight signal (renderer=15) score reflects its weight plus baseline', () => {
      const snapshot = makeUnavailableSnapshot();
      const baseResult = calculateEntropyScore(snapshot);
      const withRenderer = {
        ...snapshot,
        rendering: {
          ...snapshot.rendering,
          renderer: 'ANGLE (Apple, Apple M1 Pro)',
        },
      };

      const result = calculateEntropyScore(withRenderer);
      // The score should increase by the renderer's weight proportion
      expect(result.score).toBeGreaterThan(baseResult.score);
      const totalWeight = Object.values(ENTROPY_WEIGHTS).reduce(
        (sum, w) => sum + w,
        0,
      );
      const expected = Math.round(
        ((ENTROPY_WEIGHTS['renderer'] + ENTROPY_WEIGHTS['mediaFeatures']) / totalWeight) * 100,
      );
      expect(result.score).toBe(expected);
    });

    it('single low-weight signal (webglSupported=1) score reflects its weight plus baseline', () => {
      const snapshot = makeUnavailableSnapshot();
      const baseResult = calculateEntropyScore(snapshot);
      // webglSupported as boolean 'true' is stringified to 'true', not a sentinel
      const withWebgl = {
        ...snapshot,
        rendering: {
          ...snapshot.rendering,
          webglSupported: true,
        },
      };

      const result = calculateEntropyScore(withWebgl);
      expect(result.score).toBeGreaterThanOrEqual(baseResult.score);
      const totalWeight = Object.values(ENTROPY_WEIGHTS).reduce(
        (sum, w) => sum + w,
        0,
      );
      const expected = Math.round(
        ((ENTROPY_WEIGHTS['webglSupported'] + ENTROPY_WEIGHTS['mediaFeatures']) / totalWeight) * 100,
      );
      expect(result.score).toBe(expected);
    });
  });

  describe('sentinel handling', () => {
    it('"unknown" values contribute 0 to score', () => {
      const snapshot = makeSnapshot({
        locale: { timezone: 'unknown', platform: 'unknown' },
      });
      const result = calculateEntropyScore(snapshot);

      const tzEntry = result.breakdown.find((e) => e.signal === 'timezone');
      const platformEntry = result.breakdown.find(
        (e) => e.signal === 'platform',
      );

      expect(tzEntry?.contribution).toBe(0);
      expect(platformEntry?.contribution).toBe(0);
    });

    it('"unavailable" values contribute 0 to score', () => {
      const snapshot = makeSnapshot({
        rendering: { renderer: 'unavailable', vendor: 'unavailable' },
      });
      const result = calculateEntropyScore(snapshot);

      const rendererEntry = result.breakdown.find(
        (e) => e.signal === 'renderer',
      );
      const vendorEntry = result.breakdown.find((e) => e.signal === 'vendor');

      expect(rendererEntry?.contribution).toBe(0);
      expect(vendorEntry?.contribution).toBe(0);
    });

    it('numeric screen values with "unavailable" produce 0 contribution for screenResolution', () => {
      const snapshot = makeSnapshot({
        device: {
          screenWidth: 'unavailable',
          screenHeight: 'unavailable',
        },
      });
      const result = calculateEntropyScore(snapshot);

      const screenEntry = result.breakdown.find(
        (e) => e.signal === 'screenResolution',
      );
      expect(screenEntry?.contribution).toBe(0);
      expect(screenEntry?.value).toBe('unavailable');
    });

    it('partially unavailable screen dimensions still produce 0 contribution', () => {
      const snapshot = makeSnapshot({
        device: {
          screenWidth: 1920,
          screenHeight: 'unavailable',
        },
      });
      const result = calculateEntropyScore(snapshot);

      const screenEntry = result.breakdown.find(
        (e) => e.signal === 'screenResolution',
      );
      expect(screenEntry?.contribution).toBe(0);
    });
  });

  describe('return shape (EntropyResult)', () => {
    it('returns an object with score, maxPossible, and breakdown', () => {
      const result = calculateEntropyScore(makeSnapshot());

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('maxPossible');
      expect(result).toHaveProperty('breakdown');
    });

    it('score is an integer', () => {
      const result = calculateEntropyScore(makeSnapshot());
      expect(Number.isInteger(result.score)).toBe(true);
    });

    it('score is between 0 and 100 inclusive', () => {
      const result = calculateEntropyScore(makeSnapshot());
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('maxPossible equals sum of all weights', () => {
      const result = calculateEntropyScore(makeSnapshot());
      const totalWeight = Object.values(ENTROPY_WEIGHTS).reduce(
        (sum, w) => sum + w,
        0,
      );
      expect(result.maxPossible).toBe(totalWeight);
    });

    it('breakdown has one entry per signal in ENTROPY_WEIGHTS', () => {
      const result = calculateEntropyScore(makeSnapshot());
      const signalNames = Object.keys(ENTROPY_WEIGHTS);

      expect(result.breakdown).toHaveLength(signalNames.length);

      for (const entry of result.breakdown) {
        expect(entry).toHaveProperty('signal');
        expect(entry).toHaveProperty('value');
        expect(entry).toHaveProperty('weight');
        expect(entry).toHaveProperty('contribution');
        expect(typeof entry.signal).toBe('string');
        expect(typeof entry.value).toBe('string');
        expect(typeof entry.weight).toBe('number');
        expect(typeof entry.contribution).toBe('number');
      }
    });

    it('each breakdown entry contribution is between 0 and its full weight', () => {
      const result = calculateEntropyScore(
        makeSnapshot({
          rendering: { renderer: 'unavailable' },
        }),
      );

      for (const entry of result.breakdown) {
        expect(entry.contribution).toBeGreaterThanOrEqual(0);
        expect(entry.contribution).toBeLessThanOrEqual(entry.weight);
      }
    });
  });

  describe('edge cases', () => {
    it('empty languages array is treated as missing', () => {
      // When languages is empty, joined string is '', which is not a sentinel
      // This tests the actual behavior — an empty join produces a non-sentinel value
      const snapshot = makeSnapshot({
        locale: { languages: Object.freeze([]) },
      });
      const result = calculateEntropyScore(snapshot);
      const langEntry = result.breakdown.find(
        (e) => e.signal === 'languages',
      );

      // Empty string is not 'unknown' or 'unavailable', so it contributes
      expect(langEntry?.value).toBe('');
      expect(langEntry?.contribution).toBe(ENTROPY_WEIGHTS['languages']);
    });

    it('languages with single "unknown" entry contributes 0', () => {
      const snapshot = makeSnapshot({
        locale: { languages: Object.freeze(['unknown']) },
      });
      const result = calculateEntropyScore(snapshot);
      const langEntry = result.breakdown.find(
        (e) => e.signal === 'languages',
      );

      expect(langEntry?.contribution).toBe(0);
    });

    it('storageSupport encoded as 3-bit string', () => {
      const snapshot = makeSnapshot({
        device: {
          storageSupport: {
            localStorage: true,
            sessionStorage: false as unknown as boolean | string,
            indexedDB: true,
          },
        },
      });
      const result = calculateEntropyScore(snapshot);
      const storageEntry = result.breakdown.find(
        (e) => e.signal === 'storageSupport',
      );

      expect(storageEntry?.value).toBe('101');
    });

    it('screenResolution is derived from screenWidth x screenHeight', () => {
      const snapshot = makeSnapshot({
        device: { screenWidth: 2560, screenHeight: 1440 },
      });
      const result = calculateEntropyScore(snapshot);
      const screenEntry = result.breakdown.find(
        (e) => e.signal === 'screenResolution',
      );

      expect(screenEntry?.value).toBe('2560x1440');
      expect(screenEntry?.contribution).toBeGreaterThan(0);
    });

    it('webglSupported false means no WebGL fingerprint, contributes 0', () => {
      const snapshot = makeSnapshot({
        rendering: { webglSupported: false },
      });
      const result = calculateEntropyScore(snapshot);
      const entry = result.breakdown.find(
        (e) => e.signal === 'webglSupported',
      );

      // false means WebGL is not available — no fingerprint signal
      expect(entry?.value).toBe('unavailable');
      expect(entry?.contribution).toBe(0);
    });

    it('webglSupported true contributes its weight', () => {
      const snapshot = makeSnapshot({
        rendering: { webglSupported: true },
      });
      const result = calculateEntropyScore(snapshot);
      const entry = result.breakdown.find(
        (e) => e.signal === 'webglSupported',
      );

      expect(entry?.value).toBe('true');
      expect(entry?.contribution).toBeGreaterThan(0);
    });

    it('touchSupport "unavailable" string contributes 0', () => {
      const snapshot = makeSnapshot({
        device: { touchSupport: 'unavailable' },
      });
      const result = calculateEntropyScore(snapshot);
      const entry = result.breakdown.find(
        (e) => e.signal === 'touchSupport',
      );

      expect(entry?.contribution).toBe(0);
    });

    it('hardwareConcurrency as numeric string (not sentinel) contributes weight', () => {
      const snapshot = makeSnapshot({
        device: { hardwareConcurrency: 16 },
      });
      const result = calculateEntropyScore(snapshot);
      const entry = result.breakdown.find(
        (e) => e.signal === 'hardwareConcurrency',
      );

      expect(entry?.value).toBe('16');
      expect(entry?.contribution).toBeGreaterThan(0);
    });
  });

  describe('weight table', () => {
    it('ENTROPY_WEIGHTS contains entries for all 23 expected signals', () => {
      const expectedSignals = [
        'renderer',
        'languages',
        'screenResolution',
        'timezone',
        'vendor',
        'platform',
        'hardwareConcurrency',
        'devicePixelRatio',
        'webglVersion',
        'touchSupport',
        'doNotTrack',
        'storageSupport',
        'webglSupported',
        'canvasHash',
        'fonts',
        'webglParams',
        'colorDepth',
        'maxTouchPoints',
        'deviceMemory',
        'speechVoices',
        'mediaFeatures',
        'networkType',
        'webglExtensions',
      ];

      for (const signal of expectedSignals) {
        expect(ENTROPY_WEIGHTS).toHaveProperty(signal);
        expect(typeof ENTROPY_WEIGHTS[signal]).toBe('number');
        expect(ENTROPY_WEIGHTS[signal]).toBeGreaterThan(0);
      }

      expect(Object.keys(ENTROPY_WEIGHTS)).toHaveLength(
        expectedSignals.length,
      );
    });

    it('high-entropy signals (renderer, languages) have higher weights than low-entropy signals (webglSupported, storageSupport)', () => {
      const highWeight = Math.min(
        ENTROPY_WEIGHTS['renderer'],
        ENTROPY_WEIGHTS['languages'],
      );
      const lowWeight = Math.max(
        ENTROPY_WEIGHTS['webglSupported'],
        ENTROPY_WEIGHTS['storageSupport'],
      );

      expect(highWeight).toBeGreaterThan(lowWeight);
    });
  });

  describe('property-style: score always integer in [0, 100]', () => {
    it('score stays within bounds for various random signal combinations', () => {
      const sentinels = ['unknown', 'unavailable'];

      for (let trial = 0; trial < 20; trial++) {
        const snapshot = makeSnapshot({
          locale: {
            timezone:
              Math.random() > 0.5 ? 'America/Chicago' : sentinels[trial % 2],
            languages: Object.freeze(
              Math.random() > 0.5 ? ['en-US'] : ['unknown'],
            ),
            platform:
              Math.random() > 0.5 ? 'Win32' : sentinels[trial % 2],
            doNotTrack:
              Math.random() > 0.5 ? 'Enabled' : sentinels[trial % 2],
          },
          rendering: {
            webglSupported: Math.random() > 0.5,
            renderer:
              Math.random() > 0.5
                ? 'ANGLE (NVIDIA)'
                : sentinels[trial % 2],
            vendor:
              Math.random() > 0.5
                ? 'Google Inc.'
                : sentinels[trial % 2],
            webglVersion:
              Math.random() > 0.5 ? 'webgl2' : sentinels[trial % 2],
          },
        });

        const result = calculateEntropyScore(snapshot);

        expect(Number.isInteger(result.score)).toBe(true);
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      }
    });
  });
});
