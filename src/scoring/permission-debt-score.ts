import type {
  PermissionCheckResult,
  PermissionState,
} from '../permissions/permissions-adapter';

export interface PermissionDebtBreakdownEntry {
  name: string;
  state: PermissionState;
  weight: number;
}

export interface PermissionDebtResult {
  score: number;
  maxPossible: number;
  breakdown: PermissionDebtBreakdownEntry[];
}

/**
 * Risk weights for each standard permission.
 *
 * Higher weights indicate more privacy-invasive permissions:
 * - camera (10), microphone (10), geolocation (10): direct access to
 *   real-world identity signals — location, face, voice
 * - notifications (7): enables persistent re-engagement and tracking
 * - push (6): background messaging channel, less invasive than notifications
 * - persistent-storage (5): allows long-lived local data that survives cleanup
 * - screen-wake-lock (4): controls device behavior, moderate risk
 * - midi (3): niche hardware access, low population exposure
 * - accelerometer (2), gyroscope (2), magnetometer (2): motion sensors —
 *   limited privacy impact in isolation
 *
 * Default weight for unknown permissions: 1
 */
export const PERMISSION_WEIGHTS: Record<string, number> = {
  camera: 10,
  microphone: 10,
  geolocation: 10,
  notifications: 7,
  push: 6,
  'persistent-storage': 5,
  'screen-wake-lock': 4,
  midi: 3,
  accelerometer: 2,
  gyroscope: 2,
  magnetometer: 2,
};

const DEFAULT_WEIGHT = 1;

/**
 * Calculates a deterministic permission debt score on a 0–100 scale.
 *
 * Scoring formula:
 *   score = round(sum_of_granted_weights / sum_of_all_weights × 100)
 *
 * Only permissions with state 'granted' contribute to the numerator.
 * States 'denied', 'prompt', and 'unsupported' contribute zero.
 * The result is clamped to [0, 100] and returned as an integer.
 *
 * Unknown permission names receive a default weight of 1.
 */
export function calculatePermissionDebtScore(
  permissions: PermissionCheckResult[],
): PermissionDebtResult {
  if (permissions.length === 0) {
    return { score: 0, maxPossible: 0, breakdown: [] };
  }

  let grantedSum = 0;
  let totalSum = 0;
  const breakdown: PermissionDebtBreakdownEntry[] = [];

  for (const perm of permissions) {
    const weight = PERMISSION_WEIGHTS[perm.name] ?? DEFAULT_WEIGHT;
    totalSum += weight;

    if (perm.state === 'granted') {
      grantedSum += weight;
    }

    breakdown.push({ name: perm.name, state: perm.state, weight });
  }

  const raw = totalSum > 0 ? (grantedSum / totalSum) * 100 : 0;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  return { score, maxPossible: totalSum, breakdown };
}
