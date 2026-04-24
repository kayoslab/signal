import { collectSnapshot } from '../../signals/snapshot';
import { checkPermissions } from '../../permissions/permissions-adapter';
import type { PermissionCheckResult } from '../../permissions/permissions-adapter';
import { calculateEntropyScore } from '../../scoring/entropy-score';
import { calculatePermissionDebtScore } from '../../scoring/permission-debt-score';
import { applyInferenceRules } from '../shadow-profile/inference-rules';
import { evaluateThreatRules } from '../threat-model/threat-rules';
import { evaluateHardeningRules } from './hardening-rules';
import type { HardeningRecommendation, Difficulty } from './hardening-schema';
import './hardening.css';

function createDifficultyBadge(difficulty: Difficulty): HTMLElement {
  const badge = document.createElement('span');
  badge.className = `hardening-difficulty hardening-difficulty--${difficulty.toLowerCase()}`;
  badge.textContent = difficulty;
  return badge;
}

function renderHardeningCard(rec: HardeningRecommendation): HTMLElement {
  const card = document.createElement('article');
  card.className = 'hardening-card card';

  const header = document.createElement('div');
  header.className = 'hardening-card-header';

  const title = document.createElement('h3');
  title.className = 'hardening-card-title';
  title.textContent = rec.title;
  header.appendChild(title);
  header.appendChild(createDifficultyBadge(rec.difficulty));
  card.appendChild(header);

  const desc = document.createElement('p');
  desc.className = 'hardening-card-description';
  desc.textContent = rec.description;
  card.appendChild(desc);

  const stepsList = document.createElement('ol');
  stepsList.className = 'hardening-card-steps';
  for (const step of rec.actionSteps) {
    const li = document.createElement('li');
    li.textContent = step;
    stepsList.appendChild(li);
  }
  card.appendChild(stepsList);

  const outcome = document.createElement('p');
  outcome.className = 'hardening-card-outcome';
  outcome.textContent = rec.expectedOutcome;
  card.appendChild(outcome);

  if (rec.relatedFindings.length > 0) {
    const footer = document.createElement('footer');
    footer.className = 'hardening-card-findings';
    footer.textContent = 'Related: ' + rec.relatedFindings.join(', ');
    card.appendChild(footer);
  }

  return card;
}

export async function renderHardeningModule(
  container: HTMLElement,
): Promise<void> {
  const section = document.createElement('section');
  section.className = 'hardening-actions';

  const h2 = document.createElement('h2');
  h2.id = 'section-hardening-actions';
  h2.textContent = 'Hardening Actions';
  section.setAttribute('aria-labelledby', 'section-hardening-actions');
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
  const threats = evaluateThreatRules({ snapshot, permissions, entropy, permissionDebt, inferences });

  const recommendations = evaluateHardeningRules({
    snapshot,
    permissions,
    entropy,
    permissionDebt,
    inferences,
    threats,
  });

  if (recommendations.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.className = 'hardening-empty';
    emptyMsg.textContent =
      'Your security posture is strong — no immediate actions recommended.';
    section.appendChild(emptyMsg);
    container.appendChild(section);
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'hardening-card-list';
  for (const rec of recommendations) {
    grid.appendChild(renderHardeningCard(rec));
  }
  section.appendChild(grid);

  container.appendChild(section);
}
