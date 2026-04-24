import { collectSnapshot } from '../../signals/snapshot';
import { calculateEntropyScore } from '../../scoring/entropy-score';
import { computePrivacyPosture } from '../../scoring/privacy-posture';
import { createReceipt, createReceiptRow } from '../../ui/receipt';
import type { ReceiptRow } from '../../ui/receipt';
import { createRerunButton } from '../../ui/rerun-button';
import { createCopyButton } from '../../ui/copy-button';
import { formatReceiptText } from './format-receipt-text';
import { formatSnapshotToRows } from './format-snapshot';

const MIN_LOADING_MS = 300;

function buildPostureRows(snapshot: ReturnType<typeof collectSnapshot>): ReceiptRow[] {
  const entropy = calculateEntropyScore(snapshot);
  const posture = computePrivacyPosture(entropy);
  return [
    { label: 'Entropy Level', value: posture.entropyLabel },
    { label: 'Uniqueness Estimate', value: `${posture.uniquenessEstimate} [Heuristic]` },
    { label: 'Privacy Posture', value: posture.privacyPosture },
  ];
}

export function renderFingerprintReceipt(): HTMLElement {
  const snapshot = collectSnapshot();
  const rows = [...formatSnapshotToRows(snapshot), ...buildPostureRows(snapshot)];
  const receipt = createReceipt('Fingerprint Receipt', rows);

  const rowsContainer = receipt.querySelector('.receipt-rows')!;
  rowsContainer.setAttribute('aria-live', 'polite');

  const actions = document.createElement('div');
  actions.className = 'receipt-actions';

  let currentRows = rows;

  const rerunBtn = createRerunButton(async () => {
    const [freshSnapshot] = await Promise.all([
      Promise.resolve(collectSnapshot()),
      new Promise<void>((r) => setTimeout(r, MIN_LOADING_MS)),
    ]);
    const freshRows = [...formatSnapshotToRows(freshSnapshot), ...buildPostureRows(freshSnapshot)];
    currentRows = freshRows;

    rowsContainer.innerHTML = '';
    for (const row of freshRows) {
      rowsContainer.appendChild(createReceiptRow(row.label, row.value));
    }
  });

  const copyBtn = createCopyButton(() =>
    formatReceiptText('Fingerprint Receipt', currentRows),
  );

  actions.appendChild(copyBtn);
  actions.appendChild(rerunBtn);
  receipt.appendChild(actions);

  return receipt;
}
