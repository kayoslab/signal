import { collectSnapshot } from '../../signals/snapshot';
import { checkPermissions, type PermissionCheckResult } from '../../permissions/permissions-adapter';
import { calculateEntropyScore } from '../../scoring/entropy-score';
import { calculatePermissionDebtScore } from '../../scoring/permission-debt-score';
import { applyInferenceRules } from '../shadow-profile/inference-rules';
import { evaluateThreatRules } from './threat-rules';
import {
  createThreatCard,
  createThreatCardList,
} from '../../ui/threat-model-card';

export async function renderThreatModelModule(): Promise<HTMLElement> {
  const section = document.createElement('section');
  section.className = 'threat-model';

  const h2 = document.createElement('h2');
  h2.textContent = 'Threat Model: You';
  section.appendChild(h2);

  const snapshot = collectSnapshot();

  let permissions: PermissionCheckResult[];
  try {
    permissions = await checkPermissions();
  } catch {
    permissions = [];
  }

  const entropy = calculateEntropyScore(snapshot);
  const permissionDebt = calculatePermissionDebtScore(permissions);
  const inferences = applyInferenceRules({ snapshot, permissions });

  const findings = evaluateThreatRules({
    snapshot,
    permissions,
    entropy,
    permissionDebt,
    inferences,
  });

  if (findings.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.className = 'threat-model-empty';
    emptyMsg.textContent =
      'No significant threats were identified from the current browser signals.';
    section.appendChild(emptyMsg);
    return section;
  }

  const cards = findings.map((finding) => createThreatCard(finding));
  section.appendChild(createThreatCardList(cards));

  return section;
}
