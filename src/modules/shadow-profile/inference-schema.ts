export type ConfidenceLabel = 'low' | 'medium' | 'high';

export interface EvidenceEntry {
  signal: string;
  value: string;
  source: string;
}

export interface InferenceStatement {
  statement: string;
  evidence: EvidenceEntry[];
  confidence: ConfidenceLabel;
  marker: typeof INFERENCE_MARKER;
}

export const INFERENCE_MARKER = '[Inference]' as const;

export function createInference(input: {
  statement: string;
  evidence: EvidenceEntry[];
  confidence: ConfidenceLabel;
}): InferenceStatement {
  return {
    statement: input.statement,
    evidence: input.evidence,
    confidence: input.confidence,
    marker: INFERENCE_MARKER,
  };
}

const VALID_CONFIDENCE: ReadonlySet<string> = new Set(['low', 'medium', 'high']);

function isValidEvidenceEntry(entry: unknown): entry is EvidenceEntry {
  if (typeof entry !== 'object' || entry === null) return false;
  const e = entry as Record<string, unknown>;
  return (
    typeof e.signal === 'string' &&
    typeof e.value === 'string' &&
    typeof e.source === 'string'
  );
}

export function isValidInference(value: unknown): value is InferenceStatement {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (typeof obj.statement !== 'string' || obj.statement === '') return false;
  if (!Array.isArray(obj.evidence) || obj.evidence.length === 0) return false;
  if (!obj.evidence.every(isValidEvidenceEntry)) return false;
  if (typeof obj.confidence !== 'string' || !VALID_CONFIDENCE.has(obj.confidence)) return false;
  if (obj.marker !== INFERENCE_MARKER) return false;

  return true;
}
