import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SignalSnapshot } from '../../src/signals/snapshot';
import type { PermissionCheckResult, PermissionState } from '../../src/permissions/permissions-adapter';
import type { EntropyResult, EntropyBreakdownEntry } from '../../src/scoring/entropy-score';
import type { PermissionDebtResult } from '../../src/scoring/permission-debt-score';
import type { InferenceStatement } from '../../src/modules/shadow-profile/inference-schema';
import { INFERENCE_MARKER } from '../../src/modules/shadow-profile/inference-schema';
import type { ThreatFinding } from '../../src/modules/threat-model/threat-schema';
import type { HardeningInput } from '../../src/modules/hardening/hardening-schema';
import { evaluateHardeningRules } from '../../src/modules/hardening/hardening-rules';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function makeSnapshot(overrides: {
  timezone?: string;
  languages?: readonly string[];
  platform?: string;
  doNotTrack?: string;
  screenWidth?: number | string;
  screenHeight?: number | string;
  devicePixelRatio?: number | string;
  hardwareConcurrency?: number | string;
  touchSupport?: boolean | string;
  renderer?: string;
  vendor?: string;
  webglVersion?: string;
  webglSupported?: boolean;
} = {}): SignalSnapshot {
  return {
    locale: {
      timezone: overrides.timezone ?? 'America/New_York',
      languages: overrides.languages ?? Object.freeze(['en-US']),
      platform: overrides.platform ?? 'MacIntel',
      doNotTrack: overrides.doNotTrack ?? '1',
    },
    device: {
      screenWidth: overrides.screenWidth ?? 1920,
      screenHeight: overrides.screenHeight ?? 1080,
      devicePixelRatio: overrides.devicePixelRatio ?? 2,
      hardwareConcurrency: overrides.hardwareConcurrency ?? 8,
      touchSupport: overrides.touchSupport ?? false,
      storageSupport: {
        localStorage: true,
        sessionStorage: true,
        indexedDB: true,
      },
    },
    rendering: {
      webglSupported: overrides.webglSupported ?? true,
      renderer: overrides.renderer ?? 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)',
      vendor: overrides.vendor ?? 'Google Inc. (Apple)',
      webglVersion: overrides.webglVersion ?? 'webgl2',
    },
    collectedAt: '2026-04-24T00:00:00.000Z',
    version: 1,
  };
}

function makeEntropy(score: number, breakdown: EntropyBreakdownEntry[] = []): EntropyResult {
  return {
    score,
    maxPossible: 100,
    breakdown: breakdown.length > 0 ? breakdown : [
      { signal: 'renderer', value: 'ANGLE Metal', weight: 15, contribution: score > 0 ? 15 : 0 },
      { signal: 'timezone', value: 'America/New_York', weight: 10, contribution: score > 0 ? 10 : 0 },
      { signal: 'languages', value: 'en-US', weight: 12, contribution: score > 0 ? 12 : 0 },
    ],
  };
}

function makePermissions(
  state: PermissionState,
  names: string[] = ['geolocation', 'camera', 'microphone', 'notifications'],
): PermissionCheckResult[] {
  return names.map((name) => ({ name, state }));
}

function makePermissionsWithOverrides(
  defaults: PermissionState,
  overrides: Record<string, PermissionState>,
): PermissionCheckResult[] {
  const names = ['geolocation', 'camera', 'microphone', 'notifications', 'push', 'persistent-storage'];
  return names.map((name) => ({
    name,
    state: overrides[name] ?? defaults,
  }));
}

function makeDebt(score: number): PermissionDebtResult {
  return {
    score,
    maxPossible: 100,
    breakdown: [],
  };
}

function makeInference(
  statement: string,
  confidence: 'low' | 'medium' | 'high' = 'medium',
): InferenceStatement {
  return {
    statement,
    evidence: [{ signal: 'test', value: 'test-value', source: 'test-source' }],
    confidence,
    marker: INFERENCE_MARKER,
  };
}

function makeThreatFinding(overrides: Partial<ThreatFinding> = {}): ThreatFinding {
  return {
    ruleId: overrides.ruleId ?? 'test-threat',
    title: overrides.title ?? 'Test Threat',
    severity: overrides.severity ?? 'Medium',
    description: overrides.description ?? 'A test threat finding.',
    evidence: overrides.evidence ?? ['test evidence'],
    userImpact: overrides.userImpact ?? 'Test user impact.',
    category: overrides.category ?? 'identity-exposure',
  };
}

function makeInput(overrides: Partial<HardeningInput> = {}): HardeningInput {
  return {
    snapshot: overrides.snapshot ?? makeSnapshot(),
    permissions: overrides.permissions ?? makePermissions('denied'),
    entropy: overrides.entropy ?? makeEntropy(50),
    permissionDebt: overrides.permissionDebt ?? makeDebt(0),
    inferences: overrides.inferences ?? [],
    threats: overrides.threats ?? [],
  };
}

// ---------------------------------------------------------------------------
// Maximally-exposed input that triggers all 7 rules
// ---------------------------------------------------------------------------

function makeMaxInput(): HardeningInput {
  return makeInput({
    snapshot: makeSnapshot({ doNotTrack: 'unspecified' }),
    permissions: makePermissionsWithOverrides('denied', {
      camera: 'granted',
      microphone: 'granted',
      geolocation: 'granted',
      notifications: 'granted',
      push: 'granted',
      'persistent-storage': 'granted',
    }),
    entropy: makeEntropy(90),
    permissionDebt: makeDebt(60),
    inferences: [
      makeInference('Located in North America', 'high'),
      makeInference('English speaker', 'high'),
      makeInference('Desktop user', 'medium'),
    ],
    threats: [makeThreatFinding()],
  });
}

// ---------------------------------------------------------------------------
// Clean/benign input that triggers no rules
// ---------------------------------------------------------------------------

function makeCleanInput(): HardeningInput {
  return makeInput({
    snapshot: makeSnapshot({ doNotTrack: '1' }),
    permissions: makePermissions('denied'),
    entropy: makeEntropy(20),
    permissionDebt: makeDebt(0),
    inferences: [],
    threats: [],
  });
}

// ---------------------------------------------------------------------------
// Fear-based and certainty language patterns
// ---------------------------------------------------------------------------

const FEAR_WORDS = [
  'danger',
  'dangerous',
  'attack',
  'attacked',
  'hacked',
  'hacking',
  'vulnerable',
  'vulnerability',
  'exploit',
  'exploited',
  'catastroph',
  'devastating',
  'terrifying',
  'panic',
];

const CERTAINTY_WORDS = [
  'definitely',
  'certainly',
  'always',
  'guaranteed',
  'absolute',
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('US-030: hardening module renderer', () => {
  // =========================================================================
  // AC #1: Actions list rendered
  // =========================================================================
  describe('actions list rendered', () => {
    it('renderHardeningModule creates a section element', async () => {
      const { renderHardeningModule } = await import(
        '../../src/modules/hardening/hardening-module'
      );
      const container = document.createElement('div');
      await renderHardeningModule(container);
      const section = container.querySelector('section');
      expect(section).not.toBeNull();
    });

    it('section contains a heading', async () => {
      const { renderHardeningModule } = await import(
        '../../src/modules/hardening/hardening-module'
      );
      const container = document.createElement('div');
      await renderHardeningModule(container);
      const heading = container.querySelector('h2');
      expect(heading).not.toBeNull();
      expect(heading!.textContent?.toLowerCase()).toContain('hardening');
    });

    it('renders cards when recommendations exist (max-exposed input)', async () => {
      // We mock the data pipeline to inject controlled input
      vi.doMock('../../src/signals/snapshot', () => ({
        collectSnapshot: () => makeSnapshot({ doNotTrack: 'unspecified' }),
      }));
      vi.doMock('../../src/permissions/permissions-adapter', () => ({
        checkPermissions: async () =>
          makePermissionsWithOverrides('denied', {
            camera: 'granted',
            microphone: 'granted',
            geolocation: 'granted',
            notifications: 'granted',
            push: 'granted',
            'persistent-storage': 'granted',
          }),
      }));
      vi.doMock('../../src/scoring/entropy-score', () => ({
        calculateEntropyScore: () => makeEntropy(90),
      }));
      vi.doMock('../../src/scoring/permission-debt-score', () => ({
        calculatePermissionDebtScore: () => makeDebt(60),
      }));
      vi.doMock('../../src/modules/shadow-profile/inference-rules', () => ({
        applyInferenceRules: () => [
          makeInference('Located in North America', 'high'),
          makeInference('English speaker', 'high'),
          makeInference('Desktop user', 'medium'),
        ],
      }));
      vi.doMock('../../src/modules/threat-model/threat-rules', () => ({
        evaluateThreatRules: () => [makeThreatFinding()],
      }));

      const { renderHardeningModule } = await import(
        '../../src/modules/hardening/hardening-module'
      );
      const container = document.createElement('div');
      await renderHardeningModule(container);

      const cards = container.querySelectorAll('[class*="hardening-card"], [class*="card"]');
      expect(cards.length).toBeGreaterThan(0);

      vi.resetModules();
    });

    it('renders 7 cards when all rules trigger', () => {
      const input = makeMaxInput();
      const recommendations = evaluateHardeningRules(input);
      expect(recommendations.length).toBe(7);
    });
  });

  // =========================================================================
  // AC #2: Actions concise and readable
  // =========================================================================
  describe('actions concise and readable', () => {
    it('every recommendation title is under 60 characters', () => {
      const recommendations = evaluateHardeningRules(makeMaxInput());
      for (const rec of recommendations) {
        expect(rec.title.length).toBeLessThanOrEqual(60);
      }
    });

    it('every recommendation description is under 300 characters', () => {
      const recommendations = evaluateHardeningRules(makeMaxInput());
      for (const rec of recommendations) {
        expect(rec.description.length).toBeLessThanOrEqual(300);
      }
    });

    it('every action step is under 120 characters', () => {
      const recommendations = evaluateHardeningRules(makeMaxInput());
      for (const rec of recommendations) {
        for (const step of rec.actionSteps) {
          expect(step.length).toBeLessThanOrEqual(120);
        }
      }
    });

    it('each card contains all required elements: title, description, actionSteps, expectedOutcome, difficulty, relatedFindings', () => {
      const recommendations = evaluateHardeningRules(makeMaxInput());
      expect(recommendations.length).toBeGreaterThan(0);

      for (const rec of recommendations) {
        expect(rec.title).toBeTruthy();
        expect(rec.description).toBeTruthy();
        expect(rec.actionSteps.length).toBeGreaterThan(0);
        expect(rec.expectedOutcome).toBeTruthy();
        expect(['Easy', 'Medium', 'Hard']).toContain(rec.difficulty);
        expect(rec.relatedFindings.length).toBeGreaterThan(0);
      }
    });

    it('actionSteps are ordered (numbered list semantic)', () => {
      const recommendations = evaluateHardeningRules(makeMaxInput());
      for (const rec of recommendations) {
        // actionSteps is an array — when rendered, each element should be an <li> in an <ol>
        expect(Array.isArray(rec.actionSteps)).toBe(true);
        expect(rec.actionSteps.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  // =========================================================================
  // AC #3: Actions adapt to findings
  // =========================================================================
  describe('actions adapt to findings', () => {
    it('different inputs produce different recommendation counts', () => {
      const maxRecs = evaluateHardeningRules(makeMaxInput());
      const cleanRecs = evaluateHardeningRules(makeCleanInput());
      expect(maxRecs.length).not.toBe(cleanRecs.length);
    });

    it('clean input produces zero recommendations', () => {
      const recommendations = evaluateHardeningRules(makeCleanInput());
      expect(recommendations).toHaveLength(0);
    });

    it('max-exposed input produces 7 recommendations', () => {
      const recommendations = evaluateHardeningRules(makeMaxInput());
      expect(recommendations).toHaveLength(7);
    });

    it('partial exposure produces subset of recommendations', () => {
      const partialInput = makeInput({
        snapshot: makeSnapshot({ doNotTrack: 'unspecified' }),
        permissions: makePermissions('denied'),
        entropy: makeEntropy(80),
        permissionDebt: makeDebt(0),
        inferences: [],
        threats: [],
      });
      const recommendations = evaluateHardeningRules(partialInput);
      // Should trigger: enable-do-not-track, reduce-fingerprint-surface, clear-persistent-storage
      // (default snapshot has all storage supported + entropy >= 30)
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.length).toBeLessThan(7);
    });

    it('only permission-related rules fire when only permissions are exposed', () => {
      const input = makeInput({
        snapshot: makeSnapshot({ doNotTrack: '1' }),
        permissions: makePermissionsWithOverrides('denied', {
          camera: 'granted',
          notifications: 'granted',
        }),
        entropy: makeEntropy(20),
        permissionDebt: makeDebt(0),
        inferences: [],
        threats: [],
      });
      const recommendations = evaluateHardeningRules(input);
      const ids = recommendations.map((r) => r.id);
      expect(ids).toContain('revoke-high-risk-permissions');
      expect(ids).toContain('review-notification-permissions');
      expect(ids).not.toContain('enable-do-not-track');
      expect(ids).not.toContain('reduce-fingerprint-surface');
      expect(ids).not.toContain('audit-permission-debt');
      expect(ids).not.toContain('isolate-browsing-profiles');
    });
  });

  // =========================================================================
  // AC #4: No fear-based language
  // =========================================================================
  describe('no fear-based language', () => {
    it('no recommendation text contains fear-based words', () => {
      const recommendations = evaluateHardeningRules(makeMaxInput());
      expect(recommendations.length).toBeGreaterThan(0);

      for (const rec of recommendations) {
        const allText = [
          rec.title,
          rec.description,
          rec.expectedOutcome,
          ...rec.actionSteps,
        ]
          .join(' ')
          .toLowerCase();

        for (const word of FEAR_WORDS) {
          expect(allText).not.toContain(word);
        }
      }
    });

    it('no recommendation text contains certainty words', () => {
      const recommendations = evaluateHardeningRules(makeMaxInput());
      expect(recommendations.length).toBeGreaterThan(0);

      for (const rec of recommendations) {
        const allText = [
          rec.title,
          rec.description,
          rec.expectedOutcome,
          ...rec.actionSteps,
        ]
          .join(' ')
          .toLowerCase();

        for (const word of CERTAINTY_WORDS) {
          expect(allText).not.toContain(word);
        }
      }
    });

    it('descriptions use hedged language (may, can, could, suggests)', () => {
      const recommendations = evaluateHardeningRules(makeMaxInput());
      const hedgeWords = ['may', 'can', 'could', 'suggests', 'potential', 'possible'];

      // At least some recommendations should use hedged language
      const hasHedgedLanguage = recommendations.some((rec) => {
        const text = rec.description.toLowerCase();
        return hedgeWords.some((w) => text.includes(w));
      });
      expect(hasHedgedLanguage).toBe(true);
    });
  });

  // =========================================================================
  // Empty state
  // =========================================================================
  describe('empty state', () => {
    it('renders empty-state message when no rules trigger', async () => {
      vi.doMock('../../src/signals/snapshot', () => ({
        collectSnapshot: () => makeSnapshot({ doNotTrack: '1' }),
      }));
      vi.doMock('../../src/permissions/permissions-adapter', () => ({
        checkPermissions: async () => makePermissions('denied'),
      }));
      vi.doMock('../../src/scoring/entropy-score', () => ({
        calculateEntropyScore: () => makeEntropy(20),
      }));
      vi.doMock('../../src/scoring/permission-debt-score', () => ({
        calculatePermissionDebtScore: () => makeDebt(0),
      }));
      vi.doMock('../../src/modules/shadow-profile/inference-rules', () => ({
        applyInferenceRules: () => [],
      }));
      vi.doMock('../../src/modules/threat-model/threat-rules', () => ({
        evaluateThreatRules: () => [],
      }));

      const { renderHardeningModule } = await import(
        '../../src/modules/hardening/hardening-module'
      );
      const container = document.createElement('div');
      await renderHardeningModule(container);

      const text = container.textContent?.toLowerCase() ?? '';
      // Should have some positive empty-state message
      const hasEmptyState =
        text.includes('no immediate actions') ||
        text.includes('strong') ||
        text.includes('no recommendations') ||
        text.includes('looking good');
      expect(hasEmptyState).toBe(true);

      vi.resetModules();
    });

    it('clean input triggers zero rules (data layer)', () => {
      const recommendations = evaluateHardeningRules(makeCleanInput());
      expect(recommendations).toEqual([]);
    });
  });

  // =========================================================================
  // Accessibility
  // =========================================================================
  describe('accessibility', () => {
    it('section has proper heading', async () => {
      const { renderHardeningModule } = await import(
        '../../src/modules/hardening/hardening-module'
      );
      const container = document.createElement('div');
      await renderHardeningModule(container);
      const h2 = container.querySelector('h2');
      expect(h2).not.toBeNull();
      expect(h2!.textContent!.trim().length).toBeGreaterThan(0);
    });

    it('difficulty badges convey meaning via text, not color alone', () => {
      const recommendations = evaluateHardeningRules(makeMaxInput());
      const difficulties = recommendations.map((r) => r.difficulty);
      // Each difficulty value is a readable text label
      for (const d of difficulties) {
        expect(['Easy', 'Medium', 'Hard']).toContain(d);
        expect(typeof d).toBe('string');
        expect(d.length).toBeGreaterThan(0);
      }
    });

    it('action steps data is suitable for ordered list rendering (ol/li)', () => {
      const recommendations = evaluateHardeningRules(makeMaxInput());
      for (const rec of recommendations) {
        expect(Array.isArray(rec.actionSteps)).toBe(true);
        for (const step of rec.actionSteps) {
          expect(typeof step).toBe('string');
          expect(step.trim().length).toBeGreaterThan(0);
        }
      }
    });
  });

  // =========================================================================
  // Recommendation shape validation
  // =========================================================================
  describe('recommendation shape validation', () => {
    it('every recommendation has a unique id', () => {
      const recommendations = evaluateHardeningRules(makeMaxInput());
      const ids = recommendations.map((r) => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('every recommendation has a non-empty source', () => {
      const recommendations = evaluateHardeningRules(makeMaxInput());
      for (const rec of recommendations) {
        expect(rec.source.length).toBeGreaterThan(0);
      }
    });

    it('every recommendation has at least one related finding', () => {
      const recommendations = evaluateHardeningRules(makeMaxInput());
      for (const rec of recommendations) {
        expect(rec.relatedFindings.length).toBeGreaterThan(0);
      }
    });

    it('every recommendation has a non-empty expectedOutcome', () => {
      const recommendations = evaluateHardeningRules(makeMaxInput());
      for (const rec of recommendations) {
        expect(rec.expectedOutcome.trim().length).toBeGreaterThan(0);
      }
    });
  });

  // =========================================================================
  // Module exports
  // =========================================================================
  describe('module exports', () => {
    it('hardening-module exports renderHardeningModule', async () => {
      const mod = await import('../../src/modules/hardening/hardening-module');
      expect(typeof mod.renderHardeningModule).toBe('function');
    });

    it('index re-exports renderHardeningModule', async () => {
      const mod = await import('../../src/modules/hardening/index');
      expect(typeof (mod as Record<string, unknown>).renderHardeningModule).toBe('function');
    });
  });
});
