import { describe, it, expect } from 'vitest';
import {
  calculatePermissionDebtScore,
  PERMISSION_WEIGHTS,
  type PermissionDebtResult,
} from '../../src/scoring/permission-debt-score';
import type {
  PermissionCheckResult,
  PermissionState,
} from '../../src/permissions/permissions-adapter';

const ALL_PERMISSION_NAMES = [
  'geolocation',
  'notifications',
  'camera',
  'microphone',
  'persistent-storage',
  'push',
  'screen-wake-lock',
  'accelerometer',
  'gyroscope',
  'magnetometer',
  'midi',
];

function makePermissions(
  state: PermissionState,
  names: string[] = ALL_PERMISSION_NAMES,
): PermissionCheckResult[] {
  return names.map((name) => ({ name, state }));
}

function makePermissionsWithOverrides(
  defaults: PermissionState,
  overrides: Record<string, PermissionState>,
): PermissionCheckResult[] {
  return ALL_PERMISSION_NAMES.map((name) => ({
    name,
    state: overrides[name] ?? defaults,
  }));
}

describe('US-022: permission debt score', () => {
  describe('all-same-state boundaries', () => {
    it('returns score 100 when all permissions are granted', () => {
      const result = calculatePermissionDebtScore(makePermissions('granted'));
      expect(result.score).toBe(100);
    });

    it('returns score 0 when all permissions are denied', () => {
      const result = calculatePermissionDebtScore(makePermissions('denied'));
      expect(result.score).toBe(0);
    });

    it('returns score 0 when all permissions are unsupported', () => {
      const result = calculatePermissionDebtScore(
        makePermissions('unsupported'),
      );
      expect(result.score).toBe(0);
    });

    it('returns score 0 when all permissions are in prompt state', () => {
      const result = calculatePermissionDebtScore(makePermissions('prompt'));
      expect(result.score).toBe(0);
    });
  });

  describe('non-granted states do not increase score', () => {
    it('denied permissions do not increase score', () => {
      const permissions = makePermissionsWithOverrides('denied', {
        camera: 'granted',
      });
      const withCamera = calculatePermissionDebtScore(permissions);
      const allDenied = calculatePermissionDebtScore(
        makePermissions('denied'),
      );
      expect(allDenied.score).toBe(0);
      expect(withCamera.score).toBeGreaterThan(0);
    });

    it('unsupported permissions do not increase score', () => {
      const permissions = makePermissionsWithOverrides('unsupported', {
        microphone: 'granted',
      });
      const withMic = calculatePermissionDebtScore(permissions);
      const allUnsupported = calculatePermissionDebtScore(
        makePermissions('unsupported'),
      );
      expect(allUnsupported.score).toBe(0);
      expect(withMic.score).toBeGreaterThan(0);
    });

    it('prompt permissions do not increase score', () => {
      const permissions = makePermissionsWithOverrides('prompt', {
        geolocation: 'granted',
      });
      const withGeo = calculatePermissionDebtScore(permissions);
      const allPrompt = calculatePermissionDebtScore(
        makePermissions('prompt'),
      );
      expect(allPrompt.score).toBe(0);
      expect(withGeo.score).toBeGreaterThan(0);
    });
  });

  describe('weight proportionality', () => {
    it('single high-weight permission (camera) granted produces higher score than single low-weight (accelerometer)', () => {
      const cameraOnly = makePermissionsWithOverrides('denied', {
        camera: 'granted',
      });
      const accelOnly = makePermissionsWithOverrides('denied', {
        accelerometer: 'granted',
      });

      const cameraResult = calculatePermissionDebtScore(cameraOnly);
      const accelResult = calculatePermissionDebtScore(accelOnly);

      expect(cameraResult.score).toBeGreaterThan(accelResult.score);
    });

    it('single high-weight permission score equals its weight proportion of 100', () => {
      const cameraOnly = makePermissionsWithOverrides('denied', {
        camera: 'granted',
      });
      const result = calculatePermissionDebtScore(cameraOnly);

      const totalWeight = Object.values(PERMISSION_WEIGHTS).reduce(
        (sum, w) => sum + w,
        0,
      );
      const expected = Math.round(
        (PERMISSION_WEIGHTS['camera'] / totalWeight) * 100,
      );
      expect(result.score).toBe(expected);
    });

    it('single low-weight permission (accelerometer) score equals its weight proportion of 100', () => {
      const accelOnly = makePermissionsWithOverrides('denied', {
        accelerometer: 'granted',
      });
      const result = calculatePermissionDebtScore(accelOnly);

      const totalWeight = Object.values(PERMISSION_WEIGHTS).reduce(
        (sum, w) => sum + w,
        0,
      );
      const expected = Math.round(
        (PERMISSION_WEIGHTS['accelerometer'] / totalWeight) * 100,
      );
      expect(result.score).toBe(expected);
    });
  });

  describe('mixed states', () => {
    it('correctly sums only granted permission weights in a mixed scenario', () => {
      const permissions = makePermissionsWithOverrides('denied', {
        camera: 'granted',
        microphone: 'granted',
        geolocation: 'prompt',
        notifications: 'unsupported',
      });

      const result = calculatePermissionDebtScore(permissions);

      const totalWeight = Object.values(PERMISSION_WEIGHTS).reduce(
        (sum, w) => sum + w,
        0,
      );
      const grantedWeight =
        PERMISSION_WEIGHTS['camera'] + PERMISSION_WEIGHTS['microphone'];
      const expected = Math.round((grantedWeight / totalWeight) * 100);
      expect(result.score).toBe(expected);
    });

    it('score increases monotonically as more permissions are granted', () => {
      const scores: number[] = [];

      for (let i = 0; i <= ALL_PERMISSION_NAMES.length; i++) {
        const permissions = ALL_PERMISSION_NAMES.map((name, idx) => ({
          name,
          state: (idx < i ? 'granted' : 'denied') as PermissionState,
        }));
        scores.push(calculatePermissionDebtScore(permissions).score);
      }

      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
      }
    });
  });

  describe('determinism', () => {
    it('returns the same score for identical input called twice', () => {
      const permissions = makePermissionsWithOverrides('denied', {
        camera: 'granted',
        geolocation: 'granted',
        notifications: 'prompt',
      });

      const result1 = calculatePermissionDebtScore(permissions);
      const result2 = calculatePermissionDebtScore(permissions);

      expect(result1.score).toBe(result2.score);
      expect(result1.maxPossible).toBe(result2.maxPossible);
      expect(result1.breakdown).toEqual(result2.breakdown);
    });
  });

  describe('edge cases', () => {
    it('returns score 0 for empty permissions array', () => {
      const result = calculatePermissionDebtScore([]);
      expect(result.score).toBe(0);
    });

    it('handles unknown permission names with a default weight', () => {
      const permissions: PermissionCheckResult[] = [
        { name: 'unknown-future-permission', state: 'granted' },
      ];

      expect(() => calculatePermissionDebtScore(permissions)).not.toThrow();
      const result = calculatePermissionDebtScore(permissions);
      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe('return shape (PermissionDebtResult)', () => {
    it('returns an object with score, maxPossible, and breakdown', () => {
      const result = calculatePermissionDebtScore(makePermissions('granted'));

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('maxPossible');
      expect(result).toHaveProperty('breakdown');
    });

    it('score is an integer', () => {
      const result = calculatePermissionDebtScore(
        makePermissionsWithOverrides('denied', {
          camera: 'granted',
          accelerometer: 'granted',
        }),
      );
      expect(Number.isInteger(result.score)).toBe(true);
    });

    it('score is between 0 and 100 inclusive', () => {
      const result = calculatePermissionDebtScore(makePermissions('granted'));
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('maxPossible equals sum of all weights in input', () => {
      const result = calculatePermissionDebtScore(makePermissions('denied'));
      const totalWeight = ALL_PERMISSION_NAMES.reduce(
        (sum, name) => sum + (PERMISSION_WEIGHTS[name] ?? 1),
        0,
      );
      expect(result.maxPossible).toBe(totalWeight);
    });

    it('breakdown includes per-permission entries with name, state, and weight', () => {
      const permissions = makePermissionsWithOverrides('denied', {
        camera: 'granted',
      });
      const result = calculatePermissionDebtScore(permissions);

      expect(result.breakdown).toHaveLength(ALL_PERMISSION_NAMES.length);

      for (const entry of result.breakdown) {
        expect(entry).toHaveProperty('name');
        expect(entry).toHaveProperty('state');
        expect(entry).toHaveProperty('weight');
        expect(typeof entry.name).toBe('string');
        expect(typeof entry.weight).toBe('number');
        expect(['granted', 'denied', 'prompt', 'unsupported']).toContain(
          entry.state,
        );
      }

      const cameraEntry = result.breakdown.find((e) => e.name === 'camera');
      expect(cameraEntry?.state).toBe('granted');
    });
  });

  describe('property-style: score always integer in [0, 100]', () => {
    const stateOptions: PermissionState[] = [
      'granted',
      'denied',
      'prompt',
      'unsupported',
    ];

    it('score stays within bounds for various random permission combinations', () => {
      for (let trial = 0; trial < 20; trial++) {
        const permissions: PermissionCheckResult[] = ALL_PERMISSION_NAMES.map(
          (name) => ({
            name,
            state: stateOptions[Math.floor(Math.random() * stateOptions.length)],
          }),
        );

        const result = calculatePermissionDebtScore(permissions);

        expect(Number.isInteger(result.score)).toBe(true);
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('weight table', () => {
    it('PERMISSION_WEIGHTS contains entries for all 11 standard permissions', () => {
      for (const name of ALL_PERMISSION_NAMES) {
        expect(PERMISSION_WEIGHTS).toHaveProperty(name);
        expect(typeof PERMISSION_WEIGHTS[name]).toBe('number');
        expect(PERMISSION_WEIGHTS[name]).toBeGreaterThan(0);
      }
    });

    it('privacy-invasive permissions (camera, microphone, geolocation) have higher weights than motion sensors', () => {
      const highWeight = Math.min(
        PERMISSION_WEIGHTS['camera'],
        PERMISSION_WEIGHTS['microphone'],
        PERMISSION_WEIGHTS['geolocation'],
      );
      const lowWeight = Math.max(
        PERMISSION_WEIGHTS['accelerometer'],
        PERMISSION_WEIGHTS['gyroscope'],
        PERMISSION_WEIGHTS['magnetometer'],
      );

      expect(highWeight).toBeGreaterThan(lowWeight);
    });
  });
});
