import type { ThreatFinding } from '../modules/threat-model/threat-schema';

export function createThreatCard(finding: ThreatFinding): HTMLElement {
  const card = document.createElement('article');
  card.className = 'card threat-card';

  const severityEl = document.createElement('span');
  severityEl.className = `threat-card-severity threat-card-severity--${finding.severity}`;
  severityEl.textContent = finding.severity;
  card.appendChild(severityEl);

  const titleEl = document.createElement('h4');
  titleEl.className = 'threat-card-title';
  titleEl.textContent = finding.title;
  card.appendChild(titleEl);

  const descEl = document.createElement('p');
  descEl.className = 'threat-card-description';
  descEl.textContent = finding.description;
  card.appendChild(descEl);

  const evidenceContainer = document.createElement('ul');
  evidenceContainer.className = 'threat-card-evidence';
  for (const entry of finding.evidence) {
    const li = document.createElement('li');
    li.className = 'threat-card-evidence-entry';
    li.textContent = entry;
    evidenceContainer.appendChild(li);
  }
  card.appendChild(evidenceContainer);

  const impactEl = document.createElement('p');
  impactEl.className = 'threat-card-user-impact';
  impactEl.textContent = finding.userImpact;
  card.appendChild(impactEl);

  const categoryEl = document.createElement('span');
  categoryEl.className = 'threat-card-category';
  categoryEl.textContent = finding.category;
  card.appendChild(categoryEl);

  return card;
}

export function createThreatCardList(cards: HTMLElement[]): HTMLElement {
  const container = document.createElement('div');
  container.className = 'threat-card-list';

  for (const card of cards) {
    container.appendChild(card);
  }

  return container;
}
