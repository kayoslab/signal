import { collectSnapshot } from '../../signals/snapshot';
import { calculateEntropyScore } from '../../scoring/entropy-score';
import { computePrivacyPosture } from '../../scoring/privacy-posture';
import { checkPermissions } from '../../permissions/permissions-adapter';
import { calculatePermissionDebtScore } from '../../scoring/permission-debt-score';
import { formatPermissions } from '../permission-debt/format-permissions';
import { createReceipt, createReceiptRow } from '../../ui/receipt';
import type { ReceiptRow } from '../../ui/receipt';
import { createRerunButton } from '../../ui/rerun-button';
import { createCopyButton } from '../../ui/copy-button';
import { createShareImageButton } from '../../ui/share-image-button';
import { formatReceiptText } from './format-receipt-text';
import { formatSnapshotToRows } from './format-snapshot';
import '../../modules/permission-debt/permission-debt.css';

const MIN_LOADING_MS = 300;
const REQUIRED_PERMISSIONS = ['notifications', 'camera', 'microphone', 'clipboard', 'geolocation'];

function buildPostureRows(snapshot: ReturnType<typeof collectSnapshot>): ReceiptRow[] {
  const entropy = calculateEntropyScore(snapshot);
  const posture = computePrivacyPosture(entropy);
  return [
    { label: 'Entropy Level', value: posture.entropyLabel },
    { label: 'Uniqueness Estimate', value: `${posture.uniquenessEstimate} [Heuristic]` },
    { label: 'Privacy Posture', value: posture.privacyPosture },
  ];
}

export async function renderFingerprintReceipt(): Promise<HTMLElement> {
  const snapshot = collectSnapshot();
  const signalRows = formatSnapshotToRows(snapshot);
  const postureRows = buildPostureRows(snapshot);

  // Permission debt — merged into the receipt
  const permissions = await checkPermissions();
  const filtered = permissions.filter((p) => REQUIRED_PERMISSIONS.includes(p.name));
  const missing = REQUIRED_PERMISSIONS.filter((n) => !filtered.some((p) => p.name === n));
  for (const name of missing) {
    filtered.push({ name, state: 'unsupported' });
  }
  const debtResult = calculatePermissionDebtScore(permissions);
  const permissionRows = formatPermissions(filtered);

  const allRows = [...signalRows, ...postureRows];
  const receipt = createReceipt('Fingerprint Receipt', allRows);

  const rowsContainer = receipt.querySelector('.receipt-rows')!;
  rowsContainer.setAttribute('aria-live', 'polite');

  // Permission debt section inside receipt
  const permSection = document.createElement('div');
  permSection.className = 'receipt-permission-section';

  const permHeading = document.createElement('div');
  permHeading.className = 'receipt-section-heading';
  permHeading.textContent = 'Permission Debt';
  permSection.appendChild(permHeading);

  const scoreSection = document.createElement('div');
  scoreSection.className = 'permission-debt-score';

  const scoreValue = document.createElement('span');
  scoreValue.className = 'permission-debt-score-value';
  scoreValue.textContent = String(debtResult.score);

  const scoreLabel = document.createElement('span');
  scoreLabel.className = 'permission-debt-score-label';
  scoreLabel.textContent = 'Debt Score';

  scoreSection.appendChild(scoreValue);
  scoreSection.appendChild(scoreLabel);
  permSection.appendChild(scoreSection);

  const permRowsContainer = document.createElement('div');
  permRowsContainer.className = 'receipt-rows';
  for (const row of permissionRows) {
    permRowsContainer.appendChild(createReceiptRow(row.label, row.value));
  }
  permSection.appendChild(permRowsContainer);

  receipt.insertBefore(permSection, rowsContainer.nextSibling);

  // Actions
  let currentRows = allRows;
  const actions = document.createElement('div');
  actions.className = 'receipt-actions';

  const rerunBtn = createRerunButton(async () => {
    const [freshSnapshot, freshPermissions] = await Promise.all([
      Promise.resolve(collectSnapshot()),
      checkPermissions(),
      new Promise<void>((r) => setTimeout(r, MIN_LOADING_MS)),
    ]);
    const freshRows = [...formatSnapshotToRows(freshSnapshot), ...buildPostureRows(freshSnapshot)];
    currentRows = freshRows;

    rowsContainer.innerHTML = '';
    for (const row of freshRows) {
      rowsContainer.appendChild(createReceiptRow(row.label, row.value));
    }

    // Refresh permission debt section
    const freshFiltered = freshPermissions.filter((p) => REQUIRED_PERMISSIONS.includes(p.name));
    const freshMissing = REQUIRED_PERMISSIONS.filter((n) => !freshFiltered.some((p) => p.name === n));
    for (const name of freshMissing) {
      freshFiltered.push({ name, state: 'unsupported' });
    }
    const freshDebt = calculatePermissionDebtScore(freshPermissions);
    const freshPermRows = formatPermissions(freshFiltered);

    scoreValue.textContent = String(freshDebt.score);
    permRowsContainer.innerHTML = '';
    for (const row of freshPermRows) {
      permRowsContainer.appendChild(createReceiptRow(row.label, row.value));
    }
  });

  const copyBtn = createCopyButton(() =>
    formatReceiptText('Fingerprint Receipt', currentRows),
  );

  const shareBtn = createShareImageButton(() => receipt);

  actions.appendChild(copyBtn);
  actions.appendChild(shareBtn);
  actions.appendChild(rerunBtn);
  receipt.appendChild(actions);

  return receipt;
}
