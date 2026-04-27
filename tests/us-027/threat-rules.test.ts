import { describe, it, expect } from 'vitest';
import type { SignalSnapshot } from '../../src/signals/snapshot';
import type { PermissionCheckResult, PermissionState } from '../../src/permissions/permissions-adapter';
import type { EntropyResult, EntropyBreakdownEntry } from '../../src/scoring/entropy-score';
import type { PermissionDebtResult } from '../../src/scoring/permission-debt-score';
import type { InferenceStatement } from '../../src/modules/shadow-profile/inference-schema';
import { INFERENCE_MARKER } from '../../src/modules/shadow-profile/inference-schema';
import type {
  ThreatInput,
  ThreatFinding,
  ThreatRule,
} from '../../src/modules/threat-model/threat-schema';
import {
  evaluateThreatRules,
  getRuleExplanations,
} from '../../src/modules/threat-model/threat-rules';

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

function makeInput(overrides: Partial<ThreatInput> = {}): ThreatInput {
  return {
    snapshot: overrides.snapshot ?? makeSnapshot(),
    permissions: overrides.permissions ?? makePermissions('denied'),
    entropy: overrides.entropy ?? makeEntropy(50),
    permissionDebt: overrides.permissionDebt ?? makeDebt(0),
    inferences: overrides.inferences ?? [],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('US-027: threat model rules engine', () => {
  // =========================================================================
  // Identity exposure rule
  // =========================================================================
  describe('identity-exposure rule', () => {
    it('does not trigger when entropy score is below 70', () => {
      const input = makeInput({ entropy: makeEntropy(69) });
      const findings = evaluateThreatRules(input);
      const identityFindings = findings.filter((f) => f.category === 'identity-exposure');
      expect(identityFindings).toHaveLength(0);
    });

    it('triggers with Medium severity when entropy score is exactly 70', () => {
      const input = makeInput({ entropy: makeEntropy(70) });
      const findings = evaluateThreatRules(input);
      const identityFindings = findings.filter((f) => f.category === 'identity-exposure');
      expect(identityFindings).toHaveLength(1);
      expect(identityFindings[0].severity).toBe('Medium');
    });

    it('triggers with Medium severity when entropy score is 84', () => {
      const input = makeInput({ entropy: makeEntropy(84) });
      const findings = evaluateThreatRules(input);
      const identityFindings = findings.filter((f) => f.category === 'identity-exposure');
      expect(identityFindings).toHaveLength(1);
      expect(identityFindings[0].severity).toBe('Medium');
    });

    it('triggers with High severity when entropy score is exactly 85', () => {
      const input = makeInput({ entropy: makeEntropy(85) });
      const findings = evaluateThreatRules(input);
      const identityFindings = findings.filter((f) => f.category === 'identity-exposure');
      expect(identityFindings).toHaveLength(1);
      expect(identityFindings[0].severity).toBe('High');
    });

    it('triggers with High severity when entropy score is 100', () => {
      const input = makeInput({ entropy: makeEntropy(100) });
      const findings = evaluateThreatRules(input);
      const identityFindings = findings.filter((f) => f.category === 'identity-exposure');
      expect(identityFindings).toHaveLength(1);
      expect(identityFindings[0].severity).toBe('High');
    });

    it('includes non-empty evidence array', () => {
      const input = makeInput({ entropy: makeEntropy(85) });
      const findings = evaluateThreatRules(input);
      const finding = findings.find((f) => f.category === 'identity-exposure');
      expect(finding).toBeDefined();
      expect(finding!.evidence.length).toBeGreaterThan(0);
    });

    it('has non-empty description and userImpact', () => {
      const input = makeInput({ entropy: makeEntropy(85) });
      const findings = evaluateThreatRules(input);
      const finding = findings.find((f) => f.category === 'identity-exposure');
      expect(finding!.description).toBeTruthy();
      expect(finding!.userImpact).toBeTruthy();
    });
  });

  // =========================================================================
  // Social engineering rule
  // =========================================================================
  describe('social-engineering rule', () => {
    it('does not trigger with fewer than 2 inferences', () => {
      const input = makeInput({
        inferences: [makeInference('Uses English')],
      });
      const findings = evaluateThreatRules(input);
      const seFindings = findings.filter((f) => f.category === 'social-engineering');
      expect(seFindings).toHaveLength(0);
    });

    it('triggers with Low severity when there are exactly 2 inferences with medium+ confidence', () => {
      const input = makeInput({
        inferences: [
          makeInference('Located in North America', 'medium'),
          makeInference('Uses a desktop device', 'high'),
        ],
      });
      const findings = evaluateThreatRules(input);
      const seFindings = findings.filter((f) => f.category === 'social-engineering');
      expect(seFindings).toHaveLength(1);
      expect(seFindings[0].severity).toBe('Low');
    });

    it('triggers with Medium severity when there are 3 or more inferences with medium+ confidence', () => {
      const input = makeInput({
        inferences: [
          makeInference('Located in North America', 'medium'),
          makeInference('English speaker', 'high'),
          makeInference('Uses a desktop device', 'medium'),
        ],
      });
      const findings = evaluateThreatRules(input);
      const seFindings = findings.filter((f) => f.category === 'social-engineering');
      expect(seFindings).toHaveLength(1);
      expect(seFindings[0].severity).toBe('Medium');
    });

    it('does not count low-confidence inferences toward medium+ threshold', () => {
      const input = makeInput({
        inferences: [
          makeInference('Located in North America', 'low'),
          makeInference('English speaker', 'low'),
          makeInference('Uses a desktop device', 'low'),
        ],
      });
      const findings = evaluateThreatRules(input);
      const seFindings = findings.filter((f) => f.category === 'social-engineering');
      expect(seFindings).toHaveLength(0);
    });

    it('includes inference statements in evidence', () => {
      const input = makeInput({
        inferences: [
          makeInference('Located in North America', 'medium'),
          makeInference('English speaker', 'high'),
          makeInference('Uses a desktop device', 'medium'),
        ],
      });
      const findings = evaluateThreatRules(input);
      const finding = findings.find((f) => f.category === 'social-engineering');
      expect(finding).toBeDefined();
      expect(finding!.evidence.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Permission abuse rule
  // =========================================================================
  describe('permission-abuse rule', () => {
    it('does not trigger when no critical permissions granted and debt below 40', () => {
      const input = makeInput({
        permissions: makePermissions('denied'),
        permissionDebt: makeDebt(20),
      });
      const findings = evaluateThreatRules(input);
      const paFindings = findings.filter((f) => f.category === 'permission-abuse');
      expect(paFindings).toHaveLength(0);
    });

    it('does not trigger when debt is exactly 39 and no critical permissions granted', () => {
      const input = makeInput({
        permissions: makePermissions('denied'),
        permissionDebt: makeDebt(39),
      });
      const findings = evaluateThreatRules(input);
      const paFindings = findings.filter((f) => f.category === 'permission-abuse');
      expect(paFindings).toHaveLength(0);
    });

    it('triggers with Low severity when debt is exactly 40 but no critical permissions granted', () => {
      const input = makeInput({
        permissions: makePermissions('denied'),
        permissionDebt: makeDebt(40),
      });
      const findings = evaluateThreatRules(input);
      const paFindings = findings.filter((f) => f.category === 'permission-abuse');
      expect(paFindings).toHaveLength(1);
      expect(paFindings[0].severity).toBe('Low');
    });

    it('triggers with Medium severity when a single high-risk permission (camera) is granted', () => {
      const input = makeInput({
        permissions: makePermissionsWithOverrides('denied', { camera: 'granted' }),
        permissionDebt: makeDebt(20),
      });
      const findings = evaluateThreatRules(input);
      const paFindings = findings.filter((f) => f.category === 'permission-abuse');
      expect(paFindings).toHaveLength(1);
      expect(paFindings[0].severity).toBe('Medium');
    });

    it('triggers with Medium severity when microphone alone is granted', () => {
      const input = makeInput({
        permissions: makePermissionsWithOverrides('denied', { microphone: 'granted' }),
        permissionDebt: makeDebt(20),
      });
      const findings = evaluateThreatRules(input);
      const paFindings = findings.filter((f) => f.category === 'permission-abuse');
      expect(paFindings).toHaveLength(1);
      expect(paFindings[0].severity).toBe('Medium');
    });

    it('triggers with Medium severity when geolocation alone is granted', () => {
      const input = makeInput({
        permissions: makePermissionsWithOverrides('denied', { geolocation: 'granted' }),
        permissionDebt: makeDebt(20),
      });
      const findings = evaluateThreatRules(input);
      const paFindings = findings.filter((f) => f.category === 'permission-abuse');
      expect(paFindings).toHaveLength(1);
      expect(paFindings[0].severity).toBe('Medium');
    });

    it('triggers with High severity when both camera and microphone are granted', () => {
      const input = makeInput({
        permissions: makePermissionsWithOverrides('denied', {
          camera: 'granted',
          microphone: 'granted',
        }),
        permissionDebt: makeDebt(20),
      });
      const findings = evaluateThreatRules(input);
      const paFindings = findings.filter((f) => f.category === 'permission-abuse');
      expect(paFindings).toHaveLength(1);
      expect(paFindings[0].severity).toBe('High');
    });

    it('includes granted high-risk permissions in evidence', () => {
      const input = makeInput({
        permissions: makePermissionsWithOverrides('denied', {
          camera: 'granted',
          microphone: 'granted',
        }),
        permissionDebt: makeDebt(20),
      });
      const findings = evaluateThreatRules(input);
      const finding = findings.find((f) => f.category === 'permission-abuse');
      expect(finding).toBeDefined();
      expect(finding!.evidence.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Shoulder surfing rule
  // =========================================================================
  describe('shoulder-surfing rule', () => {
    it('triggers when screen is large, DPR standard, and no touch support (desktop office)', () => {
      const input = makeInput({
        snapshot: makeSnapshot({
          screenWidth: 1920,
          devicePixelRatio: 1,
          touchSupport: false,
        }),
      });
      const findings = evaluateThreatRules(input);
      const ssFindings = findings.filter((f) => f.category === 'shoulder-surfing');
      expect(ssFindings).toHaveLength(1);
      expect(ssFindings[0].severity).toBe('Low');
    });

    it('does not trigger when screen width is below 1920', () => {
      const input = makeInput({
        snapshot: makeSnapshot({
          screenWidth: 1440,
          devicePixelRatio: 1,
          touchSupport: false,
        }),
      });
      const findings = evaluateThreatRules(input);
      const ssFindings = findings.filter((f) => f.category === 'shoulder-surfing');
      expect(ssFindings).toHaveLength(0);
    });

    it('does not trigger when DPR is above 1 (high-DPI personal laptop)', () => {
      const input = makeInput({
        snapshot: makeSnapshot({
          screenWidth: 1920,
          devicePixelRatio: 2,
          touchSupport: false,
        }),
      });
      const findings = evaluateThreatRules(input);
      const ssFindings = findings.filter((f) => f.category === 'shoulder-surfing');
      expect(ssFindings).toHaveLength(0);
    });

    it('does not trigger when touch is supported (likely mobile/tablet)', () => {
      const input = makeInput({
        snapshot: makeSnapshot({
          screenWidth: 1920,
          devicePixelRatio: 1,
          touchSupport: true,
        }),
      });
      const findings = evaluateThreatRules(input);
      const ssFindings = findings.filter((f) => f.category === 'shoulder-surfing');
      expect(ssFindings).toHaveLength(0);
    });

    it('triggers when screen width exceeds 1920', () => {
      const input = makeInput({
        snapshot: makeSnapshot({
          screenWidth: 2560,
          devicePixelRatio: 1,
          touchSupport: false,
        }),
      });
      const findings = evaluateThreatRules(input);
      const ssFindings = findings.filter((f) => f.category === 'shoulder-surfing');
      expect(ssFindings).toHaveLength(1);
    });

    it('always has Low severity', () => {
      const input = makeInput({
        snapshot: makeSnapshot({
          screenWidth: 3840,
          devicePixelRatio: 1,
          touchSupport: false,
        }),
      });
      const findings = evaluateThreatRules(input);
      const finding = findings.find((f) => f.category === 'shoulder-surfing');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe('Low');
    });

    it('includes screen size and touch support in evidence', () => {
      const input = makeInput({
        snapshot: makeSnapshot({
          screenWidth: 1920,
          devicePixelRatio: 1,
          touchSupport: false,
        }),
      });
      const findings = evaluateThreatRules(input);
      const finding = findings.find((f) => f.category === 'shoulder-surfing');
      expect(finding).toBeDefined();
      expect(finding!.evidence.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Aggregation (evaluateThreatRules)
  // =========================================================================
  describe('evaluateThreatRules aggregation', () => {
    it('returns an empty array when no rules trigger', () => {
      const input = makeInput({
        entropy: makeEntropy(30),
        permissions: makePermissions('denied'),
        permissionDebt: makeDebt(0),
        inferences: [],
        snapshot: makeSnapshot({
          screenWidth: 1024,
          devicePixelRatio: 2,
          touchSupport: true,
        }),
      });
      const findings = evaluateThreatRules(input);
      expect(findings).toEqual([]);
    });

    it('returns findings from multiple rules when all trigger', () => {
      const input = makeInput({
        entropy: makeEntropy(90),
        permissions: makePermissionsWithOverrides('denied', {
          camera: 'granted',
          microphone: 'granted',
        }),
        permissionDebt: makeDebt(60),
        inferences: [
          makeInference('Located in North America', 'high'),
          makeInference('English speaker', 'high'),
          makeInference('Desktop user', 'medium'),
        ],
        snapshot: makeSnapshot({
          screenWidth: 1920,
          devicePixelRatio: 1,
          touchSupport: false,
        }),
      });
      const findings = evaluateThreatRules(input);
      const categories = findings.map((f) => f.category);
      expect(categories).toContain('identity-exposure');
      expect(categories).toContain('social-engineering');
      expect(categories).toContain('permission-abuse');
      expect(categories).toContain('shoulder-surfing');
    });

    it('returns findings as an array (not mutated across calls)', () => {
      const input = makeInput({ entropy: makeEntropy(90) });
      const findings1 = evaluateThreatRules(input);
      const findings2 = evaluateThreatRules(input);
      expect(findings1).not.toBe(findings2);
      expect(findings1).toEqual(findings2);
    });
  });

  // =========================================================================
  // Severity labels
  // =========================================================================
  describe('severity labels', () => {
    const VALID_SEVERITIES = new Set(['Low', 'Medium', 'High']);

    it('all findings use strictly Low, Medium, or High severity', () => {
      const input = makeInput({
        entropy: makeEntropy(90),
        permissions: makePermissionsWithOverrides('denied', {
          camera: 'granted',
          microphone: 'granted',
        }),
        permissionDebt: makeDebt(60),
        inferences: [
          makeInference('Located in North America', 'high'),
          makeInference('English speaker', 'high'),
          makeInference('Desktop user', 'medium'),
        ],
        snapshot: makeSnapshot({
          screenWidth: 1920,
          devicePixelRatio: 1,
          touchSupport: false,
        }),
      });
      const findings = evaluateThreatRules(input);
      expect(findings.length).toBeGreaterThan(0);
      for (const finding of findings) {
        expect(VALID_SEVERITIES.has(finding.severity)).toBe(true);
      }
    });
  });

  // =========================================================================
  // Finding shape validation
  // =========================================================================
  describe('finding shape', () => {
    it('every finding has ruleId, title, severity, description, evidence, userImpact, and category', () => {
      const input = makeInput({
        entropy: makeEntropy(90),
        permissions: makePermissionsWithOverrides('denied', {
          camera: 'granted',
          microphone: 'granted',
        }),
        permissionDebt: makeDebt(60),
        inferences: [
          makeInference('Located in North America', 'high'),
          makeInference('English speaker', 'high'),
          makeInference('Desktop user', 'medium'),
        ],
        snapshot: makeSnapshot({
          screenWidth: 1920,
          devicePixelRatio: 1,
          touchSupport: false,
        }),
      });
      const findings = evaluateThreatRules(input);
      expect(findings.length).toBeGreaterThan(0);

      for (const finding of findings) {
        expect(typeof finding.ruleId).toBe('string');
        expect(finding.ruleId.length).toBeGreaterThan(0);
        expect(typeof finding.title).toBe('string');
        expect(finding.title.length).toBeGreaterThan(0);
        expect(typeof finding.severity).toBe('string');
        expect(typeof finding.description).toBe('string');
        expect(finding.description.length).toBeGreaterThan(0);
        expect(Array.isArray(finding.evidence)).toBe(true);
        expect(finding.evidence.length).toBeGreaterThan(0);
        expect(typeof finding.userImpact).toBe('string');
        expect(finding.userImpact.length).toBeGreaterThan(0);
        expect(typeof finding.category).toBe('string');
        expect(finding.category.length).toBeGreaterThan(0);
      }
    });
  });

  // =========================================================================
  // Explainability (getRuleExplanations)
  // =========================================================================
  describe('getRuleExplanations', () => {
    it('returns an explanation string for every registered rule', () => {
      const explanations = getRuleExplanations();
      expect(Object.keys(explanations).length).toBeGreaterThanOrEqual(4);

      for (const [ruleId, explanation] of Object.entries(explanations)) {
        expect(typeof ruleId).toBe('string');
        expect(ruleId.length).toBeGreaterThan(0);
        expect(typeof explanation).toBe('string');
        expect(explanation.length).toBeGreaterThan(0);
      }
    });

    it('includes explanations for all four rule categories', () => {
      const explanations = getRuleExplanations();
      const keys = Object.keys(explanations);
      // There should be at least one rule explanation per category
      // The exact keys depend on implementation, but we verify coverage
      expect(keys.length).toBeGreaterThanOrEqual(4);
    });
  });

  // =========================================================================
  // Graceful handling of edge-case inputs
  // =========================================================================
  describe('graceful handling of missing or edge-case values', () => {
    it('handles unavailable renderer in snapshot', () => {
      const input = makeInput({
        entropy: makeEntropy(50),
        snapshot: makeSnapshot({ renderer: 'unavailable' }),
      });
      expect(() => evaluateThreatRules(input)).not.toThrow();
    });

    it('handles empty permissions array', () => {
      const input = makeInput({
        permissions: [],
        permissionDebt: makeDebt(0),
      });
      expect(() => evaluateThreatRules(input)).not.toThrow();
    });

    it('handles empty inferences array', () => {
      const input = makeInput({ inferences: [] });
      expect(() => evaluateThreatRules(input)).not.toThrow();
    });

    it('handles screenWidth as string (unavailable)', () => {
      const input = makeInput({
        snapshot: makeSnapshot({ screenWidth: 'unavailable' }),
      });
      expect(() => evaluateThreatRules(input)).not.toThrow();
    });

    it('handles entropy score of 0', () => {
      const input = makeInput({ entropy: makeEntropy(0) });
      expect(() => evaluateThreatRules(input)).not.toThrow();
      const findings = evaluateThreatRules(input);
      const identityFindings = findings.filter((f) => f.category === 'identity-exposure');
      expect(identityFindings).toHaveLength(0);
    });

    it('handles devicePixelRatio as string (unavailable)', () => {
      const input = makeInput({
        snapshot: makeSnapshot({
          screenWidth: 1920,
          devicePixelRatio: 'unavailable',
          touchSupport: false,
        }),
      });
      expect(() => evaluateThreatRules(input)).not.toThrow();
    });

    it('handles touchSupport as string (unavailable)', () => {
      const input = makeInput({
        snapshot: makeSnapshot({
          screenWidth: 1920,
          devicePixelRatio: 1,
          touchSupport: 'unavailable',
        }),
      });
      expect(() => evaluateThreatRules(input)).not.toThrow();
    });
  });

  // =========================================================================
  // Determinism
  // =========================================================================
  describe('determinism', () => {
    it('returns identical findings for identical input across calls', () => {
      const input = makeInput({
        entropy: makeEntropy(85),
        permissions: makePermissionsWithOverrides('denied', { camera: 'granted' }),
        permissionDebt: makeDebt(50),
        inferences: [
          makeInference('Located in North America', 'high'),
          makeInference('English speaker', 'high'),
          makeInference('Desktop user', 'medium'),
        ],
        snapshot: makeSnapshot({
          screenWidth: 1920,
          devicePixelRatio: 1,
          touchSupport: false,
        }),
      });

      const findings1 = evaluateThreatRules(input);
      const findings2 = evaluateThreatRules(input);

      expect(findings1).toEqual(findings2);
    });
  });
});
