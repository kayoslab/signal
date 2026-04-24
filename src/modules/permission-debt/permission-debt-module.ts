import { checkPermissions } from '../../permissions/permissions-adapter';
import { calculatePermissionDebtScore } from '../../scoring/permission-debt-score';
import { createReceipt } from '../../ui/receipt';
import { formatPermissions } from './format-permissions';
import './permission-debt.css';

const REQUIRED_NAMES = ['notifications', 'camera', 'microphone', 'clipboard', 'geolocation'];

export async function renderPermissionDebtModule(): Promise<HTMLElement> {
  const section = document.createElement('section');
  section.className = 'permission-debt';
  section.setAttribute('aria-labelledby', 'section-permission-debt');

  const h2 = document.createElement('h2');
  h2.id = 'section-permission-debt';
  h2.textContent = 'Permission Debt';
  section.appendChild(h2);

  const permissions = await checkPermissions();

  const filtered = permissions.filter((p) => REQUIRED_NAMES.includes(p.name));

  const missing = REQUIRED_NAMES.filter((n) => !filtered.some((p) => p.name === n));
  for (const name of missing) {
    filtered.push({ name, state: 'unsupported' });
  }

  const debtResult = calculatePermissionDebtScore(permissions);
  const rows = formatPermissions(filtered);
  const receipt = createReceipt(rows);
  receipt.setAttribute('role', 'region');
  receipt.setAttribute('aria-label', 'Permission Debt');

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

  const receiptRows = receipt.querySelector('.receipt-rows');
  if (receiptRows) {
    receipt.insertBefore(scoreSection, receiptRows);
  } else {
    receipt.appendChild(scoreSection);
  }

  const explainer = document.createElement('p');
  explainer.className = 'permission-debt-explainer';
  explainer.textContent =
    'Permission debt accumulates as browsers grant access to sensitive APIs. ' +
    'Each granted permission increases your risk surface. ' +
    'Review and revoke permissions you no longer need to reduce exposure.';
  receipt.appendChild(explainer);

  section.appendChild(receipt);

  return section;
}
