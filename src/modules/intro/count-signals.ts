import type { SignalSnapshot } from '../../signals/snapshot';

/**
 * Recursively counts meaningful (non-sentinel) leaf values from a snapshot.
 * Excludes metadata fields (`collectedAt`, `version`) and sentinel values
 * ('unknown', 'unavailable').
 *
 * Stub — implementation pending US-010.
 */
export function countSignalFields(snapshot: SignalSnapshot): number {
  void snapshot;
  throw new Error('countSignalFields not yet implemented');
}
