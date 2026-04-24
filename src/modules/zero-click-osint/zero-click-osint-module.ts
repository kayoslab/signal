import { collectSnapshot } from '../../signals/snapshot';
import { collectAsyncSignals } from '../../signals/async-snapshot';
import { createOsintSection } from '../../ui/osint-card';
import { mapSnapshotToFindings } from './map-snapshot-to-findings';

export async function renderZeroClickOsintModule(): Promise<HTMLElement> {
  const snapshot = collectSnapshot();
  const asyncSignals = await collectAsyncSignals();
  const findings = mapSnapshotToFindings(snapshot, asyncSignals);
  return createOsintSection('Zero-Click OSINT', findings);
}
