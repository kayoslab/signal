import { describe, it, expect } from 'vitest';
import type { SignalSnapshot } from '../../src/signals/snapshot';
import type { PermissionCheckResult, PermissionState } from '../../src/permissions/permissions-adapter';
import type { EntropyResult, EntropyBreakdownEntry } from '../../src/scoring/entropy-score';
import type { PermissionDebtResult } from '../../src/scoring/permission-debt-score';
import type { InferenceStatement } from '../../src/modules/shadow-profile/inference-schema';
import { INFERENCE_MARKER } from '../../src/modules/shadow-profile/inference-schema';
import type { ThreatFinding } from '../../src/modules/threat-model/threat-schema';
import type {
  HardeningInput,
  HardeningRecommendation,
} from '../../src/modules/hardening/hardening-schema';
import { evaluateHardeningRules } from '../../src/modules/hardening/hardening-rules';

// ---------------------------------------------------------------------------
// Factory helpers (reused from US-027 pattern)
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
      doNotTrack: overrides.doNotTrack ?? 'Enabled',
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
// Tests
// ---------------------------------------------------------------------------

describe('US-029: hardening recommendation rules', () => {
  // =========================================================================
  // Rule 1: Revoke unused high-risk permissions
  // =========================================================================
  describe('revoke high-risk permissions rule', () => {
    it('triggers when camera is granted', () => {
      const input = makeInput({
        permissions: makePermissionsWithOverrides('denied', { camera: 'granted' }),
      });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) => r.relatedFindings.includes('camera'));
      expect(match).toBeDefined();
    });

    it('triggers when microphone is granted', () => {
      const input = makeInput({
        permissions: makePermissionsWithOverrides('denied', { microphone: 'granted' }),
      });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) => r.relatedFindings.includes('microphone'));
      expect(match).toBeDefined();
    });

    it('triggers when geolocation is granted', () => {
      const input = makeInput({
        permissions: makePermissionsWithOverrides('denied', { geolocation: 'granted' }),
      });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) => r.relatedFindings.includes('geolocation'));
      expect(match).toBeDefined();
    });

    it('does not trigger when no high-risk permissions are granted', () => {
      const input = makeInput({
        permissions: makePermissions('denied'),
      });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) =>
        r.relatedFindings.some((f) => ['camera', 'microphone', 'geolocation'].includes(f)),
      );
      expect(match).toBeUndefined();
    });

    it('does not trigger when high-risk permissions are prompt', () => {
      const input = makeInput({
        permissions: makePermissions('prompt'),
      });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) =>
        r.relatedFindings.some((f) => ['camera', 'microphone', 'geolocation'].includes(f)),
      );
      expect(match).toBeUndefined();
    });

    it('has Easy difficulty', () => {
      const input = makeInput({
        permissions: makePermissionsWithOverrides('denied', { camera: 'granted' }),
      });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) => r.relatedFindings.includes('camera'));
      expect(match).toBeDefined();
      expect(match!.difficulty).toBe('Easy');
    });
  });

  // =========================================================================
  // Rule 2: Enable Do Not Track
  // =========================================================================
  describe('enable Do Not Track rule', () => {
    it('triggers when doNotTrack is not "Enabled"', () => {
      const input = makeInput({
        snapshot: makeSnapshot({ doNotTrack: 'Not Set' }),
      });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) => r.relatedFindings.includes('doNotTrack'));
      expect(match).toBeDefined();
    });

    it('triggers when doNotTrack is null/empty string', () => {
      const input = makeInput({
        snapshot: makeSnapshot({ doNotTrack: '' }),
      });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) => r.relatedFindings.includes('doNotTrack'));
      expect(match).toBeDefined();
    });

    it('does not trigger when doNotTrack is "Enabled"', () => {
      const input = makeInput({
        snapshot: makeSnapshot({ doNotTrack: 'Enabled' }),
      });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) => r.relatedFindings.includes('doNotTrack'));
      expect(match).toBeUndefined();
    });

    it('has Easy difficulty', () => {
      const input = makeInput({
        snapshot: makeSnapshot({ doNotTrack: 'Not Set' }),
      });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) => r.relatedFindings.includes('doNotTrack'));
      expect(match).toBeDefined();
      expect(match!.difficulty).toBe('Easy');
    });
  });

  // =========================================================================
  // Rule 3: Reduce fingerprint surface
  // =========================================================================
  describe('reduce fingerprint surface rule', () => {
    it('triggers when entropy score is exactly 70', () => {
      const input = makeInput({ entropy: makeEntropy(70) });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) => r.relatedFindings.includes('entropy'));
      expect(match).toBeDefined();
    });

    it('triggers when entropy score is above 70', () => {
      const input = makeInput({ entropy: makeEntropy(90) });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) => r.relatedFindings.includes('entropy'));
      expect(match).toBeDefined();
    });

    it('does not trigger when entropy score is below 70', () => {
      const input = makeInput({ entropy: makeEntropy(69) });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) => r.relatedFindings.includes('entropy'));
      expect(match).toBeUndefined();
    });

    it('does not trigger when entropy score is 0', () => {
      const input = makeInput({ entropy: makeEntropy(0) });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) => r.relatedFindings.includes('entropy'));
      expect(match).toBeUndefined();
    });

    it('has Medium difficulty', () => {
      const input = makeInput({ entropy: makeEntropy(75) });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) => r.relatedFindings.includes('entropy'));
      expect(match).toBeDefined();
      expect(match!.difficulty).toBe('Medium');
    });
  });

  // =========================================================================
  // Rule 4: Review notification permissions
  // =========================================================================
  describe('review notification permissions rule', () => {
    it('triggers when notifications are granted', () => {
      const input = makeInput({
        permissions: makePermissionsWithOverrides('denied', { notifications: 'granted' }),
      });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) => r.relatedFindings.includes('notifications'));
      expect(match).toBeDefined();
    });

    it('triggers when push is granted', () => {
      const input = makeInput({
        permissions: makePermissionsWithOverrides('denied', { push: 'granted' }),
      });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) => r.relatedFindings.includes('push'));
      expect(match).toBeDefined();
    });

    it('does not trigger when notifications and push are denied', () => {
      const input = makeInput({
        permissions: makePermissionsWithOverrides('denied', {}),
      });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) =>
        r.relatedFindings.some((f) => ['notifications', 'push'].includes(f)),
      );
      expect(match).toBeUndefined();
    });

    it('has Easy difficulty', () => {
      const input = makeInput({
        permissions: makePermissionsWithOverrides('denied', { notifications: 'granted' }),
      });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) => r.relatedFindings.includes('notifications'));
      expect(match).toBeDefined();
      expect(match!.difficulty).toBe('Easy');
    });
  });

  // =========================================================================
  // Rule 5: Isolate browsing profiles
  // =========================================================================
  describe('isolate browsing profiles rule', () => {
    it('triggers when 2 or more medium/high confidence inferences exist', () => {
      const input = makeInput({
        inferences: [
          makeInference('Located in North America', 'medium'),
          makeInference('English speaker', 'high'),
        ],
      });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) => r.relatedFindings.includes('inferences'));
      expect(match).toBeDefined();
    });

    it('triggers when 3 medium/high inferences exist', () => {
      const input = makeInput({
        inferences: [
          makeInference('Located in North America', 'medium'),
          makeInference('English speaker', 'high'),
          makeInference('Uses a desktop device', 'medium'),
        ],
      });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) => r.relatedFindings.includes('inferences'));
      expect(match).toBeDefined();
    });

    it('does not trigger with fewer than 2 medium/high inferences', () => {
      const input = makeInput({
        inferences: [makeInference('English speaker', 'medium')],
      });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) => r.relatedFindings.includes('inferences'));
      expect(match).toBeUndefined();
    });

    it('does not count low-confidence inferences', () => {
      const input = makeInput({
        inferences: [
          makeInference('Located in North America', 'low'),
          makeInference('English speaker', 'low'),
          makeInference('Desktop user', 'low'),
        ],
      });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) => r.relatedFindings.includes('inferences'));
      expect(match).toBeUndefined();
    });

    it('does not trigger with empty inferences array', () => {
      const input = makeInput({ inferences: [] });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) => r.relatedFindings.includes('inferences'));
      expect(match).toBeUndefined();
    });

    it('has Medium difficulty', () => {
      const input = makeInput({
        inferences: [
          makeInference('Located in North America', 'medium'),
          makeInference('English speaker', 'high'),
        ],
      });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) => r.relatedFindings.includes('inferences'));
      expect(match).toBeDefined();
      expect(match!.difficulty).toBe('Medium');
    });
  });

  // =========================================================================
  // Rule 6: Clear persistent storage
  // =========================================================================
  describe('clear persistent storage rule', () => {
    it('triggers when persistent-storage is granted', () => {
      const input = makeInput({
        permissions: makePermissionsWithOverrides('denied', { 'persistent-storage': 'granted' }),
      });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) => r.relatedFindings.includes('persistent-storage'));
      expect(match).toBeDefined();
    });

    it('triggers when all storage types are supported', () => {
      // Default makeSnapshot has all storage types true
      const input = makeInput({
        permissions: makePermissions('denied'),
      });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) =>
        r.relatedFindings.includes('persistent-storage') || r.relatedFindings.includes('storage'),
      );
      // Either persistent-storage granted OR all storage supported triggers this
      // With default denied permissions but all storage types supported, this should still trigger
      expect(match).toBeDefined();
    });

    it('has Easy difficulty', () => {
      const input = makeInput({
        permissions: makePermissionsWithOverrides('denied', { 'persistent-storage': 'granted' }),
      });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) => r.relatedFindings.includes('persistent-storage'));
      expect(match).toBeDefined();
      expect(match!.difficulty).toBe('Easy');
    });
  });

  // =========================================================================
  // Rule 7: Audit permission debt
  // =========================================================================
  describe('audit permission debt rule', () => {
    it('triggers when permission debt score is exactly 40', () => {
      const input = makeInput({ permissionDebt: makeDebt(40) });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) => r.relatedFindings.includes('permissionDebt'));
      expect(match).toBeDefined();
    });

    it('triggers when permission debt score is above 40', () => {
      const input = makeInput({ permissionDebt: makeDebt(80) });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) => r.relatedFindings.includes('permissionDebt'));
      expect(match).toBeDefined();
    });

    it('does not trigger when permission debt score is below 40', () => {
      const input = makeInput({ permissionDebt: makeDebt(39) });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) => r.relatedFindings.includes('permissionDebt'));
      expect(match).toBeUndefined();
    });

    it('does not trigger when permission debt score is 0', () => {
      const input = makeInput({ permissionDebt: makeDebt(0) });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) => r.relatedFindings.includes('permissionDebt'));
      expect(match).toBeUndefined();
    });

    it('has Medium difficulty', () => {
      const input = makeInput({ permissionDebt: makeDebt(50) });
      const recommendations = evaluateHardeningRules(input);
      const match = recommendations.find((r) => r.relatedFindings.includes('permissionDebt'));
      expect(match).toBeDefined();
      expect(match!.difficulty).toBe('Medium');
    });
  });

  // =========================================================================
  // AC #1: Rules respond to permissions findings
  // =========================================================================
  describe('acceptance criteria: responds to permissions findings', () => {
    it('generates recommendations when high-risk permissions are granted', () => {
      const input = makeInput({
        permissions: makePermissionsWithOverrides('denied', {
          camera: 'granted',
          microphone: 'granted',
          geolocation: 'granted',
        }),
      });
      const recommendations = evaluateHardeningRules(input);
      const permissionRelated = recommendations.filter((r) =>
        r.relatedFindings.some((f) =>
          ['camera', 'microphone', 'geolocation', 'notifications', 'push', 'permissionDebt'].includes(f),
        ),
      );
      expect(permissionRelated.length).toBeGreaterThan(0);
    });

    it('generates recommendation for high permission debt', () => {
      const input = makeInput({ permissionDebt: makeDebt(60) });
      const recommendations = evaluateHardeningRules(input);
      const debtRelated = recommendations.filter((r) =>
        r.relatedFindings.includes('permissionDebt'),
      );
      expect(debtRelated.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // AC #2: Rules respond to uniqueness findings
  // =========================================================================
  describe('acceptance criteria: responds to uniqueness findings', () => {
    it('generates fingerprint-reduction recommendation for high entropy', () => {
      const input = makeInput({ entropy: makeEntropy(85) });
      const recommendations = evaluateHardeningRules(input);
      const entropyRelated = recommendations.filter((r) =>
        r.relatedFindings.includes('entropy'),
      );
      expect(entropyRelated.length).toBeGreaterThan(0);
    });

    it('does not generate fingerprint recommendation for low entropy', () => {
      const input = makeInput({ entropy: makeEntropy(30) });
      const recommendations = evaluateHardeningRules(input);
      const entropyRelated = recommendations.filter((r) =>
        r.relatedFindings.includes('entropy'),
      );
      expect(entropyRelated).toHaveLength(0);
    });
  });

  // =========================================================================
  // AC #3: Rules respond to profile separation opportunities
  // =========================================================================
  describe('acceptance criteria: responds to profile separation opportunities', () => {
    it('recommends profile isolation when multiple inferences can be drawn', () => {
      const input = makeInput({
        inferences: [
          makeInference('Located in North America', 'medium'),
          makeInference('English speaker', 'high'),
          makeInference('Uses a desktop device', 'medium'),
        ],
      });
      const recommendations = evaluateHardeningRules(input);
      const profileRelated = recommendations.filter((r) =>
        r.relatedFindings.includes('inferences'),
      );
      expect(profileRelated.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // AC #4: At least 5 possible actions exist
  // =========================================================================
  describe('acceptance criteria: at least 5 possible actions', () => {
    it('returns at least 5 recommendations for a maximally-exposed input', () => {
      const input = makeInput({
        snapshot: makeSnapshot({ doNotTrack: 'Not Set' }),
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
      });
      const recommendations = evaluateHardeningRules(input);
      expect(recommendations.length).toBeGreaterThanOrEqual(5);
    });

    it('each recommendation has a unique id', () => {
      const input = makeInput({
        snapshot: makeSnapshot({ doNotTrack: 'Not Set' }),
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
      });
      const recommendations = evaluateHardeningRules(input);
      const ids = recommendations.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  // =========================================================================
  // No recommendations for benign input
  // =========================================================================
  describe('benign input produces no recommendations', () => {
    it('returns empty array when all signals are benign', () => {
      const input = makeInput({
        snapshot: makeSnapshot({ doNotTrack: 'Enabled' }),
        permissions: makePermissions('denied'),
        entropy: makeEntropy(20),
        permissionDebt: makeDebt(0),
        inferences: [],
        threats: [],
      });
      const recommendations = evaluateHardeningRules(input);
      expect(recommendations).toEqual([]);
    });
  });

  // =========================================================================
  // Recommendation shape validation
  // =========================================================================
  describe('recommendation shape', () => {
    it('every recommendation has all required fields', () => {
      const input = makeInput({
        snapshot: makeSnapshot({ doNotTrack: 'Not Set' }),
        permissions: makePermissionsWithOverrides('denied', {
          camera: 'granted',
          notifications: 'granted',
          'persistent-storage': 'granted',
        }),
        entropy: makeEntropy(80),
        permissionDebt: makeDebt(50),
        inferences: [
          makeInference('Located in North America', 'medium'),
          makeInference('English speaker', 'high'),
        ],
      });
      const recommendations = evaluateHardeningRules(input);
      expect(recommendations.length).toBeGreaterThan(0);

      for (const rec of recommendations) {
        expect(typeof rec.id).toBe('string');
        expect(rec.id.length).toBeGreaterThan(0);
        expect(typeof rec.title).toBe('string');
        expect(rec.title.length).toBeGreaterThan(0);
        expect(typeof rec.description).toBe('string');
        expect(rec.description.length).toBeGreaterThan(0);
        expect(Array.isArray(rec.actionSteps)).toBe(true);
        expect(rec.actionSteps.length).toBeGreaterThan(0);
        expect(typeof rec.expectedOutcome).toBe('string');
        expect(rec.expectedOutcome.length).toBeGreaterThan(0);
        expect(Array.isArray(rec.relatedFindings)).toBe(true);
        expect(rec.relatedFindings.length).toBeGreaterThan(0);
        expect(typeof rec.source).toBe('string');
        expect(rec.source.length).toBeGreaterThan(0);
        expect(['Easy', 'Medium', 'Hard']).toContain(rec.difficulty);
      }
    });

    it('all actionSteps are non-empty strings', () => {
      const input = makeInput({
        permissions: makePermissionsWithOverrides('denied', { camera: 'granted' }),
        entropy: makeEntropy(80),
      });
      const recommendations = evaluateHardeningRules(input);
      expect(recommendations.length).toBeGreaterThan(0);

      for (const rec of recommendations) {
        for (const step of rec.actionSteps) {
          expect(typeof step).toBe('string');
          expect(step.trim().length).toBeGreaterThan(0);
        }
      }
    });
  });

  // =========================================================================
  // Content language compliance
  // =========================================================================
  describe('content language compliance', () => {
    const CERTAINTY_WORDS = ['definitely', 'certainly', 'always', 'guaranteed', 'absolute'];
    const FEAR_WORDS = ['dangerous', 'hacked', 'attack', 'catastrophic', 'devastating'];

    function getAllTextFromRecommendation(rec: HardeningRecommendation): string {
      return [
        rec.title,
        rec.description,
        rec.expectedOutcome,
        ...rec.actionSteps,
      ].join(' ').toLowerCase();
    }

    it('no recommendation uses certainty language', () => {
      const input = makeInput({
        snapshot: makeSnapshot({ doNotTrack: 'Not Set' }),
        permissions: makePermissionsWithOverrides('denied', {
          camera: 'granted',
          microphone: 'granted',
          geolocation: 'granted',
          notifications: 'granted',
          'persistent-storage': 'granted',
        }),
        entropy: makeEntropy(90),
        permissionDebt: makeDebt(60),
        inferences: [
          makeInference('Located in North America', 'high'),
          makeInference('English speaker', 'high'),
        ],
      });
      const recommendations = evaluateHardeningRules(input);
      expect(recommendations.length).toBeGreaterThan(0);

      for (const rec of recommendations) {
        const text = getAllTextFromRecommendation(rec);
        for (const word of CERTAINTY_WORDS) {
          expect(text).not.toContain(word);
        }
      }
    });

    it('no recommendation uses fear language', () => {
      const input = makeInput({
        snapshot: makeSnapshot({ doNotTrack: 'Not Set' }),
        permissions: makePermissionsWithOverrides('denied', {
          camera: 'granted',
          microphone: 'granted',
          geolocation: 'granted',
          notifications: 'granted',
          'persistent-storage': 'granted',
        }),
        entropy: makeEntropy(90),
        permissionDebt: makeDebt(60),
        inferences: [
          makeInference('Located in North America', 'high'),
          makeInference('English speaker', 'high'),
        ],
      });
      const recommendations = evaluateHardeningRules(input);
      expect(recommendations.length).toBeGreaterThan(0);

      for (const rec of recommendations) {
        const text = getAllTextFromRecommendation(rec);
        for (const word of FEAR_WORDS) {
          expect(text).not.toContain(word);
        }
      }
    });
  });

  // =========================================================================
  // Determinism
  // =========================================================================
  describe('determinism', () => {
    it('returns identical recommendations for identical input across calls', () => {
      const input = makeInput({
        snapshot: makeSnapshot({ doNotTrack: 'Not Set' }),
        permissions: makePermissionsWithOverrides('denied', {
          camera: 'granted',
          notifications: 'granted',
        }),
        entropy: makeEntropy(80),
        permissionDebt: makeDebt(50),
        inferences: [
          makeInference('Located in North America', 'medium'),
          makeInference('English speaker', 'high'),
        ],
      });

      const result1 = evaluateHardeningRules(input);
      const result2 = evaluateHardeningRules(input);

      expect(result1).toEqual(result2);
    });

    it('returns a new array instance on each call', () => {
      const input = makeInput({ entropy: makeEntropy(80) });
      const result1 = evaluateHardeningRules(input);
      const result2 = evaluateHardeningRules(input);
      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });
  });

  // =========================================================================
  // Graceful handling of edge-case inputs
  // =========================================================================
  describe('graceful handling of edge-case inputs', () => {
    it('handles empty permissions array', () => {
      const input = makeInput({ permissions: [] });
      expect(() => evaluateHardeningRules(input)).not.toThrow();
    });

    it('handles empty inferences array', () => {
      const input = makeInput({ inferences: [] });
      expect(() => evaluateHardeningRules(input)).not.toThrow();
    });

    it('handles zero entropy score', () => {
      const input = makeInput({ entropy: makeEntropy(0) });
      expect(() => evaluateHardeningRules(input)).not.toThrow();
    });

    it('handles zero permission debt', () => {
      const input = makeInput({ permissionDebt: makeDebt(0) });
      expect(() => evaluateHardeningRules(input)).not.toThrow();
    });

    it('handles empty threats array', () => {
      const input = makeInput({ threats: [] });
      expect(() => evaluateHardeningRules(input)).not.toThrow();
    });

    it('handles maximum entropy score of 100', () => {
      const input = makeInput({ entropy: makeEntropy(100) });
      expect(() => evaluateHardeningRules(input)).not.toThrow();
      const recommendations = evaluateHardeningRules(input);
      const entropyRelated = recommendations.filter((r) =>
        r.relatedFindings.includes('entropy'),
      );
      expect(entropyRelated.length).toBeGreaterThan(0);
    });

    it('handles all permissions unsupported', () => {
      const input = makeInput({
        permissions: makePermissions('unsupported'),
      });
      expect(() => evaluateHardeningRules(input)).not.toThrow();
    });
  });
});
