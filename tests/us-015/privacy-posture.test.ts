import { describe, it, expect, beforeAll } from 'vitest';
import type { EntropyResult } from '../../src/scoring/entropy-score';

/**
 * The module under test does not exist yet.
 * These tests define the expected contract for `computePrivacyPosture()`.
 */

// Type the expected result shape
interface PrivacyPostureResult {
  entropyLabel: 'Low' | 'Moderate' | 'High';
  uniquenessEstimate: string;
  privacyPosture: string;
}

// Lazy import so tests fail clearly if the module is missing
let computePrivacyPosture: (entropy: EntropyResult) => PrivacyPostureResult;

beforeAll(async () => {
  const mod = await import('../../src/scoring/privacy-posture');
  computePrivacyPosture = mod.computePrivacyPosture;
});

/**
 * Helper: build an EntropyResult with a given score.
 * Breakdown and maxPossible are not used by the posture function,
 * but are required by the interface.
 */
function makeEntropyResult(score: number): EntropyResult {
  return {
    score,
    maxPossible: 84,
    breakdown: [],
  };
}

describe('US-015: privacy posture and uniqueness estimate', () => {
  // ── Return shape ──────────────────────────────────────────────────

  describe('return shape', () => {
    it('returns an object with entropyLabel, uniquenessEstimate, and privacyPosture', () => {
      const result = computePrivacyPosture(makeEntropyResult(50));

      expect(result).toHaveProperty('entropyLabel');
      expect(result).toHaveProperty('uniquenessEstimate');
      expect(result).toHaveProperty('privacyPosture');
    });

    it('entropyLabel is a string', () => {
      const result = computePrivacyPosture(makeEntropyResult(50));
      expect(typeof result.entropyLabel).toBe('string');
    });

    it('uniquenessEstimate is a non-empty string', () => {
      const result = computePrivacyPosture(makeEntropyResult(50));
      expect(typeof result.uniquenessEstimate).toBe('string');
      expect(result.uniquenessEstimate.length).toBeGreaterThan(0);
    });

    it('privacyPosture is a non-empty string', () => {
      const result = computePrivacyPosture(makeEntropyResult(50));
      expect(typeof result.privacyPosture).toBe('string');
      expect(result.privacyPosture.length).toBeGreaterThan(0);
    });
  });

  // ── Entropy label bands ───────────────────────────────────────────

  describe('entropy label: Low band (0–33)', () => {
    it('score 0 → Low', () => {
      expect(computePrivacyPosture(makeEntropyResult(0)).entropyLabel).toBe('Low');
    });

    it('score 1 → Low', () => {
      expect(computePrivacyPosture(makeEntropyResult(1)).entropyLabel).toBe('Low');
    });

    it('score 33 → Low (upper boundary)', () => {
      expect(computePrivacyPosture(makeEntropyResult(33)).entropyLabel).toBe('Low');
    });
  });

  describe('entropy label: Moderate band (34–66)', () => {
    it('score 34 → Moderate (lower boundary)', () => {
      expect(computePrivacyPosture(makeEntropyResult(34)).entropyLabel).toBe('Moderate');
    });

    it('score 50 → Moderate (midpoint)', () => {
      expect(computePrivacyPosture(makeEntropyResult(50)).entropyLabel).toBe('Moderate');
    });

    it('score 66 → Moderate (upper boundary)', () => {
      expect(computePrivacyPosture(makeEntropyResult(66)).entropyLabel).toBe('Moderate');
    });
  });

  describe('entropy label: High band (67–100)', () => {
    it('score 67 → High (lower boundary)', () => {
      expect(computePrivacyPosture(makeEntropyResult(67)).entropyLabel).toBe('High');
    });

    it('score 85 → High', () => {
      expect(computePrivacyPosture(makeEntropyResult(85)).entropyLabel).toBe('High');
    });

    it('score 100 → High (maximum)', () => {
      expect(computePrivacyPosture(makeEntropyResult(100)).entropyLabel).toBe('High');
    });
  });

  // ── Uniqueness estimate text ──────────────────────────────────────

  describe('uniqueness estimate text', () => {
    it('Low band estimate differs from Moderate band estimate', () => {
      const low = computePrivacyPosture(makeEntropyResult(20)).uniquenessEstimate;
      const moderate = computePrivacyPosture(makeEntropyResult(50)).uniquenessEstimate;
      expect(low).not.toBe(moderate);
    });

    it('Moderate band estimate differs from High band estimate', () => {
      const moderate = computePrivacyPosture(makeEntropyResult(50)).uniquenessEstimate;
      const high = computePrivacyPosture(makeEntropyResult(80)).uniquenessEstimate;
      expect(moderate).not.toBe(high);
    });

    it('Low band estimate differs from High band estimate', () => {
      const low = computePrivacyPosture(makeEntropyResult(10)).uniquenessEstimate;
      const high = computePrivacyPosture(makeEntropyResult(90)).uniquenessEstimate;
      expect(low).not.toBe(high);
    });
  });

  // ── Privacy posture line ──────────────────────────────────────────

  describe('privacy posture summary', () => {
    it('Low band posture differs from Moderate band posture', () => {
      const low = computePrivacyPosture(makeEntropyResult(20)).privacyPosture;
      const moderate = computePrivacyPosture(makeEntropyResult(50)).privacyPosture;
      expect(low).not.toBe(moderate);
    });

    it('Moderate band posture differs from High band posture', () => {
      const moderate = computePrivacyPosture(makeEntropyResult(50)).privacyPosture;
      const high = computePrivacyPosture(makeEntropyResult(80)).privacyPosture;
      expect(moderate).not.toBe(high);
    });

    it('privacy posture is non-empty for all bands', () => {
      for (const score of [0, 33, 34, 66, 67, 100]) {
        const result = computePrivacyPosture(makeEntropyResult(score));
        expect(result.privacyPosture.length).toBeGreaterThan(0);
      }
    });
  });

  // ── Heuristic disclaimer ─────────────────────────────────────────

  describe('heuristic disclaimer', () => {
    it('uniqueness estimate contains heuristic indicator for Low band', () => {
      const result = computePrivacyPosture(makeEntropyResult(20));
      const text = result.uniquenessEstimate.toLowerCase();
      expect(
        text.includes('heuristic') || text.includes('estimated') || text.includes('~'),
      ).toBe(true);
    });

    it('uniqueness estimate contains heuristic indicator for Moderate band', () => {
      const result = computePrivacyPosture(makeEntropyResult(50));
      const text = result.uniquenessEstimate.toLowerCase();
      expect(
        text.includes('heuristic') || text.includes('estimated') || text.includes('~'),
      ).toBe(true);
    });

    it('uniqueness estimate contains heuristic indicator for High band', () => {
      const result = computePrivacyPosture(makeEntropyResult(80));
      const text = result.uniquenessEstimate.toLowerCase();
      expect(
        text.includes('heuristic') || text.includes('estimated') || text.includes('~'),
      ).toBe(true);
    });
  });

  // ── Determinism ───────────────────────────────────────────────────

  describe('determinism', () => {
    it('same input always produces the same output', () => {
      const entropy = makeEntropyResult(42);
      const a = computePrivacyPosture(entropy);
      const b = computePrivacyPosture(entropy);
      const c = computePrivacyPosture(entropy);

      expect(a).toEqual(b);
      expect(b).toEqual(c);
    });

    it('identical scores produce identical results', () => {
      const r1 = computePrivacyPosture(makeEntropyResult(75));
      const r2 = computePrivacyPosture(makeEntropyResult(75));
      expect(r1).toEqual(r2);
    });
  });

  // ── Entropy label is one of the three allowed values ──────────────

  describe('label validation', () => {
    it('entropyLabel is always one of Low, Moderate, or High', () => {
      for (let score = 0; score <= 100; score++) {
        const result = computePrivacyPosture(makeEntropyResult(score));
        expect(['Low', 'Moderate', 'High']).toContain(result.entropyLabel);
      }
    });
  });
});
