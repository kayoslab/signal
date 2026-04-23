import { collectSnapshot } from '../../signals/snapshot';
import { createOsintSection } from '../../ui/osint-card';
import { mapSnapshotToFindings } from './map-snapshot-to-findings';

export function renderZeroClickOsintModule(): HTMLElement {
  const snapshot = collectSnapshot();
  const findings = mapSnapshotToFindings(snapshot);
  return createOsintSection('Zero-Click OSINT', findings);
}
