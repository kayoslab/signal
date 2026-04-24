import type { InferenceStatement } from '../modules/shadow-profile/inference-schema';

export function createShadowProfileCard(inference: InferenceStatement): HTMLElement {
  const card = document.createElement('article');
  card.className = 'card shadow-profile-card';

  const markerEl = document.createElement('span');
  markerEl.className = 'shadow-profile-card-inference-marker';
  markerEl.textContent = inference.marker;
  card.appendChild(markerEl);

  const statementEl = document.createElement('h4');
  statementEl.className = 'shadow-profile-card-statement';
  statementEl.textContent = inference.statement;
  card.appendChild(statementEl);

  const evidenceContainer = document.createElement('ul');
  evidenceContainer.className = 'shadow-profile-card-evidence';
  for (const entry of inference.evidence) {
    const li = document.createElement('li');
    li.className = 'shadow-profile-card-evidence-entry';
    li.textContent = `${entry.signal}: ${entry.value} (${entry.source})`;
    evidenceContainer.appendChild(li);
  }
  card.appendChild(evidenceContainer);

  const confidenceEl = document.createElement('span');
  confidenceEl.className = `shadow-profile-card-confidence shadow-profile-card-confidence--${inference.confidence}`;
  confidenceEl.textContent = inference.confidence;
  card.appendChild(confidenceEl);

  return card;
}

export function createShadowProfileCardList(cards: HTMLElement[]): HTMLElement {
  const container = document.createElement('div');
  container.className = 'shadow-profile-card-list';

  for (const card of cards) {
    container.appendChild(card);
  }

  return container;
}
