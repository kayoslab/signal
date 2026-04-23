import { describe, it, expect } from 'vitest';
import type {
  PermissionCheckResult,
  PermissionState,
} from '../../src/permissions/permissions-adapter';

/**
 * US-023: format-permissions helper
 *
 * Unit tests for the helper that maps raw PermissionCheckResult[]
 * into display-ready rows with human-readable labels and state formatting.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATES: PermissionState[] = ['granted', 'denied', 'prompt', 'unsupported'];

function makeResult(name: string, state: PermissionState): PermissionCheckResult {
  return { name, state };
}

// ---------------------------------------------------------------------------
// Tests: formatPermissions
// ---------------------------------------------------------------------------

describe('US-023: formatPermissions helper', () => {
  async function loadHelper() {
    return import('../../src/modules/permission-debt/format-permissions');
  }

  // ---- Label mapping ----

  describe('label mapping', () => {
    it('maps "geolocation" to "Location"', async () => {
      const { formatPermissions } = await loadHelper();
      const rows = formatPermissions([makeResult('geolocation', 'prompt')]);
      expect(rows.some((r) => r.label === 'Location')).toBe(true);
    });

    it('maps "notifications" to "Notifications"', async () => {
      const { formatPermissions } = await loadHelper();
      const rows = formatPermissions([makeResult('notifications', 'prompt')]);
      expect(rows.some((r) => r.label === 'Notifications')).toBe(true);
    });

    it('maps "camera" to "Camera"', async () => {
      const { formatPermissions } = await loadHelper();
      const rows = formatPermissions([makeResult('camera', 'prompt')]);
      expect(rows.some((r) => r.label === 'Camera')).toBe(true);
    });

    it('maps "microphone" to "Microphone"', async () => {
      const { formatPermissions } = await loadHelper();
      const rows = formatPermissions([makeResult('microphone', 'prompt')]);
      expect(rows.some((r) => r.label === 'Microphone')).toBe(true);
    });

    it('maps "clipboard" to "Clipboard"', async () => {
      const { formatPermissions } = await loadHelper();
      const rows = formatPermissions([makeResult('clipboard', 'prompt')]);
      expect(rows.some((r) => r.label === 'Clipboard')).toBe(true);
    });
  });

  // ---- State formatting ----

  describe('state formatting', () => {
    it.each(STATES)('includes "%s" state in the formatted value', async (state) => {
      const { formatPermissions } = await loadHelper();
      const rows = formatPermissions([makeResult('camera', state)]);
      expect(rows.length).toBeGreaterThan(0);
      const value = rows[0].value.toLowerCase();
      expect(value).toContain(state);
    });
  });

  // ---- Return shape ----

  describe('return shape', () => {
    it('returns an array', async () => {
      const { formatPermissions } = await loadHelper();
      const rows = formatPermissions([]);
      expect(Array.isArray(rows)).toBe(true);
    });

    it('each row has label and value properties', async () => {
      const { formatPermissions } = await loadHelper();
      const rows = formatPermissions([makeResult('camera', 'granted')]);
      for (const row of rows) {
        expect(row).toHaveProperty('label');
        expect(row).toHaveProperty('value');
        expect(typeof row.label).toBe('string');
        expect(typeof row.value).toBe('string');
      }
    });

    it('returns one row per input permission', async () => {
      const { formatPermissions } = await loadHelper();
      const input = [
        makeResult('camera', 'granted'),
        makeResult('microphone', 'denied'),
        makeResult('notifications', 'prompt'),
      ];
      const rows = formatPermissions(input);
      expect(rows.length).toBe(input.length);
    });
  });

  // ---- Empty input ----

  it('returns empty array for empty input', async () => {
    const { formatPermissions } = await loadHelper();
    const rows = formatPermissions([]);
    expect(rows).toEqual([]);
  });

  // ---- All required permissions together ----

  it('formats all five required permissions', async () => {
    const { formatPermissions } = await loadHelper();
    const input: PermissionCheckResult[] = [
      makeResult('notifications', 'granted'),
      makeResult('camera', 'denied'),
      makeResult('microphone', 'prompt'),
      makeResult('clipboard', 'unsupported'),
      makeResult('geolocation', 'granted'),
    ];
    const rows = formatPermissions(input);
    const labels = rows.map((r) => r.label);
    expect(labels).toContain('Notifications');
    expect(labels).toContain('Camera');
    expect(labels).toContain('Microphone');
    expect(labels).toContain('Clipboard');
    expect(labels).toContain('Location');
  });
});
