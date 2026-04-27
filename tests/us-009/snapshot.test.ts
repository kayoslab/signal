import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  collectSnapshot,
  type SignalSnapshot,
} from '../../src/signals/snapshot';

// ---------------------------------------------------------------------------
// Helpers: mock browser environment for a complete happy-path snapshot
// ---------------------------------------------------------------------------

interface MockGLContext {
  getExtension: ReturnType<typeof vi.fn>;
  getParameter: ReturnType<typeof vi.fn>;
}

function setupBrowserEnv(overrides: {
  timezone?: string;
  languages?: string[];
  platform?: string;
  doNotTrack?: string | null;
  screenWidth?: number;
  screenHeight?: number;
  devicePixelRatio?: number;
  hardwareConcurrency?: number;
  maxTouchPoints?: number;
  ontouchstart?: boolean;
  localStorage?: boolean;
  sessionStorage?: boolean;
  indexedDB?: boolean;
  webglVersion?: 'webgl2' | 'webgl' | null;
  renderer?: string;
  vendor?: string;
} = {}) {
  const {
    timezone = 'America/New_York',
    languages = ['en-US', 'en'],
    platform = 'MacIntel',
    doNotTrack = '1',
    screenWidth = 1920,
    screenHeight = 1080,
    devicePixelRatio = 2,
    hardwareConcurrency = 8,
    maxTouchPoints = 0,
    ontouchstart = false,
    localStorage: hasLocalStorage = true,
    sessionStorage: hasSessionStorage = true,
    indexedDB: hasIndexedDB = true,
    webglVersion = 'webgl2',
    renderer = 'ANGLE (Apple, Apple M1 Pro)',
    vendor = 'Google Inc. (Apple)',
  } = overrides;

  // Navigator
  vi.stubGlobal('navigator', {
    languages: Object.freeze(languages),
    language: languages[0],
    platform,
    doNotTrack,
    hardwareConcurrency,
    maxTouchPoints,
  });

  // Intl
  vi.stubGlobal('Intl', {
    DateTimeFormat: () => ({
      resolvedOptions: () => ({ timeZone: timezone }),
    }),
  });

  // Window + screen + storage
  const windowObj: Record<string, unknown> = {
    screen: { width: screenWidth, height: screenHeight },
    devicePixelRatio,
  };

  if (ontouchstart) {
    windowObj.ontouchstart = null;
  }

  if (hasLocalStorage) windowObj.localStorage = {};
  if (hasSessionStorage) windowObj.sessionStorage = {};
  if (hasIndexedDB) windowObj.indexedDB = {};

  vi.stubGlobal('window', windowObj);

  // Document + WebGL
  const gl: MockGLContext | null = webglVersion
    ? {
        getExtension: vi.fn((name: string) => {
          if (name === 'WEBGL_debug_renderer_info') {
            return {
              UNMASKED_RENDERER_WEBGL: 0x9246,
              UNMASKED_VENDOR_WEBGL: 0x9245,
            };
          }
          if (name === 'WEBGL_lose_context') {
            return { loseContext: vi.fn() };
          }
          return null;
        }),
        getParameter: vi.fn((param: number) => {
          if (param === 0x9246) return renderer;
          if (param === 0x9245) return vendor;
          return null;
        }),
      }
    : null;

  vi.stubGlobal('document', {
    createElement: vi.fn((tag: string) => {
      if (tag === 'canvas') {
        return {
          getContext: vi.fn((type: string) => {
            if (webglVersion && type === webglVersion) return gl;
            if (webglVersion === 'webgl' && type === 'webgl2') return null;
            return null;
          }),
        };
      }
      return {};
    }),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('US-009: collectSnapshot', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // -----------------------------------------------------------------------
  // Return shape and required fields
  // -----------------------------------------------------------------------
  describe('return shape and required fields', () => {
    beforeEach(() => setupBrowserEnv());

    it('returns an object with all required top-level keys', () => {
      const snapshot = collectSnapshot();

      expect(snapshot).toHaveProperty('locale');
      expect(snapshot).toHaveProperty('device');
      expect(snapshot).toHaveProperty('rendering');
      expect(snapshot).toHaveProperty('canvas');
      expect(snapshot).toHaveProperty('webglParams');
      expect(snapshot).toHaveProperty('fonts');
      expect(snapshot).toHaveProperty('speech');
      expect(snapshot).toHaveProperty('mediaFeatures');
      expect(snapshot).toHaveProperty('network');
      expect(snapshot).toHaveProperty('collectedAt');
      expect(snapshot).toHaveProperty('version');
    });

    it('returns no extra top-level keys beyond the interface', () => {
      const snapshot = collectSnapshot();
      const expectedKeys = [
        'locale',
        'device',
        'rendering',
        'canvas',
        'webglParams',
        'fonts',
        'speech',
        'mediaFeatures',
        'network',
        'collectedAt',
        'version',
      ];

      expect(Object.keys(snapshot).sort()).toEqual(expectedKeys.sort());
    });

    it('locale sub-object contains all expected keys', () => {
      const snapshot = collectSnapshot();
      const localeKeys = ['timezone', 'languages', 'platform', 'doNotTrack'];

      expect(Object.keys(snapshot.locale).sort()).toEqual(localeKeys.sort());
    });

    it('device sub-object contains all expected keys', () => {
      const snapshot = collectSnapshot();
      const deviceKeys = [
        'screenWidth',
        'screenHeight',
        'devicePixelRatio',
        'hardwareConcurrency',
        'touchSupport',
        'maxTouchPoints',
        'deviceMemory',
        'colorDepth',
        'storageSupport',
      ];

      expect(Object.keys(snapshot.device).sort()).toEqual(deviceKeys.sort());
    });

    it('rendering sub-object contains all expected keys', () => {
      const snapshot = collectSnapshot();
      const renderingKeys = [
        'webglSupported',
        'renderer',
        'vendor',
        'webglVersion',
      ];

      expect(Object.keys(snapshot.rendering).sort()).toEqual(
        renderingKeys.sort()
      );
    });
  });

  // -----------------------------------------------------------------------
  // collectedAt timestamp
  // -----------------------------------------------------------------------
  describe('collectedAt timestamp', () => {
    beforeEach(() => setupBrowserEnv());

    it('is a valid ISO 8601 timestamp', () => {
      const snapshot = collectSnapshot();
      const parsed = new Date(snapshot.collectedAt);

      expect(parsed.toISOString()).toBe(snapshot.collectedAt);
    });

    it('is within a reasonable time window of now', () => {
      const before = new Date().toISOString();
      const snapshot = collectSnapshot();
      const after = new Date().toISOString();

      expect(snapshot.collectedAt >= before).toBe(true);
      expect(snapshot.collectedAt <= after).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Version field
  // -----------------------------------------------------------------------
  describe('version field', () => {
    beforeEach(() => setupBrowserEnv());

    it('equals 2', () => {
      const snapshot = collectSnapshot();
      expect(snapshot.version).toBe(2);
    });

    it('is a number', () => {
      const snapshot = collectSnapshot();
      expect(typeof snapshot.version).toBe('number');
    });
  });

  // -----------------------------------------------------------------------
  // Immutability (Object.freeze)
  // -----------------------------------------------------------------------
  describe('immutability', () => {
    beforeEach(() => setupBrowserEnv());

    it('returns a frozen snapshot object', () => {
      const snapshot = collectSnapshot();
      expect(Object.isFrozen(snapshot)).toBe(true);
    });

    it('prevents mutation of top-level properties', () => {
      const snapshot = collectSnapshot();

      expect(() => {
        (snapshot as unknown as Record<string, unknown>).version = 999;
      }).toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // Independent snapshots
  // -----------------------------------------------------------------------
  describe('independent snapshots', () => {
    beforeEach(() => setupBrowserEnv());

    it('two consecutive calls return different object references', () => {
      const a = collectSnapshot();
      const b = collectSnapshot();

      expect(a).not.toBe(b);
    });

    it('two consecutive calls produce structurally equivalent snapshots', () => {
      const a = collectSnapshot();
      const b = collectSnapshot();

      // Same shape and values (except possibly collectedAt)
      expect(a.version).toBe(b.version);
      expect(a.locale).toEqual(b.locale);
      expect(a.device).toEqual(b.device);
      expect(a.rendering).toEqual(b.rendering);
    });
  });

  // -----------------------------------------------------------------------
  // Happy path: populated values flow through
  // -----------------------------------------------------------------------
  describe('happy path: populated values flow through', () => {
    it('locale signals are populated from browser APIs', () => {
      setupBrowserEnv({
        timezone: 'Europe/Berlin',
        languages: ['de-DE', 'en'],
        platform: 'Linux x86_64',
        doNotTrack: '1',
      });

      const snapshot = collectSnapshot();

      expect(snapshot.locale.timezone).toBe('Europe/Berlin');
      expect(snapshot.locale.languages).toEqual(['de-DE', 'en']);
      expect(snapshot.locale.platform).toBe('Linux x86_64');
      expect(snapshot.locale.doNotTrack).toBe('Enabled');
    });

    it('device signals are populated from browser APIs', () => {
      setupBrowserEnv({
        screenWidth: 2560,
        screenHeight: 1440,
        devicePixelRatio: 2,
        hardwareConcurrency: 16,
      });

      const snapshot = collectSnapshot();

      expect(snapshot.device.screenWidth).toBe(2560);
      expect(snapshot.device.screenHeight).toBe(1440);
      expect(snapshot.device.devicePixelRatio).toBe(2);
      expect(snapshot.device.hardwareConcurrency).toBe(16);
    });

    it('rendering signals are populated from WebGL context', () => {
      setupBrowserEnv({
        webglVersion: 'webgl2',
        renderer: 'NVIDIA GeForce RTX 3080',
        vendor: 'NVIDIA Corporation',
      });

      const snapshot = collectSnapshot();

      expect(snapshot.rendering.webglSupported).toBe(true);
      expect(snapshot.rendering.renderer).toBe('NVIDIA GeForce RTX 3080');
      expect(snapshot.rendering.vendor).toBe('NVIDIA Corporation');
      expect(snapshot.rendering.webglVersion).toBe('webgl2');
    });
  });

  // -----------------------------------------------------------------------
  // Missing-value consistency
  // -----------------------------------------------------------------------
  describe('missing-value consistency', () => {
    it('uses only canonical sentinels when all browser APIs are absent', () => {
      // Remove all browser globals to simulate a bare environment
      const originalNav = globalThis.navigator;
      const originalWindow = globalThis.window;
      const originalDocument = globalThis.document;
      const originalIntl = globalThis.Intl;

      // @ts-expect-error -- intentionally removing for test
      delete globalThis.navigator;
      // @ts-expect-error -- intentionally removing for test
      delete globalThis.window;
      // @ts-expect-error -- intentionally removing for test
      delete globalThis.document;
      // @ts-expect-error -- intentionally removing for test
      delete globalThis.Intl;

      try {
        const snapshot = collectSnapshot();

        // Collect all string values recursively
        const allStringValues = collectStringValues(snapshot);

        // No value should be 'unspecified', undefined, or null
        for (const { path, value } of allStringValues) {
          expect(value, `${path} should not be 'unspecified'`).not.toBe(
            'unspecified'
          );
          expect(value, `${path} should be a string`).toBeDefined();
        }

        // All fallback strings should be either 'unknown' or 'unavailable'
        const fallbackValues = allStringValues.filter(
          ({ value }) =>
            value === 'unknown' || value === 'unavailable'
        );
        expect(fallbackValues.length).toBeGreaterThan(0);

        for (const { value } of fallbackValues) {
          expect(['unknown', 'unavailable']).toContain(value);
        }
      } finally {
        globalThis.navigator = originalNav;
        globalThis.window = originalWindow;
        globalThis.document = originalDocument;
        globalThis.Intl = originalIntl;
      }
    });

    it('contains no undefined values in the snapshot', () => {
      setupBrowserEnv();
      const snapshot = collectSnapshot();
      const allValues = collectAllValues(snapshot);

      for (const { path, value } of allValues) {
        expect(value, `${path} should not be undefined`).not.toBeUndefined();
      }
    });

    it('contains no null values in the snapshot', () => {
      setupBrowserEnv();
      const snapshot = collectSnapshot();
      const allValues = collectAllValues(snapshot);

      for (const { path, value } of allValues) {
        expect(value, `${path} should not be null`).not.toBeNull();
      }
    });
  });

  // -----------------------------------------------------------------------
  // Does not throw
  // -----------------------------------------------------------------------
  describe('does not throw', () => {
    it('never throws regardless of environment', () => {
      expect(() => collectSnapshot()).not.toThrow();
    });

    it('does not throw when only partial browser APIs exist', () => {
      vi.stubGlobal('navigator', { language: 'en' });

      expect(() => collectSnapshot()).not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // Type export
  // -----------------------------------------------------------------------
  describe('type exports', () => {
    it('SignalSnapshot type is importable and matches return type', () => {
      setupBrowserEnv();
      const typeCheck: SignalSnapshot = collectSnapshot();
      expect(typeCheck).toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// Utility: recursively collect all string values from an object
// ---------------------------------------------------------------------------
function collectStringValues(
  obj: unknown,
  path = ''
): Array<{ path: string; value: string }> {
  const results: Array<{ path: string; value: string }> = [];

  if (typeof obj === 'string') {
    results.push({ path, value: obj });
  } else if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      results.push(...collectStringValues(obj[i], `${path}[${i}]`));
    }
  } else if (obj !== null && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      results.push(
        ...collectStringValues(value, path ? `${path}.${key}` : key)
      );
    }
  }

  return results;
}

function collectAllValues(
  obj: unknown,
  path = ''
): Array<{ path: string; value: unknown }> {
  const results: Array<{ path: string; value: unknown }> = [];

  if (obj === null || typeof obj !== 'object') {
    results.push({ path, value: obj });
  } else if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      results.push(...collectAllValues(obj[i], `${path}[${i}]`));
    }
  } else {
    for (const [key, value] of Object.entries(obj)) {
      results.push(
        ...collectAllValues(value, path ? `${path}.${key}` : key)
      );
    }
  }

  return results;
}
