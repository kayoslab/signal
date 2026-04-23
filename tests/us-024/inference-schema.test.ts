import { describe, it, expect } from 'vitest';
import {
  createInference,
  isValidInference,
  INFERENCE_MARKER,
  type InferenceStatement,
  type ConfidenceLabel,
  type EvidenceEntry,
} from '../../src/modules/shadow-profile/inference-schema';

/**
 * Builds a valid evidence entry for test fixtures.
 */
function makeEvidence(overrides: Partial<EvidenceEntry> = {}): EvidenceEntry {
  return {
    signal: 'timezone',
    value: 'America/New_York',
    source: 'Intl.DateTimeFormat',
    ...overrides,
  };
}

/**
 * Builds a valid inference object for test fixtures.
 */
function makeValidInference(): InferenceStatement {
  return createInference({
    statement: 'User is likely based in the eastern United States',
    evidence: [makeEvidence()],
    confidence: 'medium',
  });
}

// ---- AC: Inference includes statement, evidence list, confidence label, explicit inference marker ----

describe('Inference Schema', () => {
  describe('INFERENCE_MARKER constant', () => {
    it('equals [Inference]', () => {
      expect(INFERENCE_MARKER).toBe('[Inference]');
    });
  });

  describe('createInference', () => {
    it('returns an object with all four required fields', () => {
      const result = createInference({
        statement: 'User likely speaks English natively',
        evidence: [makeEvidence({ signal: 'languages', value: 'en-US', source: 'navigator.languages' })],
        confidence: 'high',
      });

      expect(result).toHaveProperty('statement');
      expect(result).toHaveProperty('evidence');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('marker');
    });

    it('auto-sets marker to [Inference]', () => {
      const result = createInference({
        statement: 'User may be a developer',
        evidence: [makeEvidence({ signal: 'hardwareConcurrency', value: '16', source: 'navigator.hardwareConcurrency' })],
        confidence: 'low',
      });

      expect(result.marker).toBe('[Inference]');
    });

    it('preserves the provided statement', () => {
      const statement = 'User is likely on a high-end workstation';
      const result = createInference({
        statement,
        evidence: [makeEvidence()],
        confidence: 'high',
      });

      expect(result.statement).toBe(statement);
    });

    it('preserves the provided evidence array', () => {
      const evidence = [
        makeEvidence({ signal: 'timezone', value: 'America/New_York', source: 'Intl.DateTimeFormat' }),
        makeEvidence({ signal: 'languages', value: 'en-US', source: 'navigator.languages' }),
      ];
      const result = createInference({
        statement: 'User is likely based in the US',
        evidence,
        confidence: 'medium',
      });

      expect(result.evidence).toEqual(evidence);
      expect(result.evidence).toHaveLength(2);
    });

    it('preserves the provided confidence label', () => {
      const labels: ConfidenceLabel[] = ['low', 'medium', 'high'];
      for (const confidence of labels) {
        const result = createInference({
          statement: 'Test statement',
          evidence: [makeEvidence()],
          confidence,
        });
        expect(result.confidence).toBe(confidence);
      }
    });
  });

  describe('isValidInference', () => {
    it('returns true for a well-formed inference object', () => {
      const inference = makeValidInference();
      expect(isValidInference(inference)).toBe(true);
    });

    it('returns true for inference with multiple evidence entries', () => {
      const inference = createInference({
        statement: 'User is likely a professional',
        evidence: [
          makeEvidence({ signal: 'hardwareConcurrency', value: '16', source: 'navigator.hardwareConcurrency' }),
          makeEvidence({ signal: 'renderer', value: 'NVIDIA RTX 4090', source: 'WebGL' }),
        ],
        confidence: 'medium',
      });
      expect(isValidInference(inference)).toBe(true);
    });

    // ---- Rejection: missing or empty statement ----

    it('rejects when statement is missing', () => {
      const obj = { ...makeValidInference() };
      delete (obj as Record<string, unknown>).statement;
      expect(isValidInference(obj)).toBe(false);
    });

    it('rejects when statement is empty string', () => {
      const obj = { ...makeValidInference(), statement: '' };
      expect(isValidInference(obj)).toBe(false);
    });

    it('rejects when statement is not a string', () => {
      const obj = { ...makeValidInference(), statement: 42 };
      expect(isValidInference(obj)).toBe(false);
    });

    // ---- Rejection: missing or empty evidence ----

    it('rejects when evidence is missing', () => {
      const obj = { ...makeValidInference() };
      delete (obj as Record<string, unknown>).evidence;
      expect(isValidInference(obj)).toBe(false);
    });

    it('rejects when evidence is an empty array', () => {
      const obj = { ...makeValidInference(), evidence: [] };
      expect(isValidInference(obj)).toBe(false);
    });

    it('rejects when evidence is not an array', () => {
      const obj = { ...makeValidInference(), evidence: 'not-an-array' };
      expect(isValidInference(obj)).toBe(false);
    });

    // ---- Rejection: malformed evidence entries ----

    it('rejects evidence entry missing signal', () => {
      const obj = {
        ...makeValidInference(),
        evidence: [{ value: 'America/New_York', source: 'Intl.DateTimeFormat' }],
      };
      expect(isValidInference(obj)).toBe(false);
    });

    it('rejects evidence entry missing value', () => {
      const obj = {
        ...makeValidInference(),
        evidence: [{ signal: 'timezone', source: 'Intl.DateTimeFormat' }],
      };
      expect(isValidInference(obj)).toBe(false);
    });

    it('rejects evidence entry missing source', () => {
      const obj = {
        ...makeValidInference(),
        evidence: [{ signal: 'timezone', value: 'America/New_York' }],
      };
      expect(isValidInference(obj)).toBe(false);
    });

    it('rejects evidence entry with non-string field values', () => {
      const obj = {
        ...makeValidInference(),
        evidence: [{ signal: 123, value: 'America/New_York', source: 'Intl.DateTimeFormat' }],
      };
      expect(isValidInference(obj)).toBe(false);
    });

    // ---- Rejection: invalid confidence ----

    it('rejects when confidence is missing', () => {
      const obj = { ...makeValidInference() };
      delete (obj as Record<string, unknown>).confidence;
      expect(isValidInference(obj)).toBe(false);
    });

    it('rejects when confidence is not one of low/medium/high', () => {
      const obj = { ...makeValidInference(), confidence: 'critical' };
      expect(isValidInference(obj)).toBe(false);
    });

    it('rejects when confidence is not a string', () => {
      const obj = { ...makeValidInference(), confidence: 3 };
      expect(isValidInference(obj)).toBe(false);
    });

    // ---- Rejection: wrong or missing marker ----

    it('rejects when marker is missing', () => {
      const obj = { ...makeValidInference() };
      delete (obj as Record<string, unknown>).marker;
      expect(isValidInference(obj)).toBe(false);
    });

    it('rejects when marker is not [Inference]', () => {
      const obj = { ...makeValidInference(), marker: '[Fact]' };
      expect(isValidInference(obj)).toBe(false);
    });

    it('rejects when marker is empty string', () => {
      const obj = { ...makeValidInference(), marker: '' };
      expect(isValidInference(obj)).toBe(false);
    });

    // ---- Rejection: non-object inputs ----

    it('rejects null', () => {
      expect(isValidInference(null)).toBe(false);
    });

    it('rejects undefined', () => {
      expect(isValidInference(undefined)).toBe(false);
    });

    it('rejects primitive values', () => {
      expect(isValidInference('string')).toBe(false);
      expect(isValidInference(42)).toBe(false);
      expect(isValidInference(true)).toBe(false);
    });
  });
});
