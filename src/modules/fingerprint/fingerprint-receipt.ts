import { collectSnapshot } from '../../signals/snapshot';
import { createReceipt, createReceiptRow } from '../../ui/receipt';
import { createRerunButton } from '../../ui/rerun-button';
import { formatSnapshotToRows } from './format-snapshot';

const MIN_LOADING_MS = 300;

export function renderFingerprintReceipt(): HTMLElement {
  const snapshot = collectSnapshot();
  const rows = formatSnapshotToRows(snapshot);
  const receipt = createReceipt('Fingerprint Receipt', rows);

  const rowsContainer = receipt.querySelector('.receipt-rows')!;
  rowsContainer.setAttribute('aria-live', 'polite');

  const actions = document.createElement('div');
  actions.className = 'receipt-actions';

  const rerunBtn = createRerunButton(async () => {
    const [freshSnapshot] = await Promise.all([
      Promise.resolve(collectSnapshot()),
      new Promise<void>((r) => setTimeout(r, MIN_LOADING_MS)),
    ]);
    const freshRows = formatSnapshotToRows(freshSnapshot);

    rowsContainer.innerHTML = '';
    for (const row of freshRows) {
      rowsContainer.appendChild(createReceiptRow(row.label, row.value));
    }
  });

  actions.appendChild(rerunBtn);
  receipt.appendChild(actions);

  return receipt;
}
