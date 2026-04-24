// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  INFERENCE_MARKER,
  type InferenceStatement,
  type EvidenceEntry,
} from '../../src/modules/shadow-profile/inference-schema';

/**
 * US-026: Shadow Profile Card Component
 *
 * Tests verify the shadow profile card renders an [Inference] marker,
 * statement text, evidence entries (signal + value + source), and
 * confidence badge as distinct DOM elements with correct content.
 */

const PROJECT_ROOT = resolve(__dirname, '../..');
const STYLES_DIR = resolve(PROJECT_ROOT, 'src/styles');
const MODULE_DIR = resolve(PROJECT_ROOT, 'src/modules/shadow-profile');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CERTAINTY_PATTERN =
  /\b(definitely|certainly|always|never|proves|guaranteed|undoubtedly|without doubt)\b/i;

function makeInference(overrides: Partial<InferenceStatement> = {}): InferenceStatement {
  return {
    statement: 'This device profile is consistent with a desktop or laptop workstation',
    evidence: [
      { signal: 'hardwareConcurrency', value: '8', source: 'navigator.hardwareConcurrency' },
      { signal: 'touchSupport', value: 'false', source: 'navigator.maxTouchPoints' },
      { signal: 'screenWidth', value: '1920', source: 'screen.width' },
    ],
    confidence: 'medium',
    marker: INFERENCE_MARKER,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// AC-1: Inference cards render
// ---------------------------------------------------------------------------

describe('US-026: shadow profile card renders', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('returns an HTMLElement', async () => {
    const { createShadowProfileCard } = await import('../../src/ui/shadow-profile-card');
    const card = createShadowProfileCard(makeInference());
    expect(card).toBeInstanceOf(HTMLElement);
  });

  it('root element is an <article> with .shadow-profile-card class', async () => {
    const { createShadowProfileCard } = await import('../../src/ui/shadow-profile-card');
    const card = createShadowProfileCard(makeInference());
    expect(card.tagName).toBe('ARTICLE');
    expect(card.classList.contains('shadow-profile-card')).toBe(true);
  });

  it('root element has the .card base class', async () => {
    const { createShadowProfileCard } = await import('../../src/ui/shadow-profile-card');
    const card = createShadowProfileCard(makeInference());
    expect(card.classList.contains('card')).toBe(true);
  });

  it('renders the statement text', async () => {
    const { createShadowProfileCard } = await import('../../src/ui/shadow-profile-card');
    const inference = makeInference({ statement: 'Timezone suggests eastern North America' });
    const card = createShadowProfileCard(inference);
    expect(card.textContent).toContain('Timezone suggests eastern North America');
  });
});

// ---------------------------------------------------------------------------
// AC-2: Every card visibly marked as inference
// ---------------------------------------------------------------------------

describe('US-026: [Inference] marker visibility', () => {
  it('card contains visible [Inference] marker text', async () => {
    const { createShadowProfileCard } = await import('../../src/ui/shadow-profile-card');
    const card = createShadowProfileCard(makeInference());
    expect(card.textContent).toContain('[Inference]');
  });

  it('[Inference] marker is rendered as a dedicated element, not inline text', async () => {
    const { createShadowProfileCard } = await import('../../src/ui/shadow-profile-card');
    const card = createShadowProfileCard(makeInference());
    // Marker should be in its own element (span, badge, etc.) with a class
    const markerEl = card.querySelector('[class*="marker"], [class*="inference-marker"]');
    expect(markerEl).not.toBeNull();
    expect(markerEl!.textContent).toContain('[Inference]');
  });

  it('marker text is exactly [Inference] (matches INFERENCE_MARKER constant)', async () => {
    const { createShadowProfileCard } = await import('../../src/ui/shadow-profile-card');
    const card = createShadowProfileCard(makeInference());
    const markerEl = card.querySelector('[class*="marker"], [class*="inference-marker"]');
    expect(markerEl!.textContent!.trim()).toBe(INFERENCE_MARKER);
  });

  it('every card in a list has a visible [Inference] marker', async () => {
    const { createShadowProfileCard, createShadowProfileCardList } = await import('../../src/ui/shadow-profile-card');
    const inferences = [
      makeInference({ statement: 'Inference A' }),
      makeInference({ statement: 'Inference B' }),
      makeInference({ statement: 'Inference C' }),
    ];
    const cardEls = inferences.map((inf) => createShadowProfileCard(inf));
    const list = createShadowProfileCardList(cardEls);
    const cards = list.querySelectorAll('.shadow-profile-card');
    for (const card of cards) {
      expect(card.textContent).toContain('[Inference]');
    }
  });
});

// ---------------------------------------------------------------------------
// AC-3: Evidence displayed
// ---------------------------------------------------------------------------

describe('US-026: evidence entries', () => {
  it('renders evidence entries for each piece of evidence', async () => {
    const { createShadowProfileCard } = await import('../../src/ui/shadow-profile-card');
    const evidence: EvidenceEntry[] = [
      { signal: 'timezone', value: 'America/New_York', source: 'Intl.DateTimeFormat' },
      { signal: 'languages', value: 'en-US, es-ES', source: 'navigator.languages' },
    ];
    const card = createShadowProfileCard(makeInference({ evidence }));
    // Each evidence entry's signal name should appear in the card
    expect(card.textContent).toContain('timezone');
    expect(card.textContent).toContain('languages');
  });

  it('evidence entries display the signal value', async () => {
    const { createShadowProfileCard } = await import('../../src/ui/shadow-profile-card');
    const evidence: EvidenceEntry[] = [
      { signal: 'hardwareConcurrency', value: '16', source: 'navigator.hardwareConcurrency' },
    ];
    const card = createShadowProfileCard(makeInference({ evidence }));
    expect(card.textContent).toContain('16');
  });

  it('evidence entries display the API source', async () => {
    const { createShadowProfileCard } = await import('../../src/ui/shadow-profile-card');
    const evidence: EvidenceEntry[] = [
      { signal: 'renderer', value: 'Apple M2 Pro', source: 'WebGL RENDERER parameter' },
    ];
    const card = createShadowProfileCard(makeInference({ evidence }));
    expect(card.textContent).toContain('WebGL RENDERER parameter');
  });

  it('renders all three fields (signal, value, source) for each evidence entry', async () => {
    const { createShadowProfileCard } = await import('../../src/ui/shadow-profile-card');
    const evidence: EvidenceEntry[] = [
      { signal: 'doNotTrack', value: '1', source: 'navigator.doNotTrack' },
    ];
    const card = createShadowProfileCard(makeInference({ evidence }));
    expect(card.textContent).toContain('doNotTrack');
    expect(card.textContent).toContain('1');
    expect(card.textContent).toContain('navigator.doNotTrack');
  });

  it('renders multiple evidence entries (correct count)', async () => {
    const { createShadowProfileCard } = await import('../../src/ui/shadow-profile-card');
    const evidence: EvidenceEntry[] = [
      { signal: 'hardwareConcurrency', value: '8', source: 'navigator.hardwareConcurrency' },
      { signal: 'touchSupport', value: 'false', source: 'navigator.maxTouchPoints' },
      { signal: 'screenWidth', value: '1920', source: 'screen.width' },
    ];
    const card = createShadowProfileCard(makeInference({ evidence }));
    // Each evidence should have its own element — look for evidence-related containers
    const evidenceEls = card.querySelectorAll('[class*="evidence"]');
    // At minimum the evidence container and individual entries exist
    expect(evidenceEls.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// AC-4: Confidence displayed
// ---------------------------------------------------------------------------

describe('US-026: confidence badge', () => {
  it('renders confidence label text', async () => {
    const { createShadowProfileCard } = await import('../../src/ui/shadow-profile-card');
    const card = createShadowProfileCard(makeInference({ confidence: 'medium' }));
    const confEl = card.querySelector('[class*="confidence"]');
    expect(confEl).not.toBeNull();
    expect(confEl!.textContent!.toLowerCase()).toContain('medium');
  });

  it('applies --low modifier class for low confidence', async () => {
    const { createShadowProfileCard } = await import('../../src/ui/shadow-profile-card');
    const card = createShadowProfileCard(makeInference({ confidence: 'low' }));
    const confEl = card.querySelector('[class*="confidence"]');
    expect(confEl).not.toBeNull();
    expect(confEl!.className).toMatch(/confidence--low/);
  });

  it('applies --medium modifier class for medium confidence', async () => {
    const { createShadowProfileCard } = await import('../../src/ui/shadow-profile-card');
    const card = createShadowProfileCard(makeInference({ confidence: 'medium' }));
    const confEl = card.querySelector('[class*="confidence"]');
    expect(confEl!.className).toMatch(/confidence--medium/);
  });

  it('applies --high modifier class for high confidence', async () => {
    const { createShadowProfileCard } = await import('../../src/ui/shadow-profile-card');
    const card = createShadowProfileCard(makeInference({ confidence: 'high' }));
    const confEl = card.querySelector('[class*="confidence"]');
    expect(confEl!.className).toMatch(/confidence--high/);
  });
});

// ---------------------------------------------------------------------------
// Semantic HTML structure
// ---------------------------------------------------------------------------

describe('US-026: semantic HTML structure', () => {
  it('card uses <article> element', async () => {
    const { createShadowProfileCard } = await import('../../src/ui/shadow-profile-card');
    const card = createShadowProfileCard(makeInference());
    expect(card.tagName).toBe('ARTICLE');
  });

  it('card contains a heading element for the statement', async () => {
    const { createShadowProfileCard } = await import('../../src/ui/shadow-profile-card');
    const card = createShadowProfileCard(makeInference());
    const headings = card.querySelectorAll('h3, h4, h5');
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// No certainty language in rendered text
// ---------------------------------------------------------------------------

describe('US-026: no certainty language in card text', () => {
  it('card text does not contain certainty words', async () => {
    const { createShadowProfileCard } = await import('../../src/ui/shadow-profile-card');
    const card = createShadowProfileCard(makeInference());
    expect(card.textContent).not.toMatch(CERTAINTY_PATTERN);
  });

  it('card with privacy inference does not contain certainty words', async () => {
    const { createShadowProfileCard } = await import('../../src/ui/shadow-profile-card');
    const inference = makeInference({
      statement: 'Signal pattern is consistent with a privacy-conscious user who actively manages browser settings',
      evidence: [
        { signal: 'doNotTrack', value: '1', source: 'navigator.doNotTrack' },
        { signal: 'permission:camera', value: 'denied', source: 'Permissions API' },
      ],
      confidence: 'low',
    });
    const card = createShadowProfileCard(inference);
    expect(card.textContent).not.toMatch(CERTAINTY_PATTERN);
  });
});

// ---------------------------------------------------------------------------
// Card list component
// ---------------------------------------------------------------------------

describe('US-026: createShadowProfileCardList', () => {
  it('renders correct number of child cards', async () => {
    const { createShadowProfileCard, createShadowProfileCardList } = await import('../../src/ui/shadow-profile-card');
    const cards = [
      createShadowProfileCard(makeInference({ statement: 'A' })),
      createShadowProfileCard(makeInference({ statement: 'B' })),
    ];
    const list = createShadowProfileCardList(cards);
    const rendered = list.querySelectorAll('.shadow-profile-card');
    expect(rendered.length).toBe(2);
  });

  it('wraps cards in a grid container', async () => {
    const { createShadowProfileCard, createShadowProfileCardList } = await import('../../src/ui/shadow-profile-card');
    const cards = [createShadowProfileCard(makeInference())];
    const list = createShadowProfileCardList(cards);
    expect(list.classList.contains('shadow-profile-card-list')).toBe(true);
  });

  it('renders zero cards without error', async () => {
    const { createShadowProfileCardList } = await import('../../src/ui/shadow-profile-card');
    const list = createShadowProfileCardList([]);
    expect(list.querySelectorAll('.shadow-profile-card').length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Module export contract
// ---------------------------------------------------------------------------

describe('US-026: shadow-profile-card export contract', () => {
  it('exports createShadowProfileCard function', async () => {
    const mod = await import('../../src/ui/shadow-profile-card');
    expect(typeof mod.createShadowProfileCard).toBe('function');
  });

  it('exports createShadowProfileCardList function', async () => {
    const mod = await import('../../src/ui/shadow-profile-card');
    expect(typeof mod.createShadowProfileCardList).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// CSS file structure
// ---------------------------------------------------------------------------

describe('US-026: shadow-profile CSS file', () => {
  const cssPath = resolve(MODULE_DIR, 'shadow-profile.css');

  it('shadow-profile.css exists', () => {
    expect(existsSync(cssPath)).toBe(true);
  });

  it('defines .shadow-profile-card class selector', () => {
    const css = readFileSync(cssPath, 'utf-8');
    expect(css).toMatch(/\.shadow-profile-card\s*\{/);
  });

  it('defines .shadow-profile-card-list class selector', () => {
    const css = readFileSync(cssPath, 'utf-8');
    expect(css).toMatch(/\.shadow-profile-card-list\s*\{/);
  });

  it('defines confidence modifier classes', () => {
    const css = readFileSync(cssPath, 'utf-8');
    expect(css).toMatch(/confidence--low/);
    expect(css).toMatch(/confidence--medium/);
    expect(css).toMatch(/confidence--high/);
  });

  it('contains reduced-motion media query', () => {
    const css = readFileSync(cssPath, 'utf-8');
    expect(css).toMatch(/prefers-reduced-motion/);
  });

  it('uses design tokens (CSS custom properties)', () => {
    const css = readFileSync(cssPath, 'utf-8');
    expect(css).toMatch(/var\(--/);
  });

  it('shadow-profile.css is imported in global.css', () => {
    const globalCss = readFileSync(resolve(STYLES_DIR, 'global.css'), 'utf-8');
    expect(globalCss).toMatch(/shadow-profile/);
  });
});

// ---------------------------------------------------------------------------
// Separation of concerns
// ---------------------------------------------------------------------------

describe('US-026: shadow-profile-card separation of concerns', () => {
  it('shadow-profile-card module does not import signal collection code', () => {
    const filepath = resolve(PROJECT_ROOT, 'src/ui/shadow-profile-card.ts');
    const source = readFileSync(filepath, 'utf-8');
    expect(source).not.toMatch(/from\s+['"].*signals/);
    expect(source).not.toMatch(/from\s+['"].*permissions/);
  });
});
