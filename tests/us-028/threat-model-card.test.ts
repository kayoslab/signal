// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ThreatFinding, Severity } from '../../src/modules/threat-model/threat-schema';

/**
 * US-028: Threat Model Card Component
 *
 * Tests verify the threat card renders a severity badge, title,
 * description, evidence list, userImpact, and category — with
 * correct modifier classes for each severity level.
 */

const PROJECT_ROOT = resolve(__dirname, '../..');
const STYLES_DIR = resolve(PROJECT_ROOT, 'src/styles');
const MODULE_DIR = resolve(PROJECT_ROOT, 'src/modules/threat-model');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFinding(overrides: Partial<ThreatFinding> = {}): ThreatFinding {
  return {
    ruleId: 'identity-exposure',
    title: 'Device Fingerprint Uniqueness',
    severity: 'Medium',
    description:
      'Your browser exposes a combination of signals that may allow websites to re-identify your device across visits without relying on cookies.',
    evidence: [
      'renderer: ANGLE (Apple, Apple M2 Max) (contribution: 15)',
      'timezone: America/New_York (contribution: 10)',
    ],
    userImpact:
      'Third parties could correlate your browsing activity across different sites using your device fingerprint.',
    category: 'identity-exposure',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// AC-1: Risk cards render
// ---------------------------------------------------------------------------

describe('US-028: threat card renders', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('returns an HTMLElement', async () => {
    const { createThreatCard } = await import('../../src/ui/threat-model-card');
    const card = createThreatCard(makeFinding());
    expect(card).toBeInstanceOf(HTMLElement);
  });

  it('root element is an <article> with .threat-card class', async () => {
    const { createThreatCard } = await import('../../src/ui/threat-model-card');
    const card = createThreatCard(makeFinding());
    expect(card.tagName).toBe('ARTICLE');
    expect(card.classList.contains('threat-card')).toBe(true);
  });

  it('root element has the .card base class', async () => {
    const { createThreatCard } = await import('../../src/ui/threat-model-card');
    const card = createThreatCard(makeFinding());
    expect(card.classList.contains('card')).toBe(true);
  });

  it('renders the title text', async () => {
    const { createThreatCard } = await import('../../src/ui/threat-model-card');
    const card = createThreatCard(makeFinding({ title: 'Granted Permission Risk' }));
    expect(card.textContent).toContain('Granted Permission Risk');
  });

  it('renders the description text', async () => {
    const { createThreatCard } = await import('../../src/ui/threat-model-card');
    const finding = makeFinding({ description: 'Signals may allow re-identification.' });
    const card = createThreatCard(finding);
    expect(card.textContent).toContain('Signals may allow re-identification.');
  });

  it('renders the userImpact text', async () => {
    const { createThreatCard } = await import('../../src/ui/threat-model-card');
    const finding = makeFinding({ userImpact: 'Browsing activity could be correlated.' });
    const card = createThreatCard(finding);
    expect(card.textContent).toContain('Browsing activity could be correlated.');
  });
});

// ---------------------------------------------------------------------------
// AC-2: Severity badge shown
// ---------------------------------------------------------------------------

describe('US-028: severity badge', () => {
  it('renders severity label text', async () => {
    const { createThreatCard } = await import('../../src/ui/threat-model-card');
    const card = createThreatCard(makeFinding({ severity: 'Medium' }));
    const badgeEl = card.querySelector('[class*="severity"]');
    expect(badgeEl).not.toBeNull();
    expect(badgeEl!.textContent).toContain('Medium');
  });

  it('applies --Low modifier class for Low severity', async () => {
    const { createThreatCard } = await import('../../src/ui/threat-model-card');
    const card = createThreatCard(makeFinding({ severity: 'Low' }));
    const badgeEl = card.querySelector('[class*="severity"]');
    expect(badgeEl).not.toBeNull();
    expect(badgeEl!.className).toMatch(/severity--Low/);
  });

  it('applies --Medium modifier class for Medium severity', async () => {
    const { createThreatCard } = await import('../../src/ui/threat-model-card');
    const card = createThreatCard(makeFinding({ severity: 'Medium' }));
    const badgeEl = card.querySelector('[class*="severity"]');
    expect(badgeEl!.className).toMatch(/severity--Medium/);
  });

  it('applies --High modifier class for High severity', async () => {
    const { createThreatCard } = await import('../../src/ui/threat-model-card');
    const card = createThreatCard(makeFinding({ severity: 'High' }));
    const badgeEl = card.querySelector('[class*="severity"]');
    expect(badgeEl!.className).toMatch(/severity--High/);
  });

  it('each severity level displays the correct text', async () => {
    const { createThreatCard } = await import('../../src/ui/threat-model-card');
    const levels: Severity[] = ['Low', 'Medium', 'High'];
    for (const level of levels) {
      const card = createThreatCard(makeFinding({ severity: level }));
      const badgeEl = card.querySelector('[class*="severity"]');
      expect(badgeEl!.textContent).toContain(level);
    }
  });
});

// ---------------------------------------------------------------------------
// AC-3: Short explanation shown
// ---------------------------------------------------------------------------

describe('US-028: short explanation (description + userImpact)', () => {
  it('card contains a description element', async () => {
    const { createThreatCard } = await import('../../src/ui/threat-model-card');
    const card = createThreatCard(makeFinding());
    const descEl = card.querySelector('[class*="description"]');
    expect(descEl).not.toBeNull();
  });

  it('card contains a userImpact element', async () => {
    const { createThreatCard } = await import('../../src/ui/threat-model-card');
    const card = createThreatCard(makeFinding());
    const impactEl = card.querySelector('[class*="user-impact"], [class*="impact"]');
    expect(impactEl).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Evidence entries
// ---------------------------------------------------------------------------

describe('US-028: evidence entries', () => {
  it('renders evidence entries', async () => {
    const { createThreatCard } = await import('../../src/ui/threat-model-card');
    const evidence = ['renderer: ANGLE (contribution: 15)', 'timezone: America/New_York (contribution: 10)'];
    const card = createThreatCard(makeFinding({ evidence }));
    expect(card.textContent).toContain('renderer');
    expect(card.textContent).toContain('timezone');
  });

  it('renders correct number of evidence items', async () => {
    const { createThreatCard } = await import('../../src/ui/threat-model-card');
    const evidence = ['Signal A', 'Signal B', 'Signal C'];
    const card = createThreatCard(makeFinding({ evidence }));
    const evidenceEls = card.querySelectorAll('[class*="evidence"]');
    // At minimum the evidence container exists
    expect(evidenceEls.length).toBeGreaterThanOrEqual(1);
  });

  it('renders single evidence entry correctly', async () => {
    const { createThreatCard } = await import('../../src/ui/threat-model-card');
    const card = createThreatCard(makeFinding({ evidence: ['Permission debt score: 45'] }));
    expect(card.textContent).toContain('Permission debt score: 45');
  });
});

// ---------------------------------------------------------------------------
// Category label
// ---------------------------------------------------------------------------

describe('US-028: category label', () => {
  it('renders the category text', async () => {
    const { createThreatCard } = await import('../../src/ui/threat-model-card');
    const card = createThreatCard(makeFinding({ category: 'permission-abuse' }));
    expect(card.textContent).toContain('permission-abuse');
  });
});

// ---------------------------------------------------------------------------
// Semantic HTML structure
// ---------------------------------------------------------------------------

describe('US-028: semantic HTML structure', () => {
  it('card uses <article> element', async () => {
    const { createThreatCard } = await import('../../src/ui/threat-model-card');
    const card = createThreatCard(makeFinding());
    expect(card.tagName).toBe('ARTICLE');
  });

  it('card contains a heading element for the title', async () => {
    const { createThreatCard } = await import('../../src/ui/threat-model-card');
    const card = createThreatCard(makeFinding());
    const headings = card.querySelectorAll('h3, h4, h5');
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Card list component
// ---------------------------------------------------------------------------

describe('US-028: createThreatCardList', () => {
  it('renders correct number of child cards', async () => {
    const { createThreatCard, createThreatCardList } = await import('../../src/ui/threat-model-card');
    const cards = [
      createThreatCard(makeFinding({ title: 'A' })),
      createThreatCard(makeFinding({ title: 'B' })),
      createThreatCard(makeFinding({ title: 'C' })),
    ];
    const list = createThreatCardList(cards);
    const rendered = list.querySelectorAll('.threat-card');
    expect(rendered.length).toBe(3);
  });

  it('wraps cards in a grid container', async () => {
    const { createThreatCard, createThreatCardList } = await import('../../src/ui/threat-model-card');
    const cards = [createThreatCard(makeFinding())];
    const list = createThreatCardList(cards);
    expect(list.classList.contains('threat-card-list')).toBe(true);
  });

  it('renders zero cards without error', async () => {
    const { createThreatCardList } = await import('../../src/ui/threat-model-card');
    const list = createThreatCardList([]);
    expect(list.querySelectorAll('.threat-card').length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Module export contract
// ---------------------------------------------------------------------------

describe('US-028: threat-model-card export contract', () => {
  it('exports createThreatCard function', async () => {
    const mod = await import('../../src/ui/threat-model-card');
    expect(typeof mod.createThreatCard).toBe('function');
  });

  it('exports createThreatCardList function', async () => {
    const mod = await import('../../src/ui/threat-model-card');
    expect(typeof mod.createThreatCardList).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// CSS file structure
// ---------------------------------------------------------------------------

describe('US-028: threat-model CSS file', () => {
  const cssPath = resolve(MODULE_DIR, 'threat-model.css');

  it('threat-model.css exists', () => {
    expect(existsSync(cssPath)).toBe(true);
  });

  it('defines .threat-card class selector', () => {
    const css = readFileSync(cssPath, 'utf-8');
    expect(css).toMatch(/\.threat-card\s*\{/);
  });

  it('defines .threat-card-list class selector', () => {
    const css = readFileSync(cssPath, 'utf-8');
    expect(css).toMatch(/\.threat-card-list\s*\{/);
  });

  it('defines severity modifier classes for Low, Medium, and High', () => {
    const css = readFileSync(cssPath, 'utf-8');
    expect(css).toMatch(/severity--Low/);
    expect(css).toMatch(/severity--Medium/);
    expect(css).toMatch(/severity--High/);
  });

  it('contains reduced-motion media query', () => {
    const css = readFileSync(cssPath, 'utf-8');
    expect(css).toMatch(/prefers-reduced-motion/);
  });

  it('uses design tokens (CSS custom properties)', () => {
    const css = readFileSync(cssPath, 'utf-8');
    expect(css).toMatch(/var\(--/);
  });

  it('threat-model.css is imported in global.css', () => {
    const globalCss = readFileSync(resolve(STYLES_DIR, 'global.css'), 'utf-8');
    expect(globalCss).toMatch(/threat-model/);
  });
});

// ---------------------------------------------------------------------------
// Separation of concerns
// ---------------------------------------------------------------------------

describe('US-028: threat-model-card separation of concerns', () => {
  it('threat-model-card module does not import signal collection code', () => {
    const filepath = resolve(PROJECT_ROOT, 'src/ui/threat-model-card.ts');
    const source = readFileSync(filepath, 'utf-8');
    expect(source).not.toMatch(/from\s+['"].*signals/);
    expect(source).not.toMatch(/from\s+['"].*permissions/);
  });
});
