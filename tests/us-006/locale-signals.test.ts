import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { collectLocaleSignals } from '../../src/signals/locale-signals';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('US-006: Collect locale and platform browser signals', () => {
  // Preserve originals so we can restore after each test
  const originalIntl = globalThis.Intl;
  let originalNavigator: PropertyDescriptor | undefined;
  let originalDoNotTrack: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    originalDoNotTrack = Object.getOwnPropertyDescriptor(globalThis, 'doNotTrack');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore Intl
    (globalThis as unknown as Record<string, unknown>).Intl = originalIntl;
    // Restore navigator
    if (originalNavigator) {
      Object.defineProperty(globalThis, 'navigator', originalNavigator);
    }
    // Restore globalThis.doNotTrack
    if (originalDoNotTrack) {
      Object.defineProperty(globalThis, 'doNotTrack', originalDoNotTrack);
    } else {
      delete (globalThis as unknown as Record<string, unknown>).doNotTrack;
    }
  });

  // -----------------------------------------------------------------------
  // Shape validation
  // -----------------------------------------------------------------------

  describe('return shape', () => {
    it('returns an object with all four required keys', () => {
      const result = collectLocaleSignals();
      expect(result).toHaveProperty('timezone');
      expect(result).toHaveProperty('languages');
      expect(result).toHaveProperty('platform');
      expect(result).toHaveProperty('doNotTrack');
    });

    it('has no extra keys beyond the four defined fields', () => {
      const result = collectLocaleSignals();
      expect(Object.keys(result).sort()).toEqual(
        ['doNotTrack', 'languages', 'platform', 'timezone'],
      );
    });

    it('returns correct types for each field', () => {
      const result = collectLocaleSignals();
      expect(typeof result.timezone).toBe('string');
      expect(Array.isArray(result.languages)).toBe(true);
      expect(typeof result.platform).toBe('string');
      expect(typeof result.doNotTrack).toBe('string');
    });
  });

  // -----------------------------------------------------------------------
  // Happy-path: timezone
  // -----------------------------------------------------------------------

  describe('timezone collection', () => {
    it('collects timezone from Intl.DateTimeFormat when available', () => {
      (globalThis as unknown as Record<string, unknown>).Intl = {
        DateTimeFormat: () => ({
          resolvedOptions: () => ({ timeZone: 'America/New_York' }),
        }),
      };
      const result = collectLocaleSignals();
      expect(result.timezone).toBe('America/New_York');
    });

    it('returns "unknown" when Intl is undefined', () => {
      (globalThis as unknown as Record<string, unknown>).Intl = undefined as unknown as typeof Intl;
      const result = collectLocaleSignals();
      expect(result.timezone).toBe('unknown');
    });

    it('returns "unknown" when DateTimeFormat throws', () => {
      (globalThis as unknown as Record<string, unknown>).Intl = {
        DateTimeFormat: () => {
          throw new Error('not supported');
        },
      };
      const result = collectLocaleSignals();
      expect(result.timezone).toBe('unknown');
    });

    it('returns "unknown" when timeZone is an empty string', () => {
      (globalThis as unknown as Record<string, unknown>).Intl = {
        DateTimeFormat: () => ({
          resolvedOptions: () => ({ timeZone: '' }),
        }),
      };
      const result = collectLocaleSignals();
      expect(result.timezone).toBe('unknown');
    });
  });

  // -----------------------------------------------------------------------
  // Happy-path: languages
  // -----------------------------------------------------------------------

  describe('languages collection', () => {
    it('collects languages from navigator.languages when available', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: ['en-US', 'fr-FR'], language: 'en-US' },
        writable: true,
        configurable: true,
      });
      const result = collectLocaleSignals();
      expect(result.languages).toEqual(['en-US', 'fr-FR']);
    });

    it('falls back to navigator.language when languages is empty', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: [], language: 'de-DE' },
        writable: true,
        configurable: true,
      });
      const result = collectLocaleSignals();
      expect(result.languages).toEqual(['de-DE']);
    });

    it('falls back to navigator.language when languages is undefined', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { language: 'ja-JP' },
        writable: true,
        configurable: true,
      });
      const result = collectLocaleSignals();
      expect(result.languages).toEqual(['ja-JP']);
    });

    it('returns ["unknown"] when both languages and language are missing', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });
      const result = collectLocaleSignals();
      expect(result.languages).toEqual(['unknown']);
    });

    it('returns ["unknown"] when navigator is undefined', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      const result = collectLocaleSignals();
      expect(result.languages).toEqual(['unknown']);
    });

    it('returns a frozen array (not a live reference)', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: ['en-US'], language: 'en-US' },
        writable: true,
        configurable: true,
      });
      const result = collectLocaleSignals();
      expect(Object.isFrozen(result.languages)).toBe(true);
    });

    it('does not return a reference to navigator.languages itself', () => {
      const original = ['en-US', 'es-MX'];
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: original, language: 'en-US' },
        writable: true,
        configurable: true,
      });
      const result = collectLocaleSignals();
      expect(result.languages).not.toBe(original);
      expect(result.languages).toEqual(['en-US', 'es-MX']);
    });
  });

  // -----------------------------------------------------------------------
  // Happy-path: platform
  // -----------------------------------------------------------------------

  describe('platform collection', () => {
    it('collects platform from navigator.platform when available', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { platform: 'MacIntel' },
        writable: true,
        configurable: true,
      });
      const result = collectLocaleSignals();
      expect(result.platform).toBe('MacIntel');
    });

    it('returns "unknown" when navigator.platform is undefined', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });
      const result = collectLocaleSignals();
      expect(result.platform).toBe('unknown');
    });

    it('returns "unknown" when navigator.platform is empty string', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { platform: '' },
        writable: true,
        configurable: true,
      });
      const result = collectLocaleSignals();
      expect(result.platform).toBe('unknown');
    });

    it('returns "unknown" when navigator is undefined', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      const result = collectLocaleSignals();
      expect(result.platform).toBe('unknown');
    });
  });

  // -----------------------------------------------------------------------
  // Happy-path: doNotTrack
  // -----------------------------------------------------------------------

  describe('doNotTrack collection', () => {
    it('collects doNotTrack value "1" from navigator', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { doNotTrack: '1' },
        writable: true,
        configurable: true,
      });
      const result = collectLocaleSignals();
      expect(result.doNotTrack).toBe('1');
    });

    it('collects doNotTrack value "0" from navigator', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { doNotTrack: '0' },
        writable: true,
        configurable: true,
      });
      const result = collectLocaleSignals();
      expect(result.doNotTrack).toBe('0');
    });

    it('falls back to globalThis.doNotTrack when navigator.doNotTrack is absent', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });
      (globalThis as unknown as Record<string, unknown>).doNotTrack = '1';
      const result = collectLocaleSignals();
      expect(result.doNotTrack).toBe('1');
    });

    it('returns "unspecified" when doNotTrack is null', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { doNotTrack: null },
        writable: true,
        configurable: true,
      });
      const result = collectLocaleSignals();
      expect(result.doNotTrack).toBe('unspecified');
    });

    it('returns "unspecified" when doNotTrack is not available anywhere', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });
      delete (globalThis as unknown as Record<string, unknown>).doNotTrack;
      const result = collectLocaleSignals();
      expect(result.doNotTrack).toBe('unspecified');
    });

    it('returns "unspecified" when navigator is undefined and globalThis.doNotTrack is undefined', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      delete (globalThis as unknown as Record<string, unknown>).doNotTrack;
      const result = collectLocaleSignals();
      expect(result.doNotTrack).toBe('unspecified');
    });
  });

  // -----------------------------------------------------------------------
  // Full fallback scenario
  // -----------------------------------------------------------------------

  describe('full fallback when all APIs are missing', () => {
    it('returns all safe fallback values when browser APIs are absent', () => {
      (globalThis as unknown as Record<string, unknown>).Intl = undefined as unknown as typeof Intl;
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      delete (globalThis as unknown as Record<string, unknown>).doNotTrack;

      const result = collectLocaleSignals();
      expect(result.timezone).toBe('unknown');
      expect(result.languages).toEqual(['unknown']);
      expect(result.platform).toBe('unknown');
      expect(result.doNotTrack).toBe('unspecified');
    });
  });

  // -----------------------------------------------------------------------
  // Combined happy-path scenario
  // -----------------------------------------------------------------------

  describe('full happy-path with all APIs present', () => {
    it('collects all signals correctly when APIs are fully available', () => {
      (globalThis as unknown as Record<string, unknown>).Intl = {
        DateTimeFormat: () => ({
          resolvedOptions: () => ({ timeZone: 'Europe/London' }),
        }),
      };
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          languages: ['en-GB', 'cy'],
          language: 'en-GB',
          platform: 'Win32',
          doNotTrack: '1',
        },
        writable: true,
        configurable: true,
      });

      const result = collectLocaleSignals();
      expect(result.timezone).toBe('Europe/London');
      expect(result.languages).toEqual(['en-GB', 'cy']);
      expect(result.platform).toBe('Win32');
      expect(result.doNotTrack).toBe('1');
    });
  });
});
