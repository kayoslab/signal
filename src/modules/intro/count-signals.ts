import type { SignalSnapshot } from '../../signals/snapshot';

const SENTINEL_VALUES: ReadonlySet<string> = new Set(['unknown', 'unavailable']);
const METADATA_KEYS: ReadonlySet<string> = new Set(['collectedAt', 'version']);

/**
 * Recursively counts meaningful (non-sentinel) leaf values from a snapshot.
 * Excludes metadata fields (`collectedAt`, `version`) and sentinel values
 * ('unknown', 'unavailable').
 *
 * Arrays count as a single signal (e.g. languages).
 * Boolean `false` is treated as a meaningful signal.
 */
export function countSignalFields(snapshot: SignalSnapshot): number {
  return countLeaves(snapshot);
}

function countLeaves(value: unknown, key?: string): number {
  if (key !== undefined && METADATA_KEYS.has(key)) {
    return 0;
  }

  if (value === null || value === undefined) {
    return 0;
  }

  if (Array.isArray(value)) {
    // Arrays (like languages) count as one signal if non-sentinel
    if (value.length === 0) return 0;
    if (value.length === 1 && typeof value[0] === 'string' && SENTINEL_VALUES.has(value[0])) {
      return 0;
    }
    return 1;
  }

  if (typeof value === 'object') {
    let count = 0;
    for (const [k, v] of Object.entries(value)) {
      count += countLeaves(v, k);
    }
    return count;
  }

  // Leaf value
  if (typeof value === 'string' && SENTINEL_VALUES.has(value)) {
    return 0;
  }

  return 1;
}
