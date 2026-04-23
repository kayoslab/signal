import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  collectDeviceCapabilitySignals,
  type DeviceCapabilitySignals,
} from '../../src/signals/device-signals';

describe('US-007: collectDeviceCapabilitySignals', () => {
  describe('return shape and required fields', () => {
    it('returns an object with all required keys', () => {
      const signals = collectDeviceCapabilitySignals();

      expect(signals).toHaveProperty('screenWidth');
      expect(signals).toHaveProperty('screenHeight');
      expect(signals).toHaveProperty('devicePixelRatio');
      expect(signals).toHaveProperty('hardwareConcurrency');
      expect(signals).toHaveProperty('touchSupport');
      expect(signals).toHaveProperty('storageSupport');
    });

    it('returns storageSupport with all required sub-keys', () => {
      const signals = collectDeviceCapabilitySignals();

      expect(signals.storageSupport).toHaveProperty('localStorage');
      expect(signals.storageSupport).toHaveProperty('sessionStorage');
      expect(signals.storageSupport).toHaveProperty('indexedDB');
    });

    it('returns no extra top-level keys beyond the interface', () => {
      const signals = collectDeviceCapabilitySignals();
      const expectedKeys = [
        'screenWidth',
        'screenHeight',
        'devicePixelRatio',
        'hardwareConcurrency',
        'touchSupport',
        'storageSupport',
      ];

      expect(Object.keys(signals).sort()).toEqual(expectedKeys.sort());
    });
  });

  describe('screen dimensions', () => {
    it('collects screen width as a number when available', () => {
      const original = globalThis.window;
      vi.stubGlobal('window', {
        ...original,
        screen: { width: 1920, height: 1080 },
      });

      const signals = collectDeviceCapabilitySignals();
      expect(typeof signals.screenWidth).toBe('number');
      expect(signals.screenWidth).toBe(1920);

      vi.unstubAllGlobals();
    });

    it('collects screen height as a number when available', () => {
      const original = globalThis.window;
      vi.stubGlobal('window', {
        ...original,
        screen: { width: 1920, height: 1080 },
      });

      const signals = collectDeviceCapabilitySignals();
      expect(typeof signals.screenHeight).toBe('number');
      expect(signals.screenHeight).toBe(1080);

      vi.unstubAllGlobals();
    });

    it('returns "unavailable" for screen width when window.screen is missing', () => {
      vi.stubGlobal('window', {});

      const signals = collectDeviceCapabilitySignals();
      expect(signals.screenWidth).toBe('unavailable');

      vi.unstubAllGlobals();
    });

    it('returns "unavailable" for screen height when window.screen is missing', () => {
      vi.stubGlobal('window', {});

      const signals = collectDeviceCapabilitySignals();
      expect(signals.screenHeight).toBe('unavailable');

      vi.unstubAllGlobals();
    });
  });

  describe('device pixel ratio', () => {
    it('collects devicePixelRatio as a number when available', () => {
      vi.stubGlobal('window', { devicePixelRatio: 2, screen: {} });

      const signals = collectDeviceCapabilitySignals();
      expect(typeof signals.devicePixelRatio).toBe('number');
      expect(signals.devicePixelRatio).toBe(2);

      vi.unstubAllGlobals();
    });

    it('returns "unavailable" when devicePixelRatio is not present', () => {
      vi.stubGlobal('window', { screen: {} });

      const signals = collectDeviceCapabilitySignals();
      expect(signals.devicePixelRatio).toBe('unavailable');

      vi.unstubAllGlobals();
    });
  });

  describe('hardware concurrency', () => {
    it('collects hardwareConcurrency as a number when available', () => {
      vi.stubGlobal('navigator', { hardwareConcurrency: 8 });

      const signals = collectDeviceCapabilitySignals();
      expect(typeof signals.hardwareConcurrency).toBe('number');
      expect(signals.hardwareConcurrency).toBe(8);

      vi.unstubAllGlobals();
    });

    it('returns "unavailable" when hardwareConcurrency is not present', () => {
      vi.stubGlobal('navigator', {});

      const signals = collectDeviceCapabilitySignals();
      expect(signals.hardwareConcurrency).toBe('unavailable');

      vi.unstubAllGlobals();
    });
  });

  describe('touch support', () => {
    it('detects touch support via ontouchstart', () => {
      vi.stubGlobal('window', { ontouchstart: null, screen: {} });
      vi.stubGlobal('navigator', { maxTouchPoints: 0 });

      const signals = collectDeviceCapabilitySignals();
      expect(signals.touchSupport).toBe(true);

      vi.unstubAllGlobals();
    });

    it('detects touch support via maxTouchPoints', () => {
      vi.stubGlobal('window', { screen: {} });
      vi.stubGlobal('navigator', { maxTouchPoints: 5 });

      const signals = collectDeviceCapabilitySignals();
      expect(signals.touchSupport).toBe(true);

      vi.unstubAllGlobals();
    });

    it('returns false when no touch support is detected', () => {
      vi.stubGlobal('window', { screen: {} });
      vi.stubGlobal('navigator', { maxTouchPoints: 0 });

      const signals = collectDeviceCapabilitySignals();
      expect(signals.touchSupport).toBe(false);

      vi.unstubAllGlobals();
    });

    it('returns "unavailable" when touch detection APIs are missing', () => {
      vi.stubGlobal('window', { screen: {} });
      vi.stubGlobal('navigator', {});

      const signals = collectDeviceCapabilitySignals();
      expect(signals.touchSupport).toBe('unavailable');

      vi.unstubAllGlobals();
    });
  });

  describe('storage support', () => {
    it('detects localStorage as available', () => {
      vi.stubGlobal('window', {
        screen: {},
        localStorage: {},
      });

      const signals = collectDeviceCapabilitySignals();
      expect(signals.storageSupport.localStorage).toBe(true);

      vi.unstubAllGlobals();
    });

    it('detects sessionStorage as available', () => {
      vi.stubGlobal('window', {
        screen: {},
        sessionStorage: {},
      });

      const signals = collectDeviceCapabilitySignals();
      expect(signals.storageSupport.sessionStorage).toBe(true);

      vi.unstubAllGlobals();
    });

    it('detects indexedDB as available', () => {
      vi.stubGlobal('window', {
        screen: {},
        indexedDB: {},
      });

      const signals = collectDeviceCapabilitySignals();
      expect(signals.storageSupport.indexedDB).toBe(true);

      vi.unstubAllGlobals();
    });

    it('returns "unavailable" for localStorage when it throws (private browsing)', () => {
      const win = { screen: {} };
      Object.defineProperty(win, 'localStorage', {
        get() {
          throw new DOMException('Access denied', 'SecurityError');
        },
        configurable: true,
      });
      vi.stubGlobal('window', win);

      const signals = collectDeviceCapabilitySignals();
      expect(signals.storageSupport.localStorage).toBe('unavailable');

      vi.unstubAllGlobals();
    });

    it('returns "unavailable" for sessionStorage when it throws', () => {
      const win = { screen: {} };
      Object.defineProperty(win, 'sessionStorage', {
        get() {
          throw new DOMException('Access denied', 'SecurityError');
        },
        configurable: true,
      });
      vi.stubGlobal('window', win);

      const signals = collectDeviceCapabilitySignals();
      expect(signals.storageSupport.sessionStorage).toBe('unavailable');

      vi.unstubAllGlobals();
    });

    it('returns "unavailable" for indexedDB when it is not present', () => {
      vi.stubGlobal('window', { screen: {} });

      const signals = collectDeviceCapabilitySignals();
      expect(signals.storageSupport.indexedDB).toBe('unavailable');

      vi.unstubAllGlobals();
    });

    it('returns false for localStorage when it is explicitly undefined', () => {
      vi.stubGlobal('window', {
        screen: {},
        localStorage: undefined,
      });

      const signals = collectDeviceCapabilitySignals();
      // When the property exists but is undefined/falsy, implementation
      // should detect it as unavailable
      expect(
        signals.storageSupport.localStorage === false ||
          signals.storageSupport.localStorage === 'unavailable'
      ).toBe(true);

      vi.unstubAllGlobals();
    });
  });

  describe('fallback behavior when window is undefined', () => {
    it('returns all fallback values when window is undefined', () => {
      const originalWindow = globalThis.window;
      const originalNavigator = globalThis.navigator;

      // @ts-expect-error -- intentionally removing window for test
      delete globalThis.window;
      // @ts-expect-error -- intentionally removing navigator for test
      delete globalThis.navigator;

      const signals = collectDeviceCapabilitySignals();

      expect(signals.screenWidth).toBe('unavailable');
      expect(signals.screenHeight).toBe('unavailable');
      expect(signals.devicePixelRatio).toBe('unavailable');
      expect(signals.hardwareConcurrency).toBe('unavailable');
      expect(signals.touchSupport).toBe('unavailable');
      expect(signals.storageSupport.localStorage).toBe('unavailable');
      expect(signals.storageSupport.sessionStorage).toBe('unavailable');
      expect(signals.storageSupport.indexedDB).toBe('unavailable');

      globalThis.window = originalWindow;
      globalThis.navigator = originalNavigator;
    });
  });

  describe('does not throw', () => {
    it('never throws regardless of environment', () => {
      expect(() => collectDeviceCapabilitySignals()).not.toThrow();
    });
  });

  describe('type correctness', () => {
    it('each field is either the expected type or the fallback string', () => {
      const signals = collectDeviceCapabilitySignals();

      const isNumberOrUnavailable = (v: unknown) =>
        typeof v === 'number' || v === 'unavailable';
      const isBooleanOrUnavailable = (v: unknown) =>
        typeof v === 'boolean' || v === 'unavailable';

      expect(isNumberOrUnavailable(signals.screenWidth)).toBe(true);
      expect(isNumberOrUnavailable(signals.screenHeight)).toBe(true);
      expect(isNumberOrUnavailable(signals.devicePixelRatio)).toBe(true);
      expect(isNumberOrUnavailable(signals.hardwareConcurrency)).toBe(true);
      expect(isBooleanOrUnavailable(signals.touchSupport)).toBe(true);
      expect(isBooleanOrUnavailable(signals.storageSupport.localStorage)).toBe(
        true
      );
      expect(
        isBooleanOrUnavailable(signals.storageSupport.sessionStorage)
      ).toBe(true);
      expect(isBooleanOrUnavailable(signals.storageSupport.indexedDB)).toBe(
        true
      );
    });
  });

  describe('interface type export', () => {
    it('DeviceCapabilitySignals type is importable', () => {
      // This test validates at compile time that the type is exported.
      // If DeviceCapabilitySignals is not exported, this file will not compile.
      const typeCheck: DeviceCapabilitySignals =
        collectDeviceCapabilitySignals();
      expect(typeCheck).toBeDefined();
    });
  });
});
