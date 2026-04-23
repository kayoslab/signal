import { collectSnapshot } from '../../signals/snapshot';
import { createReceipt } from '../../ui/receipt';
import { formatSnapshotToRows } from './format-snapshot';

export function renderFingerprintReceipt(): HTMLElement {
  const snapshot = collectSnapshot();
  const rows = formatSnapshotToRows(snapshot);
  return createReceipt('Fingerprint Receipt', rows);
}
