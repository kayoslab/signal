export interface OsintCardData {
  title: string;
  value: string;
  source: string;
  confidence: 'low' | 'medium' | 'high';
  whyItMatters: string;
}

export function createOsintCard(data: OsintCardData): HTMLElement {
  const card = document.createElement('article');
  card.className = 'card osint-card';

  const titleEl = document.createElement('h4');
  titleEl.className = 'osint-card-title';
  titleEl.textContent = data.title;
  card.appendChild(titleEl);

  const valueEl = document.createElement('p');
  valueEl.className = 'osint-card-value';
  valueEl.textContent = data.value;
  card.appendChild(valueEl);

  const sourceEl = document.createElement('p');
  sourceEl.className = 'osint-card-source';
  sourceEl.textContent = data.source;
  card.appendChild(sourceEl);

  const confidenceEl = document.createElement('span');
  confidenceEl.className = `osint-card-confidence osint-card-confidence--${data.confidence}`;
  confidenceEl.textContent = data.confidence;
  card.appendChild(confidenceEl);

  const whyEl = document.createElement('p');
  whyEl.className = 'osint-card-why';
  whyEl.textContent = data.whyItMatters;
  card.appendChild(whyEl);

  return card;
}

export function createOsintCardList(cards: OsintCardData[]): HTMLElement {
  const container = document.createElement('div');
  container.className = 'osint-card-list';

  for (const data of cards) {
    container.appendChild(createOsintCard(data));
  }

  return container;
}
