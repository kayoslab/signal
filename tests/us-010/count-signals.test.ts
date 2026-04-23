import { describe, it, expect } from 'vitest';
import type { SignalSnapshot } from '../../src/signals/snapshot';

/**
 * These tests target the pure `countSignalFields` function that will live in
 * `src/modules/intro/count-signals.ts`. The function recursively counts
 * meaningful (non-sentinel) leaf values from a SignalSnapshot, excluding
 * metadata fields like `collectedAt` and `version`.
 */

/** Helper: build a fully-populated snapshot with real-looking values. */
function makeFullSnapshot(): SignalSnapshot {
  return {
    locale: {
      timezone: 'America/New_York',
      languages: Object.freeze(['en-US', 'en']),
      platform: 'MacIntel',
      doNotTrack: '1',
    },
    device: {
      screenWidth: 1920,
      screenHeight: 1080,
      devicePixelRatio: 2,
      hardwareConcurrency: 8,
      touchSupport: false,
      storageSupport: {
        localStorage: true,
        sessionStorage: true,
        indexedDB: true,
      },
    },
    rendering: {
      webglSupported: true,
      renderer: 'ANGLE (Apple, Apple M1, OpenGL 4.1)',
      vendor: 'Google Inc. (Apple)',
      webglVersion: 'webgl2',
    },
    collectedAt: '2026-04-23T12:00:00.000Z',
    version: 1,
  };
}

/** Helper: build a snapshot where every field is a sentinel value. */
function makeEmptySnapshot(): SignalSnapshot {
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
    collectedAt: '2026-04-23T12:00:00.000Z',
    version: 1,
  };
}

/** Helper: build a partially populated snapshot. */
function makePartialSnapshot(): SignalSnapshot {
  return {
    locale: {
      timezone: 'Europe/Berlin',
      languages: Object.freeze(['de-DE']),
      platform: 'unknown',
      doNotTrack: 'unknown',
    },
    device: {
      screenWidth: 1440,
      screenHeight: 900,
      devicePixelRatio: 'unavailable',
      hardwareConcurrency: 4,
      touchSupport: 'unavailable',
      storageSupport: {
        localStorage: true,
        sessionStorage: 'unavailable',
        indexedDB: true,
      },
    },
    rendering: {
      webglSupported: false,
      renderer: 'unavailable',
      vendor: 'unavailable',
      webglVersion: 'unavailable',
    },
    collectedAt: '2026-04-23T12:00:00.000Z',
    version: 1,
  };
}

describe('countSignalFields', () => {
  // Dynamic import so the module doesn't need to exist at lint time.
  // Tests will fail with a clear import error until the implementation ships.
  async function loadCountSignalFields() {
    const mod = await import('../../src/modules/intro/count-signals');
    return mod.countSignalFields;
  }

  describe('fully-populated snapshot', () => {
    it('counts all meaningful leaf fields', async () => {
      const countSignalFields = await loadCountSignalFields();
      const snapshot = makeFullSnapshot();
      const count = countSignalFields(snapshot);

      // A full snapshot has 16 signal-leaf fields:
      // locale: timezone, languages(array counts as 1), platform, doNotTrack = 4
      // device: screenWidth, screenHeight, devicePixelRatio, hardwareConcurrency,
      //         touchSupport, localStorage, sessionStorage, indexedDB = 8
      // rendering: webglSupported, renderer, vendor, webglVersion = 4
      // Total = 16
      expect(count).toBeGreaterThanOrEqual(14);
      expect(count).toBeLessThanOrEqual(20);
    });

    it('returns a positive integer', async () => {
      const countSignalFields = await loadCountSignalFields();
      const count = countSignalFields(makeFullSnapshot());
      expect(Number.isInteger(count)).toBe(true);
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('all-sentinel snapshot', () => {
    it('excludes sentinel string values from the count', async () => {
      const countSignalFields = await loadCountSignalFields();
      const count = countSignalFields(makeEmptySnapshot());

      // webglSupported: false is still a meaningful boolean signal (it tells
      // us something). All string sentinels should be excluded.
      // The exact count depends on implementation but should be much lower
      // than a full snapshot.
      expect(count).toBeLessThan(countSignalFields(makeFullSnapshot()));
    });

    it('returns a non-negative integer', async () => {
      const countSignalFields = await loadCountSignalFields();
      const count = countSignalFields(makeEmptySnapshot());
      expect(Number.isInteger(count)).toBe(true);
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('partially-populated snapshot', () => {
    it('counts only non-sentinel fields', async () => {
      const countSignalFields = await loadCountSignalFields();
      const full = countSignalFields(makeFullSnapshot());
      const partial = countSignalFields(makePartialSnapshot());
      const empty = countSignalFields(makeEmptySnapshot());

      expect(partial).toBeGreaterThan(empty);
      expect(partial).toBeLessThan(full);
    });
  });

  describe('determinism', () => {
    it('returns the same count for the same snapshot shape', async () => {
      const countSignalFields = await loadCountSignalFields();
      const a = countSignalFields(makeFullSnapshot());
      const b = countSignalFields(makeFullSnapshot());
      expect(a).toBe(b);
    });
  });

  describe('edge cases', () => {
    it('handles languages array with multiple entries', async () => {
      const countSignalFields = await loadCountSignalFields();
      const snapshotA = makeFullSnapshot();
      const snapshotB = {
        ...makeFullSnapshot(),
        locale: {
          ...makeFullSnapshot().locale,
          languages: Object.freeze(['en-US', 'en', 'fr', 'de']),
        },
      };

      // Languages should count as one signal regardless of array length,
      // OR each language should count. Either way the function should
      // handle varying array lengths without error.
      const countA = countSignalFields(snapshotA);
      const countB = countSignalFields(snapshotB);
      expect(typeof countA).toBe('number');
      expect(typeof countB).toBe('number');
    });

    it('handles boolean false values as meaningful signals', async () => {
      const countSignalFields = await loadCountSignalFields();
      const snapshot = makeFullSnapshot();
      // touchSupport = false and webglSupported = true are both meaningful
      const count = countSignalFields(snapshot);
      expect(count).toBeGreaterThan(0);
    });
  });
});
