import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  checkPermissions,
  hasPermissionsAPI,
  queryPermission,
  type PermissionState,
  type PermissionCheckResult,
} from '../../src/permissions/permissions-adapter';

describe('US-021: permissions adapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('hasPermissionsAPI', () => {
    it('returns true when navigator.permissions.query is available', () => {
      vi.stubGlobal('navigator', {
        permissions: {
          query: vi.fn(),
        },
      });

      expect(hasPermissionsAPI()).toBe(true);
    });

    it('returns false when navigator.permissions is undefined', () => {
      vi.stubGlobal('navigator', {});

      expect(hasPermissionsAPI()).toBe(false);
    });

    it('returns false when navigator.permissions.query is not a function', () => {
      vi.stubGlobal('navigator', {
        permissions: {},
      });

      expect(hasPermissionsAPI()).toBe(false);
    });

    it('returns false when navigator is undefined', () => {
      const originalNavigator = globalThis.navigator;
      // @ts-expect-error -- intentionally removing navigator for test
      delete globalThis.navigator;

      expect(hasPermissionsAPI()).toBe(false);

      globalThis.navigator = originalNavigator;
    });
  });

  describe('queryPermission', () => {
    it('returns "granted" when the permission is granted', async () => {
      vi.stubGlobal('navigator', {
        permissions: {
          query: vi.fn().mockResolvedValue({ state: 'granted' }),
        },
      });

      const result = await queryPermission('geolocation');
      expect(result).toBe('granted');
    });

    it('returns "denied" when the permission is denied', async () => {
      vi.stubGlobal('navigator', {
        permissions: {
          query: vi.fn().mockResolvedValue({ state: 'denied' }),
        },
      });

      const result = await queryPermission('notifications');
      expect(result).toBe('denied');
    });

    it('returns "prompt" when the permission requires a prompt', async () => {
      vi.stubGlobal('navigator', {
        permissions: {
          query: vi.fn().mockResolvedValue({ state: 'prompt' }),
        },
      });

      const result = await queryPermission('camera');
      expect(result).toBe('prompt');
    });

    it('returns "unsupported" when permissions.query throws a TypeError', async () => {
      vi.stubGlobal('navigator', {
        permissions: {
          query: vi.fn().mockRejectedValue(new TypeError('not supported')),
        },
      });

      const result = await queryPermission('clipboard-read');
      expect(result).toBe('unsupported');
    });

    it('returns "unsupported" when permissions.query throws a DOMException', async () => {
      vi.stubGlobal('navigator', {
        permissions: {
          query: vi
            .fn()
            .mockRejectedValue(
              new DOMException('not allowed', 'NotAllowedError')
            ),
        },
      });

      const result = await queryPermission('midi');
      expect(result).toBe('unsupported');
    });

    it('returns "unsupported" when navigator.permissions is undefined', async () => {
      vi.stubGlobal('navigator', {});

      const result = await queryPermission('geolocation');
      expect(result).toBe('unsupported');
    });

    it('returns "unsupported" when navigator is undefined', async () => {
      const originalNavigator = globalThis.navigator;
      // @ts-expect-error -- intentionally removing navigator for test
      delete globalThis.navigator;

      const result = await queryPermission('geolocation');
      expect(result).toBe('unsupported');

      globalThis.navigator = originalNavigator;
    });

    it('does not throw regardless of error type', async () => {
      vi.stubGlobal('navigator', {
        permissions: {
          query: vi.fn().mockRejectedValue(new Error('unexpected')),
        },
      });

      await expect(queryPermission('geolocation')).resolves.not.toThrow();
    });
  });

  describe('checkPermissions', () => {
    describe('return shape and required fields', () => {
      it('returns an array', async () => {
        vi.stubGlobal('navigator', {
          permissions: {
            query: vi.fn().mockResolvedValue({ state: 'prompt' }),
          },
        });

        const results = await checkPermissions();
        expect(Array.isArray(results)).toBe(true);
      });

      it('each result has name and state fields', async () => {
        vi.stubGlobal('navigator', {
          permissions: {
            query: vi.fn().mockResolvedValue({ state: 'prompt' }),
          },
        });

        const results = await checkPermissions();
        expect(results.length).toBeGreaterThan(0);

        for (const result of results) {
          expect(result).toHaveProperty('name');
          expect(result).toHaveProperty('state');
          expect(typeof result.name).toBe('string');
          expect(result.name.length).toBeGreaterThan(0);
        }
      });

      it('each state is a valid PermissionState value', async () => {
        vi.stubGlobal('navigator', {
          permissions: {
            query: vi.fn().mockResolvedValue({ state: 'granted' }),
          },
        });

        const validStates: PermissionState[] = [
          'granted',
          'denied',
          'prompt',
          'unsupported',
        ];
        const results = await checkPermissions();

        for (const result of results) {
          expect(validStates).toContain(result.state);
        }
      });

      it('returns no extra keys beyond name and state', async () => {
        vi.stubGlobal('navigator', {
          permissions: {
            query: vi.fn().mockResolvedValue({ state: 'prompt' }),
          },
        });

        const results = await checkPermissions();

        for (const result of results) {
          expect(Object.keys(result).sort()).toEqual(['name', 'state']);
        }
      });
    });

    describe('maps browser permission states correctly', () => {
      it('maps granted permissions correctly', async () => {
        vi.stubGlobal('navigator', {
          permissions: {
            query: vi.fn().mockResolvedValue({ state: 'granted' }),
          },
        });

        const results = await checkPermissions();
        for (const result of results) {
          expect(result.state).toBe('granted');
        }
      });

      it('maps denied permissions correctly', async () => {
        vi.stubGlobal('navigator', {
          permissions: {
            query: vi.fn().mockResolvedValue({ state: 'denied' }),
          },
        });

        const results = await checkPermissions();
        for (const result of results) {
          expect(result.state).toBe('denied');
        }
      });

      it('maps prompt permissions correctly', async () => {
        vi.stubGlobal('navigator', {
          permissions: {
            query: vi.fn().mockResolvedValue({ state: 'prompt' }),
          },
        });

        const results = await checkPermissions();
        for (const result of results) {
          expect(result.state).toBe('prompt');
        }
      });
    });

    describe('handles mixed results', () => {
      it('returns correct states when some permissions are supported and others throw', async () => {
        const queryMock = vi.fn().mockImplementation(({ name }) => {
          if (name === 'geolocation') {
            return Promise.resolve({ state: 'granted' });
          }
          if (name === 'notifications') {
            return Promise.resolve({ state: 'denied' });
          }
          return Promise.reject(new TypeError('not supported'));
        });

        vi.stubGlobal('navigator', {
          permissions: { query: queryMock },
        });

        const results = await checkPermissions();
        const geo = results.find((r) => r.name === 'geolocation');
        const notif = results.find((r) => r.name === 'notifications');

        if (geo) expect(geo.state).toBe('granted');
        if (notif) expect(notif.state).toBe('denied');

        // All others should be unsupported
        const others = results.filter(
          (r) => r.name !== 'geolocation' && r.name !== 'notifications'
        );
        for (const result of others) {
          expect(result.state).toBe('unsupported');
        }
      });
    });

    describe('unsupported browser fallback', () => {
      it('returns all unsupported when navigator.permissions is undefined', async () => {
        vi.stubGlobal('navigator', {});

        const results = await checkPermissions();
        expect(results.length).toBeGreaterThan(0);

        for (const result of results) {
          expect(result.state).toBe('unsupported');
        }
      });

      it('returns all unsupported when navigator is undefined', async () => {
        const originalNavigator = globalThis.navigator;
        // @ts-expect-error -- intentionally removing navigator for test
        delete globalThis.navigator;

        const results = await checkPermissions();
        expect(results.length).toBeGreaterThan(0);

        for (const result of results) {
          expect(result.state).toBe('unsupported');
        }

        globalThis.navigator = originalNavigator;
      });

      it('returns all unsupported when permissions.query is not a function', async () => {
        vi.stubGlobal('navigator', {
          permissions: {},
        });

        const results = await checkPermissions();
        for (const result of results) {
          expect(result.state).toBe('unsupported');
        }
      });
    });

    describe('no uncaught runtime errors', () => {
      it('does not throw when Permissions API is available', async () => {
        vi.stubGlobal('navigator', {
          permissions: {
            query: vi.fn().mockResolvedValue({ state: 'prompt' }),
          },
        });

        await expect(checkPermissions()).resolves.not.toThrow();
      });

      it('does not throw when Permissions API is missing', async () => {
        vi.stubGlobal('navigator', {});

        await expect(checkPermissions()).resolves.not.toThrow();
      });

      it('does not throw when navigator is completely bare', async () => {
        const originalNavigator = globalThis.navigator;
        // @ts-expect-error -- intentionally removing navigator for test
        delete globalThis.navigator;

        await expect(checkPermissions()).resolves.not.toThrow();

        globalThis.navigator = originalNavigator;
      });

      it('does not throw when permissions.query rejects for every permission', async () => {
        vi.stubGlobal('navigator', {
          permissions: {
            query: vi.fn().mockRejectedValue(new Error('failure')),
          },
        });

        await expect(checkPermissions()).resolves.not.toThrow();
      });
    });
  });

  describe('type exports', () => {
    it('PermissionState type is importable', () => {
      // Compile-time check: if PermissionState is not exported, this file won't compile
      const state: PermissionState = 'granted';
      expect(state).toBeDefined();
    });

    it('PermissionCheckResult type is importable', async () => {
      // Compile-time check: if PermissionCheckResult is not exported, this file won't compile
      vi.stubGlobal('navigator', {
        permissions: {
          query: vi.fn().mockResolvedValue({ state: 'prompt' }),
        },
      });

      const results: PermissionCheckResult[] = await checkPermissions();
      expect(results).toBeDefined();
    });
  });
});
