import { checkPermissions } from '../../permissions/permissions-adapter';
import { calculatePermissionDebtScore } from '../../scoring/permission-debt-score';
import { createReceipt } from '../../ui/receipt';
import { formatPermissions } from './format-permissions';
import './permission-debt.css';

const REQUIRED_NAMES = ['notifications', 'camera', 'microphone', 'clipboard', 'geolocation'];

export async function renderPermissionDebtModule(): Promise<HTMLElement> {
  const permissions = await checkPermissions();

  const filtered = permissions.filter((p) => REQUIRED_NAMES.includes(p.name));

  const missing = REQUIRED_NAMES.filter((n) => !filtered.some((p) => p.name === n));
  for (const name of missing) {
    filtered.push({ name, state: 'unsupported' });
  }

  const debtResult = calculatePermissionDebtScore(permissions);
  const rows = formatPermissions(filtered);
  const receipt = createReceipt('Permission Debt', rows);

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

  const title = receipt.querySelector('.receipt-title');
  if (title && title.nextSibling) {
    receipt.insertBefore(scoreSection, title.nextSibling);
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

  return receipt;
}
