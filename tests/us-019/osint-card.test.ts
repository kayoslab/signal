// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * US-019: Create Zero Click OSINT card component
 *
 * Tests verify the reusable intelligence card component renders
 * title, value, source, confidence badge, and "why it matters"
 * as distinct DOM elements with correct content.
 *
 * CSS tests inspect source files directly since jsdom does not
 * compute layout or custom properties.
 */

const PROJECT_ROOT = resolve(__dirname, '../..');
const STYLES_DIR = resolve(PROJECT_ROOT, 'src/styles');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function readOsintCardCss(): string {
  const filepath = resolve(STYLES_DIR, 'osint-card.css');
  if (!existsSync(filepath)) {
    throw new Error('Expected CSS file not found: src/styles/osint-card.css');
  }
  return readFileSync(filepath, 'utf-8');
}

function readGlobalCss(): string {
  return readFileSync(resolve(STYLES_DIR, 'global.css'), 'utf-8');
}

function makeCardData(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Timezone Detection',
    value: 'America/New_York',
    source: 'Intl.DateTimeFormat API',
    confidence: 'high' as const,
    whyItMatters: 'Timezone reveals approximate geographic location.',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// AC-1: Card shows title
// ---------------------------------------------------------------------------
describe('US-019: card shows title', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('card contains a title element with .osint-card-title class', async () => {
    const { createOsintCard } = await import('../../src/ui/osint-card');
    const card = createOsintCard(makeCardData());
    const titleEl = card.querySelector('.osint-card-title');
    expect(titleEl).not.toBeNull();
  });

  it('title text content matches input', async () => {
    const { createOsintCard } = await import('../../src/ui/osint-card');
    const card = createOsintCard(makeCardData({ title: 'Language Detection' }));
    const titleEl = card.querySelector('.osint-card-title');
    expect(titleEl?.textContent).toContain('Language Detection');
  });
});

// ---------------------------------------------------------------------------
// AC-2: Card shows value
// ---------------------------------------------------------------------------
describe('US-019: card shows value', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('card contains a value element with .osint-card-value class', async () => {
    const { createOsintCard } = await import('../../src/ui/osint-card');
    const card = createOsintCard(makeCardData());
    const valueEl = card.querySelector('.osint-card-value');
    expect(valueEl).not.toBeNull();
  });

  it('value text content matches input', async () => {
    const { createOsintCard } = await import('../../src/ui/osint-card');
    const card = createOsintCard(makeCardData({ value: 'en-US, fr-FR' }));
    const valueEl = card.querySelector('.osint-card-value');
    expect(valueEl?.textContent).toContain('en-US, fr-FR');
  });
});

// ---------------------------------------------------------------------------
// AC-3: Card shows source
// ---------------------------------------------------------------------------
describe('US-019: card shows source', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('card contains a source element with .osint-card-source class', async () => {
    const { createOsintCard } = await import('../../src/ui/osint-card');
    const card = createOsintCard(makeCardData());
    const sourceEl = card.querySelector('.osint-card-source');
    expect(sourceEl).not.toBeNull();
  });

  it('source text content matches input', async () => {
    const { createOsintCard } = await import('../../src/ui/osint-card');
    const card = createOsintCard(makeCardData({ source: 'navigator.languages' }));
    const sourceEl = card.querySelector('.osint-card-source');
    expect(sourceEl?.textContent).toContain('navigator.languages');
  });
});

// ---------------------------------------------------------------------------
// AC-4: Card shows confidence
// ---------------------------------------------------------------------------
describe('US-019: card shows confidence', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('card contains a confidence element with .osint-card-confidence class', async () => {
    const { createOsintCard } = await import('../../src/ui/osint-card');
    const card = createOsintCard(makeCardData());
    const confEl = card.querySelector('.osint-card-confidence');
    expect(confEl).not.toBeNull();
  });

  it('confidence badge has --low modifier class for low confidence', async () => {
    const { createOsintCard } = await import('../../src/ui/osint-card');
    const card = createOsintCard(makeCardData({ confidence: 'low' }));
    const confEl = card.querySelector('.osint-card-confidence');
    expect(confEl?.classList.contains('osint-card-confidence--low')).toBe(true);
  });

  it('confidence badge has --medium modifier class for medium confidence', async () => {
    const { createOsintCard } = await import('../../src/ui/osint-card');
    const card = createOsintCard(makeCardData({ confidence: 'medium' }));
    const confEl = card.querySelector('.osint-card-confidence');
    expect(confEl?.classList.contains('osint-card-confidence--medium')).toBe(true);
  });

  it('confidence badge has --high modifier class for high confidence', async () => {
    const { createOsintCard } = await import('../../src/ui/osint-card');
    const card = createOsintCard(makeCardData({ confidence: 'high' }));
    const confEl = card.querySelector('.osint-card-confidence');
    expect(confEl?.classList.contains('osint-card-confidence--high')).toBe(true);
  });

  it('confidence badge text content reflects the confidence level', async () => {
    const { createOsintCard } = await import('../../src/ui/osint-card');
    const card = createOsintCard(makeCardData({ confidence: 'medium' }));
    const confEl = card.querySelector('.osint-card-confidence');
    expect(confEl?.textContent?.toLowerCase()).toContain('medium');
  });
});

// ---------------------------------------------------------------------------
// AC-5: Card shows why it matters
// ---------------------------------------------------------------------------
describe('US-019: card shows why it matters', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('card contains a why-it-matters element with .osint-card-why class', async () => {
    const { createOsintCard } = await import('../../src/ui/osint-card');
    const card = createOsintCard(makeCardData());
    const whyEl = card.querySelector('.osint-card-why');
    expect(whyEl).not.toBeNull();
  });

  it('why it matters text content matches input', async () => {
    const { createOsintCard } = await import('../../src/ui/osint-card');
    const whyText = 'Reveals approximate geographic location to any website.';
    const card = createOsintCard(makeCardData({ whyItMatters: whyText }));
    const whyEl = card.querySelector('.osint-card-why');
    expect(whyEl?.textContent).toContain(whyText);
  });
});

// ---------------------------------------------------------------------------
// Card base class
// ---------------------------------------------------------------------------
describe('US-019: card base class', () => {
  it('card root element has the .card base class', async () => {
    const { createOsintCard } = await import('../../src/ui/osint-card');
    const card = createOsintCard(makeCardData());
    expect(card.classList.contains('card')).toBe(true);
  });

  it('card root element is an HTMLElement', async () => {
    const { createOsintCard } = await import('../../src/ui/osint-card');
    const card = createOsintCard(makeCardData());
    expect(card).toBeInstanceOf(HTMLElement);
  });
});

// ---------------------------------------------------------------------------
// Card list rendering
// ---------------------------------------------------------------------------
describe('US-019: createOsintCardList', () => {
  it('renders correct number of child cards', async () => {
    const { createOsintCardList } = await import('../../src/ui/osint-card');
    const cards = [
      makeCardData({ title: 'Finding A' }),
      makeCardData({ title: 'Finding B' }),
      makeCardData({ title: 'Finding C' }),
    ];
    const list = createOsintCardList(cards);
    const renderedCards = list.querySelectorAll('.card');
    expect(renderedCards.length).toBe(3);
  });

  it('wraps cards in a .osint-card-list container', async () => {
    const { createOsintCardList } = await import('../../src/ui/osint-card');
    const list = createOsintCardList([makeCardData()]);
    expect(list.classList.contains('osint-card-list')).toBe(true);
  });

  it('renders zero cards without error', async () => {
    const { createOsintCardList } = await import('../../src/ui/osint-card');
    const list = createOsintCardList([]);
    expect(list.querySelectorAll('.card').length).toBe(0);
  });

  it('preserves card order', async () => {
    const { createOsintCardList } = await import('../../src/ui/osint-card');
    const cards = [
      makeCardData({ title: 'First' }),
      makeCardData({ title: 'Second' }),
      makeCardData({ title: 'Third' }),
    ];
    const list = createOsintCardList(cards);
    const titles = Array.from(list.querySelectorAll('.osint-card-title')).map(
      (el) => el.textContent?.trim(),
    );
    expect(titles).toEqual(['First', 'Second', 'Third']);
  });
});

// ---------------------------------------------------------------------------
// Module export contract
// ---------------------------------------------------------------------------
describe('US-019: module export contract', () => {
  it('exports createOsintCard function', async () => {
    const mod = await import('../../src/ui/osint-card');
    expect(typeof mod.createOsintCard).toBe('function');
  });

  it('exports createOsintCardList function', async () => {
    const mod = await import('../../src/ui/osint-card');
    expect(typeof mod.createOsintCardList).toBe('function');
  });

  it('exports OsintCardData type (verifiable via valid object usage)', async () => {
    const { createOsintCard } = await import('../../src/ui/osint-card');
    const data: {
      title: string;
      value: string;
      source: string;
      confidence: 'low' | 'medium' | 'high';
      whyItMatters: string;
    } = makeCardData();
    const card = createOsintCard(data);
    expect(card).toBeInstanceOf(HTMLElement);
  });
});

// ---------------------------------------------------------------------------
// CSS file structure
// ---------------------------------------------------------------------------
describe('US-019: OSINT card CSS file', () => {
  it('osint-card.css exists in src/styles/', () => {
    expect(existsSync(resolve(STYLES_DIR, 'osint-card.css'))).toBe(true);
  });

  it('defines .osint-card-title class selector', () => {
    const css = readOsintCardCss();
    expect(css).toMatch(/\.osint-card-title\s*\{/);
  });

  it('defines .osint-card-value class selector', () => {
    const css = readOsintCardCss();
    expect(css).toMatch(/\.osint-card-value\s*\{/);
  });

  it('defines .osint-card-source class selector', () => {
    const css = readOsintCardCss();
    expect(css).toMatch(/\.osint-card-source\s*\{/);
  });

  it('defines .osint-card-confidence class selector', () => {
    const css = readOsintCardCss();
    expect(css).toMatch(/\.osint-card-confidence\s*\{/);
  });

  it('defines .osint-card-why class selector', () => {
    const css = readOsintCardCss();
    expect(css).toMatch(/\.osint-card-why\s*\{/);
  });

  it('defines confidence modifier classes for all levels', () => {
    const css = readOsintCardCss();
    expect(css).toMatch(/\.osint-card-confidence--low/);
    expect(css).toMatch(/\.osint-card-confidence--medium/);
    expect(css).toMatch(/\.osint-card-confidence--high/);
  });

  it('defines .osint-card-list class selector', () => {
    const css = readOsintCardCss();
    expect(css).toMatch(/\.osint-card-list\s*\{/);
  });

  it('osint-card.css is imported in global.css', () => {
    const global = readGlobalCss();
    expect(global).toMatch(/@import\s+['"]\.\/osint-card\.css['"]/);
  });

  it('uses design tokens (no hardcoded colors or spacing)', () => {
    const css = readOsintCardCss();
    // Should reference CSS custom properties
    expect(css).toMatch(/var\(--/);
    // Should not contain hardcoded hex colors (allow var() references only)
    const lines = css.split('\n').filter(
      (line) => !line.trim().startsWith('/*') && !line.trim().startsWith('*'),
    );
    const propertyLines = lines.filter((line) => line.includes(':') && !line.includes('var('));
    for (const line of propertyLines) {
      // Allow selectors and non-color properties, but flag hardcoded colors
      expect(line).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });
});

// ---------------------------------------------------------------------------
// Separation of concerns
// ---------------------------------------------------------------------------
describe('US-019: separation of concerns', () => {
  it('osint-card module does not import signal collection code', async () => {
    const filepath = resolve(PROJECT_ROOT, 'src/ui/osint-card.ts');
    const source = readFileSync(filepath, 'utf-8');
    expect(source).not.toMatch(/from\s+['"].*signals/);
    expect(source).not.toMatch(/from\s+['"].*permissions/);
  });
});
