// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type {
  PermissionCheckResult,
  PermissionState,
} from '../../src/permissions/permissions-adapter';
import type { PermissionDebtResult } from '../../src/scoring/permission-debt-score';

/**
 * US-023: Render Permission Debt module
 *
 * Tests that the rendered module displays all required permission rows,
 * the debt score, and explanatory text.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const REQUIRED_PERMISSIONS = [
  'notifications',
  'camera',
  'microphone',
  'clipboard',
  'geolocation',
] as const;

const DISPLAY_LABELS: Record<string, string> = {
  notifications: 'Notifications',
  camera: 'Camera',
  microphone: 'Microphone',
  clipboard: 'Clipboard',
  geolocation: 'Location',
};

function makePermissionResults(
  state: PermissionState,
  names: string[] = [...REQUIRED_PERMISSIONS],
): PermissionCheckResult[] {
  return names.map((name) => ({ name, state }));
}

function makeMixedPermissions(
  overrides: Partial<Record<string, PermissionState>> = {},
): PermissionCheckResult[] {
  const defaults: Record<string, PermissionState> = {
    notifications: 'granted',
    camera: 'denied',
    microphone: 'prompt',
    clipboard: 'unsupported',
    geolocation: 'granted',
  };
  return Object.entries({ ...defaults, ...overrides }).map(([name, state]) => ({
    name,
    state,
  }));
}

const MOCK_DEBT_RESULT: PermissionDebtResult = {
  score: 42,
  maxPossible: 61,
  breakdown: [
    { name: 'notifications', state: 'granted', weight: 7 },
    { name: 'camera', state: 'denied', weight: 10 },
    { name: 'microphone', state: 'prompt', weight: 10 },
    { name: 'clipboard', state: 'unsupported', weight: 1 },
    { name: 'geolocation', state: 'granted', weight: 10 },
  ],
};

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

vi.mock('../../src/permissions/permissions-adapter', () => ({
  checkPermissions: vi.fn(),
  hasPermissionsAPI: vi.fn(() => true),
}));

vi.mock('../../src/scoring/permission-debt-score', () => ({
  calculatePermissionDebtScore: vi.fn(),
  PERMISSION_WEIGHTS: {
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
  },
}));

// ---------------------------------------------------------------------------
// Tests: renderPermissionDebtModule
// ---------------------------------------------------------------------------

describe('US-023: renderPermissionDebtModule', () => {
  let checkPermissions: ReturnType<typeof vi.fn>;
  let calculatePermissionDebtScore: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const adapter = await import('../../src/permissions/permissions-adapter');
    const scoring = await import('../../src/scoring/permission-debt-score');
    checkPermissions = adapter.checkPermissions as ReturnType<typeof vi.fn>;
    calculatePermissionDebtScore = scoring.calculatePermissionDebtScore as ReturnType<typeof vi.fn>;

    checkPermissions.mockResolvedValue(makeMixedPermissions());
    calculatePermissionDebtScore.mockReturnValue(MOCK_DEBT_RESULT);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function renderModule(): Promise<HTMLElement> {
    const { renderPermissionDebtModule } = await import(
      '../../src/modules/permission-debt/permission-debt-module'
    );
    return renderPermissionDebtModule();
  }

  // ---- AC: Returns valid HTMLElement ----

  it('returns an HTMLElement', async () => {
    const el = await renderModule();
    expect(el).toBeInstanceOf(HTMLElement);
  });

  // ---- AC: Notifications shown ----

  it('renders a row for Notifications', async () => {
    const el = await renderModule();
    expect(el.textContent).toContain('Notifications');
  });

  // ---- AC: Camera shown ----

  it('renders a row for Camera', async () => {
    const el = await renderModule();
    expect(el.textContent).toContain('Camera');
  });

  // ---- AC: Microphone shown ----

  it('renders a row for Microphone', async () => {
    const el = await renderModule();
    expect(el.textContent).toContain('Microphone');
  });

  // ---- AC: Clipboard shown ----

  it('renders a row for Clipboard', async () => {
    const el = await renderModule();
    expect(el.textContent).toContain('Clipboard');
  });

  // ---- AC: Location shown ----

  it('renders a row for Location', async () => {
    const el = await renderModule();
    expect(el.textContent).toContain('Location');
  });

  // ---- AC: All 5 required permissions present ----

  it('renders all five required permissions', async () => {
    const el = await renderModule();
    const text = el.textContent ?? '';
    for (const label of Object.values(DISPLAY_LABELS)) {
      expect(text).toContain(label);
    }
  });

  // ---- AC: Permission Debt score shown ----

  it('displays the permission debt score', async () => {
    const el = await renderModule();
    expect(el.textContent).toContain('42');
  });

  it('calls calculatePermissionDebtScore with the permission results', async () => {
    await renderModule();
    expect(calculatePermissionDebtScore).toHaveBeenCalledOnce();
    const arg = calculatePermissionDebtScore.mock.calls[0][0];
    expect(Array.isArray(arg)).toBe(true);
    expect(arg.length).toBeGreaterThan(0);
  });

  // ---- AC: Explanatory text shown ----

  it('contains explanatory text about permission debt', async () => {
    const el = await renderModule();
    const text = (el.textContent ?? '').toLowerCase();
    // Should explain what permission debt is — look for key concepts
    const hasExplanation =
      text.includes('permission') &&
      (text.includes('risk') ||
        text.includes('debt') ||
        text.includes('grant') ||
        text.includes('accumulate'));
    expect(hasExplanation).toBe(true);
  });

  // ---- State badges ----

  describe('state badge rendering', () => {
    it('shows "granted" state text for granted permissions', async () => {
      checkPermissions.mockResolvedValue(makePermissionResults('granted'));
      calculatePermissionDebtScore.mockReturnValue({
        ...MOCK_DEBT_RESULT,
        score: 100,
      });
      const el = await renderModule();
      const text = (el.textContent ?? '').toLowerCase();
      expect(text).toContain('granted');
    });

    it('shows "denied" state text for denied permissions', async () => {
      checkPermissions.mockResolvedValue(makePermissionResults('denied'));
      calculatePermissionDebtScore.mockReturnValue({
        ...MOCK_DEBT_RESULT,
        score: 0,
      });
      const el = await renderModule();
      const text = (el.textContent ?? '').toLowerCase();
      expect(text).toContain('denied');
    });

    it('shows "prompt" state text for prompt permissions', async () => {
      checkPermissions.mockResolvedValue(makePermissionResults('prompt'));
      calculatePermissionDebtScore.mockReturnValue({
        ...MOCK_DEBT_RESULT,
        score: 0,
      });
      const el = await renderModule();
      const text = (el.textContent ?? '').toLowerCase();
      expect(text).toContain('prompt');
    });
  });

  // ---- Unsupported permissions ----

  describe('unsupported permission handling', () => {
    it('handles unsupported permissions gracefully', async () => {
      checkPermissions.mockResolvedValue(makePermissionResults('unsupported'));
      calculatePermissionDebtScore.mockReturnValue({
        score: 0,
        maxPossible: 0,
        breakdown: REQUIRED_PERMISSIONS.map((name) => ({
          name,
          state: 'unsupported' as PermissionState,
          weight: 1,
        })),
      });
      const el = await renderModule();
      // Should not throw, should return a valid element
      expect(el).toBeInstanceOf(HTMLElement);
    });

    it('renders unsupported state indicator when permission is unsupported', async () => {
      checkPermissions.mockResolvedValue(makePermissionResults('unsupported'));
      calculatePermissionDebtScore.mockReturnValue({
        score: 0,
        maxPossible: 0,
        breakdown: [],
      });
      const el = await renderModule();
      const text = (el.textContent ?? '').toLowerCase();
      expect(text).toContain('unsupported');
    });
  });

  // ---- Data flow ----

  it('passes checkPermissions results to calculatePermissionDebtScore', async () => {
    const customPerms = makePermissionResults('granted', ['camera', 'microphone']);
    checkPermissions.mockResolvedValue(customPerms);
    await renderModule();
    expect(calculatePermissionDebtScore).toHaveBeenCalledWith(
      expect.arrayContaining(customPerms),
    );
  });

  // ---- Score boundary values ----

  describe('score display edge cases', () => {
    it('renders score of 0', async () => {
      checkPermissions.mockResolvedValue(makePermissionResults('denied'));
      calculatePermissionDebtScore.mockReturnValue({
        ...MOCK_DEBT_RESULT,
        score: 0,
      });
      const el = await renderModule();
      expect(el.textContent).toContain('0');
    });

    it('renders score of 100', async () => {
      checkPermissions.mockResolvedValue(makePermissionResults('granted'));
      calculatePermissionDebtScore.mockReturnValue({
        ...MOCK_DEBT_RESULT,
        score: 100,
      });
      const el = await renderModule();
      expect(el.textContent).toContain('100');
    });
  });
});
