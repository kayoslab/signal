// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

vi.mock('../../src/ui/receipt-to-image', () => ({
  captureReceiptAsImage: vi.fn().mockResolvedValue(null),
}));

const PROJECT_ROOT = resolve(__dirname, '../..');
const SRC_DIR = resolve(PROJECT_ROOT, 'src');

/**
 * Tests for US-032: Add accessibility support
 *
 * Acceptance criteria:
 * - AC1: Keyboard navigation works
 * - AC2: Visible focus states exist
 * - AC3: Semantic landmarks used
 * - AC4: Color contrast acceptable
 */

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Recursively collect all CSS files under a directory. */
function collectCssFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectCssFiles(full));
    } else if (entry.name.endsWith('.css')) {
      results.push(full);
    }
  }
  return results;
}

/** Recursively collect all .ts files under a directory (excluding .test.ts, .d.ts). */
function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsFiles(full));
    } else if (
      entry.name.endsWith('.ts') &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.d.ts')
    ) {
      results.push(full);
    }
  }
  return results;
}

function setupBrowserEnv() {
  vi.stubGlobal('navigator', {
    languages: Object.freeze(['en-US', 'en']),
    language: 'en-US',
    platform: 'MacIntel',
    doNotTrack: 'Enabled',
    hardwareConcurrency: 8,
    maxTouchPoints: 0,
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
    permissions: {
      query: vi.fn().mockRejectedValue(new Error('Not supported')),
    },
  });

  vi.stubGlobal('Intl', {
    DateTimeFormat: () => ({
      resolvedOptions: () => ({ timeZone: 'America/New_York' }),
    }),
  });

  vi.stubGlobal('screen', { width: 1920, height: 1080 });

  Object.defineProperty(globalThis.window, 'screen', {
    value: { width: 1920, height: 1080 },
    configurable: true,
  });
  Object.defineProperty(globalThis.window, 'devicePixelRatio', {
    value: 2,
    configurable: true,
  });
}

function mockMatchMedia(reducedMotion: boolean) {
  Object.defineProperty(globalThis.window, 'matchMedia', {
    value: vi.fn((query: string) => ({
      matches: reducedMotion && query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
    configurable: true,
  });
}

/**
 * Calculate relative luminance of an sRGB hex colour.
 * See https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
function relativeLuminance(hex: string): number {
  const raw = hex.replace('#', '');
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;

  const linearize = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;

  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** WCAG 2.0 contrast ratio between two hex colours. */
function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/* ------------------------------------------------------------------ */
/*  AC1: Keyboard navigation works                                     */
/* ------------------------------------------------------------------ */

describe('AC1: Keyboard navigation works', () => {
  describe('Shell layout — semantic structure for keyboard nav', () => {
    let root: HTMLElement;

    beforeEach(() => {
      setupBrowserEnv();
      mockMatchMedia(false);
      root = document.createElement('div');
      root.id = 'app';
      document.body.appendChild(root);
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
      document.body.innerHTML = '';
    });

    it('shell creates a <main> element with id="dashboard"', async () => {
      const { renderShell } = await import('../../src/layout/shell');
      renderShell(root);

      const main = root.querySelector('main');
      expect(main).not.toBeNull();
      expect(main!.id).toBe('dashboard');
    });

    it('shell creates a <header> as the first landmark', async () => {
      const { renderShell } = await import('../../src/layout/shell');
      renderShell(root);

      const header = root.querySelector('header');
      expect(header).not.toBeNull();
      // Header should come before main in DOM order
      const landmarks = root.querySelectorAll('header, main, footer');
      expect(landmarks[0].tagName).toBe('HEADER');
    });

    it('shell creates a <footer> as the last landmark', async () => {
      const { renderShell } = await import('../../src/layout/shell');
      renderShell(root);

      const footer = root.querySelector('footer');
      expect(footer).not.toBeNull();
      const landmarks = root.querySelectorAll('header, main, footer');
      expect(landmarks[landmarks.length - 1].tagName).toBe('FOOTER');
    });

    it('landmark order is header → main → footer', async () => {
      const { renderShell } = await import('../../src/layout/shell');
      renderShell(root);

      const landmarks = Array.from(
        root.querySelectorAll('header, main, footer'),
      ).map((el) => el.tagName);

      expect(landmarks).toEqual(['HEADER', 'MAIN', 'FOOTER']);
    });
  });

  describe('Buttons are keyboard-accessible', () => {
    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it('copy button is a native <button> element (inherits keyboard support)', async () => {
      setupBrowserEnv();
      const { createCopyButton } = await import('../../src/ui/copy-button');
      const btn = createCopyButton(() => 'text');
      expect(btn).toBeInstanceOf(HTMLButtonElement);
    });

    it('rerun button is a native <button> element', async () => {
      const { createRerunButton } = await import('../../src/ui/rerun-button');
      const btn = createRerunButton(async () => {});
      expect(btn).toBeInstanceOf(HTMLButtonElement);
    });

    it('share image button is a native <button> element', async () => {
      const { createShareImageButton } = await import(
        '../../src/ui/share-image-button'
      );
      const btn = createShareImageButton(() => document.createElement('div'));
      expect(btn).toBeInstanceOf(HTMLButtonElement);
    });

    it('buttons are not disabled by default (keyboard reachable)', async () => {
      setupBrowserEnv();
      const { createCopyButton } = await import('../../src/ui/copy-button');
      const { createRerunButton } = await import('../../src/ui/rerun-button');

      const copy = createCopyButton(() => 'text');
      const rerun = createRerunButton(async () => {});

      expect(copy.disabled).toBe(false);
      expect(rerun.disabled).toBe(false);
    });
  });

  describe('No keyboard traps in button source code', () => {
    it('button components do not add tabindex=-1 (which would remove keyboard access)', () => {
      const buttonFiles = [
        resolve(SRC_DIR, 'ui/copy-button.ts'),
        resolve(SRC_DIR, 'ui/rerun-button.ts'),
        resolve(SRC_DIR, 'ui/share-image-button.ts'),
      ];

      for (const file of buttonFiles) {
        const source = readFileSync(file, 'utf-8');
        expect(source).not.toMatch(/tabindex\s*=\s*['"]-1['"]/i);
        expect(source).not.toMatch(/tabIndex\s*=\s*-1/);
      }
    });
  });
});

/* ------------------------------------------------------------------ */
/*  AC2: Visible focus states exist                                    */
/* ------------------------------------------------------------------ */

describe('AC2: Visible focus states exist', () => {
  it('button.css contains a :focus-visible rule for .btn', () => {
    const css = readFileSync(resolve(SRC_DIR, 'styles/button.css'), 'utf-8');
    expect(css).toMatch(/\.btn:focus-visible/);
  });

  it(':focus-visible rule sets an outline (not just background/border change)', () => {
    const css = readFileSync(resolve(SRC_DIR, 'styles/button.css'), 'utf-8');
    // Extract the focus-visible block
    const focusMatch = css.match(
      /\.btn:focus-visible\s*\{([^}]*)\}/,
    );
    expect(focusMatch).not.toBeNull();
    const block = focusMatch![1];
    // Must have outline property (visible indicator)
    expect(block).toMatch(/outline\s*:/);
  });

  it(':focus-visible outline uses the accent colour for visibility', () => {
    const css = readFileSync(resolve(SRC_DIR, 'styles/button.css'), 'utf-8');
    const focusMatch = css.match(/\.btn:focus-visible\s*\{([^}]*)\}/);
    expect(focusMatch).not.toBeNull();
    const block = focusMatch![1];
    // Should reference the accent colour variable
    expect(block).toMatch(/--color-accent/);
  });

  it(':focus-visible has outline-offset for spacing from the element', () => {
    const css = readFileSync(resolve(SRC_DIR, 'styles/button.css'), 'utf-8');
    const focusMatch = css.match(/\.btn:focus-visible\s*\{([^}]*)\}/);
    expect(focusMatch).not.toBeNull();
    expect(focusMatch![1]).toMatch(/outline-offset\s*:/);
  });

  it('no CSS file removes outline on :focus or :focus-visible (anti-pattern)', () => {
    const cssFiles = collectCssFiles(SRC_DIR);
    const violations: string[] = [];

    for (const file of cssFiles) {
      const css = readFileSync(file, 'utf-8');
      // Check for outline: none on focus states (bad practice)
      if (
        /(:focus-visible|:focus)\s*\{[^}]*outline\s*:\s*none/m.test(css) ||
        /(:focus-visible|:focus)\s*\{[^}]*outline\s*:\s*0/m.test(css)
      ) {
        const relative = file.replace(PROJECT_ROOT + '/', '');
        violations.push(relative);
      }
    }

    expect(
      violations,
      `CSS files that remove focus outlines:\n${violations.join('\n')}`,
    ).toHaveLength(0);
  });

  it('disabled buttons have reduced opacity (visual distinction)', () => {
    const css = readFileSync(resolve(SRC_DIR, 'styles/button.css'), 'utf-8');
    const disabledMatch = css.match(/\.btn:disabled\s*\{([^}]*)\}/);
    expect(disabledMatch).not.toBeNull();
    expect(disabledMatch![1]).toMatch(/opacity\s*:/);
  });
});

/* ------------------------------------------------------------------ */
/*  AC3: Semantic landmarks used                                       */
/* ------------------------------------------------------------------ */

describe('AC3: Semantic landmarks used', () => {
  describe('Shell semantic structure', () => {
    let root: HTMLElement;

    beforeEach(() => {
      setupBrowserEnv();
      mockMatchMedia(false);
      root = document.createElement('div');
      root.id = 'app';
      document.body.appendChild(root);
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
      document.body.innerHTML = '';
    });

    it('shell uses <header> for the page header', async () => {
      const { renderShell } = await import('../../src/layout/shell');
      renderShell(root);
      expect(root.querySelector('header')).not.toBeNull();
    });

    it('shell uses <main> for the primary content area', async () => {
      const { renderShell } = await import('../../src/layout/shell');
      renderShell(root);
      expect(root.querySelector('main')).not.toBeNull();
    });

    it('shell uses <footer> for trust statements', async () => {
      const { renderShell } = await import('../../src/layout/shell');
      renderShell(root);
      expect(root.querySelector('footer')).not.toBeNull();
    });

    it('header contains an <h1> heading', async () => {
      const { renderShell } = await import('../../src/layout/shell');
      renderShell(root);
      const h1 = root.querySelector('header h1');
      expect(h1).not.toBeNull();
      expect(h1!.textContent).toBeTruthy();
    });

    it('footer uses <ul> for trust statements (list semantics)', async () => {
      const { renderShell } = await import('../../src/layout/shell');
      renderShell(root);
      const list = root.querySelector('footer ul');
      expect(list).not.toBeNull();
      const items = list!.querySelectorAll('li');
      expect(items.length).toBeGreaterThan(0);
    });

    it('page has exactly one <h1>', async () => {
      const { renderShell } = await import('../../src/layout/shell');
      renderShell(root);
      const h1s = root.querySelectorAll('h1');
      expect(h1s.length).toBe(1);
    });
  });

  describe('OSINT section uses semantic structure', () => {
    it('createOsintSection returns a <section> element', async () => {
      const { createOsintSection } = await import('../../src/ui/osint-card');
      const section = createOsintSection('Zero-Click OSINT', [
        {
          title: 'Test',
          value: 'val',
          source: 'src',
          confidence: 'high',
          whyItMatters: 'why',
        },
      ]);
      expect(section.tagName).toBe('SECTION');
    });

    it('OSINT section contains an <h2> heading', async () => {
      const { createOsintSection } = await import('../../src/ui/osint-card');
      const section = createOsintSection('Zero-Click OSINT', []);
      const h2 = section.querySelector('h2');
      expect(h2).not.toBeNull();
      expect(h2!.textContent).toBe('Zero-Click OSINT');
    });

    it('OSINT cards use <article> elements', async () => {
      const { createOsintCard } = await import('../../src/ui/osint-card');
      const card = createOsintCard({
        title: 'Test',
        value: 'val',
        source: 'src',
        confidence: 'high',
        whyItMatters: 'why',
      });
      expect(card.tagName).toBe('ARTICLE');
    });

    it('OSINT cards have heading hierarchy (h4 inside article)', async () => {
      const { createOsintCard } = await import('../../src/ui/osint-card');
      const card = createOsintCard({
        title: 'Browser Family',
        value: 'Chrome',
        source: 'User-Agent',
        confidence: 'high',
        whyItMatters: 'Fingerprinting vector',
      });
      const h4 = card.querySelector('h4');
      expect(h4).not.toBeNull();
      expect(h4!.textContent).toBe('Browser Family');
    });
  });

  describe('Threat model cards use semantic structure', () => {
    it('threat card is an <article> element', async () => {
      const { createThreatCard } = await import(
        '../../src/ui/threat-model-card'
      );
      const card = createThreatCard({
        ruleId: 'test',
        title: 'Test Threat',
        description: 'Description',
        severity: 'High',
        evidence: ['ev1'],
        userImpact: 'Impact text',
        category: 'identity-exposure',
      });
      expect(card.tagName).toBe('ARTICLE');
    });

    it('threat card uses <h4> for the title', async () => {
      const { createThreatCard } = await import(
        '../../src/ui/threat-model-card'
      );
      const card = createThreatCard({
        ruleId: 'test',
        title: 'Test Threat',
        description: 'Description',
        severity: 'High',
        evidence: ['ev1'],
        userImpact: 'Impact text',
        category: 'identity-exposure',
      });
      const h4 = card.querySelector('h4');
      expect(h4).not.toBeNull();
      expect(h4!.textContent).toBe('Test Threat');
    });

    it('threat card uses <ul> for evidence list', async () => {
      const { createThreatCard } = await import(
        '../../src/ui/threat-model-card'
      );
      const card = createThreatCard({
        ruleId: 'test',
        title: 'Test',
        description: 'Desc',
        severity: 'Medium',
        evidence: ['Evidence 1', 'Evidence 2'],
        userImpact: 'Impact',
        category: 'social-engineering',
      });
      const ul = card.querySelector('ul');
      expect(ul).not.toBeNull();
      const items = ul!.querySelectorAll('li');
      expect(items.length).toBe(2);
    });

    it('severity badge has text content (not colour-only)', async () => {
      const { createThreatCard } = await import(
        '../../src/ui/threat-model-card'
      );
      const card = createThreatCard({
        ruleId: 'test',
        title: 'Test',
        description: 'Desc',
        severity: 'High',
        evidence: [],
        userImpact: 'Impact',
        category: 'identity-exposure',
      });
      const badge = card.querySelector('.threat-card-severity');
      expect(badge).not.toBeNull();
      expect(badge!.textContent!.trim()).toBe('High');
    });
  });

  describe('Shadow profile cards use semantic structure', () => {
    it('shadow profile card is an <article> element', async () => {
      const { createShadowProfileCard } = await import(
        '../../src/ui/shadow-profile-card'
      );
      const card = createShadowProfileCard({
        marker: '[Inference]',
        statement: 'Likely tech professional',
        evidence: [
          { signal: 'platform', value: 'MacIntel', source: 'navigator' },
        ],
        confidence: 'medium',
      });
      expect(card.tagName).toBe('ARTICLE');
    });

    it('shadow profile card uses <h4> for the statement', async () => {
      const { createShadowProfileCard } = await import(
        '../../src/ui/shadow-profile-card'
      );
      const card = createShadowProfileCard({
        marker: '[Inference]',
        statement: 'Likely tech professional',
        evidence: [
          { signal: 'platform', value: 'MacIntel', source: 'navigator' },
        ],
        confidence: 'medium',
      });
      const h4 = card.querySelector('h4');
      expect(h4).not.toBeNull();
    });

    it('shadow profile evidence uses <ul> list semantics', async () => {
      const { createShadowProfileCard } = await import(
        '../../src/ui/shadow-profile-card'
      );
      const card = createShadowProfileCard({
        marker: '[Inference]',
        statement: 'Statement',
        evidence: [
          { signal: 'sig', value: 'val', source: 'src' },
          { signal: 'sig2', value: 'val2', source: 'src2' },
        ],
        confidence: 'low',
      });
      const ul = card.querySelector('ul');
      expect(ul).not.toBeNull();
      expect(ul!.querySelectorAll('li').length).toBe(2);
    });

    it('inference marker is explicitly labelled in text (not colour-only)', async () => {
      const { createShadowProfileCard } = await import(
        '../../src/ui/shadow-profile-card'
      );
      const card = createShadowProfileCard({
        marker: '[Inference]',
        statement: 'Statement',
        evidence: [],
        confidence: 'high',
      });
      const marker = card.querySelector('.shadow-profile-card-inference-marker');
      expect(marker).not.toBeNull();
      expect(marker!.textContent).toBe('[Inference]');
    });

    it('confidence badge has text content (not colour-only)', async () => {
      const { createShadowProfileCard } = await import(
        '../../src/ui/shadow-profile-card'
      );
      const card = createShadowProfileCard({
        marker: '[Inference]',
        statement: 'Statement',
        evidence: [],
        confidence: 'high',
      });
      const badge = card.querySelector('.shadow-profile-card-confidence');
      expect(badge).not.toBeNull();
      expect(badge!.textContent!.trim()).toBe('high');
    });
  });

  describe('Source code uses semantic elements (static analysis)', () => {
    it('shell.ts creates header, main, and footer elements', () => {
      const source = readFileSync(
        resolve(SRC_DIR, 'layout/shell.ts'),
        'utf-8',
      );
      expect(source).toMatch(/createElement\(['"]header['"]\)/);
      expect(source).toMatch(/createElement\(['"]main['"]\)/);
      expect(source).toMatch(/createElement\(['"]footer['"]\)/);
    });

    it('card components use <article> elements', () => {
      const cardFiles = [
        resolve(SRC_DIR, 'ui/osint-card.ts'),
        resolve(SRC_DIR, 'ui/threat-model-card.ts'),
        resolve(SRC_DIR, 'ui/shadow-profile-card.ts'),
      ];

      for (const file of cardFiles) {
        const source = readFileSync(file, 'utf-8');
        expect(source).toMatch(/createElement\(['"]article['"]\)/);
      }
    });

    it('module sections use <section> elements', () => {
      const source = readFileSync(
        resolve(SRC_DIR, 'ui/osint-card.ts'),
        'utf-8',
      );
      expect(source).toMatch(/createElement\(['"]section['"]\)/);
    });
  });
});

/* ------------------------------------------------------------------ */
/*  AC4: Color contrast acceptable                                     */
/* ------------------------------------------------------------------ */

describe('AC4: Color contrast acceptable', () => {
  // Extract hex colours from tokens.css for testing
  const tokensCss = readFileSync(
    resolve(SRC_DIR, 'styles/tokens.css'),
    'utf-8',
  );

  function extractToken(name: string): string | null {
    const match = tokensCss.match(
      new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*(#[0-9a-fA-F]{6})`),
    );
    return match ? match[1] : null;
  }

  const colorBg = extractToken('--color-bg');
  const colorText = extractToken('--color-text');
  const colorTextMuted = extractToken('--color-text-muted');
  const colorAccent = extractToken('--color-accent');
  const colorSurface = extractToken('--color-surface');
  const colorDanger = extractToken('--color-danger');
  const colorSuccess = extractToken('--color-success');

  it('primary text on white background meets WCAG AA (≥ 4.5:1)', () => {
    expect(colorBg).not.toBeNull();
    expect(colorText).not.toBeNull();
    const ratio = contrastRatio(colorText!, colorBg!);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('muted text on white background meets WCAG AA for normal text (≥ 4.5:1)', () => {
    expect(colorBg).not.toBeNull();
    expect(colorTextMuted).not.toBeNull();
    const ratio = contrastRatio(colorTextMuted!, colorBg!);
    // WCAG AA requires 4.5:1 for normal text
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('accent colour on white background meets WCAG AA for large text (≥ 3:1)', () => {
    expect(colorBg).not.toBeNull();
    expect(colorAccent).not.toBeNull();
    const ratio = contrastRatio(colorAccent!, colorBg!);
    // Large text (18px+ or 14px+ bold) requires 3:1
    expect(ratio).toBeGreaterThanOrEqual(3);
  });

  it('primary text on surface background meets WCAG AA (≥ 4.5:1)', () => {
    expect(colorSurface).not.toBeNull();
    expect(colorText).not.toBeNull();
    const ratio = contrastRatio(colorText!, colorSurface!);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('muted text on surface background meets minimum contrast (≥ 3:1)', () => {
    expect(colorSurface).not.toBeNull();
    expect(colorTextMuted).not.toBeNull();
    const ratio = contrastRatio(colorTextMuted!, colorSurface!);
    // At minimum, must meet WCAG AA for large text
    expect(ratio).toBeGreaterThanOrEqual(3);
  });

  it('white text on accent background meets WCAG AA (≥ 4.5:1)', () => {
    expect(colorAccent).not.toBeNull();
    const ratio = contrastRatio('#ffffff', colorAccent!);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('danger colour on white meets WCAG AA for large text (≥ 3:1)', () => {
    expect(colorBg).not.toBeNull();
    expect(colorDanger).not.toBeNull();
    const ratio = contrastRatio(colorDanger!, colorBg!);
    expect(ratio).toBeGreaterThanOrEqual(3);
  });

  it('tokens.css defines all required colour variables', () => {
    expect(tokensCss).toMatch(/--color-bg\s*:/);
    expect(tokensCss).toMatch(/--color-text\s*:/);
    expect(tokensCss).toMatch(/--color-text-muted\s*:/);
    expect(tokensCss).toMatch(/--color-accent\s*:/);
    expect(tokensCss).toMatch(/--color-border\s*:/);
    expect(tokensCss).toMatch(/--color-surface\s*:/);
    expect(tokensCss).toMatch(/--color-success\s*:/);
    expect(tokensCss).toMatch(/--color-warning\s*:/);
    expect(tokensCss).toMatch(/--color-danger\s*:/);
  });
});

/* ------------------------------------------------------------------ */
/*  Cross-cutting: ARIA labels on interactive elements                 */
/* ------------------------------------------------------------------ */

describe('US-032: ARIA labels on buttons', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('copy button has an aria-label', async () => {
    setupBrowserEnv();
    const { createCopyButton } = await import('../../src/ui/copy-button');
    const btn = createCopyButton(() => 'text');
    expect(btn.getAttribute('aria-label')).toBeTruthy();
  });

  it('share image button has an aria-label', async () => {
    const { createShareImageButton } = await import(
      '../../src/ui/share-image-button'
    );
    const btn = createShareImageButton(() => document.createElement('div'));
    expect(btn.getAttribute('aria-label')).toBeTruthy();
  });

  it('copy button aria-label describes the action', async () => {
    setupBrowserEnv();
    const { createCopyButton } = await import('../../src/ui/copy-button');
    const btn = createCopyButton(() => 'text');
    const label = btn.getAttribute('aria-label')!.toLowerCase();
    expect(label).toMatch(/copy/i);
  });

  it('share image button aria-label describes the action', async () => {
    const { createShareImageButton } = await import(
      '../../src/ui/share-image-button'
    );
    const btn = createShareImageButton(() => document.createElement('div'));
    const label = btn.getAttribute('aria-label')!.toLowerCase();
    expect(label).toMatch(/export|share|image/i);
  });
});

/* ------------------------------------------------------------------ */
/*  Cross-cutting: Skip link and navigation aids                       */
/* ------------------------------------------------------------------ */

describe('US-032: Skip link and navigation structure', () => {
  it('shell.ts source references #dashboard as main content target', () => {
    const source = readFileSync(resolve(SRC_DIR, 'layout/shell.ts'), 'utf-8');
    // The main element must have id="dashboard" for skip link targeting
    expect(source).toMatch(/id\s*=\s*['"]dashboard['"]/);
  });
});

/* ------------------------------------------------------------------ */
/*  Cross-cutting: Intro overlay accessibility                         */
/* ------------------------------------------------------------------ */

describe('US-032: Intro overlay accessibility', () => {
  let root: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    setupBrowserEnv();
    mockMatchMedia(false);
    root = document.createElement('div');
    root.id = 'app';
    document.body.appendChild(root);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('intro overlay is fully removed from DOM after completion (not just hidden)', async () => {
    const { renderIntro } = await import(
      '../../src/modules/intro/intro-sequence'
    );
    const introPromise = renderIntro(root);

    // Advance past full animation sequence
    await vi.advanceTimersByTimeAsync(3000);
    await introPromise;

    const overlay = root.querySelector('.intro-overlay');
    expect(overlay).toBeNull();
  });

  it('intro lines contain meaningful text content', async () => {
    const { renderIntro } = await import(
      '../../src/modules/intro/intro-sequence'
    );
    const introPromise = renderIntro(root);

    const lines = root.querySelectorAll('.intro-line');
    expect(lines.length).toBe(3);

    for (const line of lines) {
      expect(line.textContent!.trim().length).toBeGreaterThan(0);
    }

    await vi.advanceTimersByTimeAsync(3000);
    await introPromise;
  });

  it('intro respects reduced motion preference (checks matchMedia)', () => {
    const source = readFileSync(
      resolve(SRC_DIR, 'modules/intro/intro-sequence.ts'),
      'utf-8',
    );
    expect(source).toMatch(/prefers-reduced-motion/);
    expect(source).toMatch(/matchMedia/);
  });
});

/* ------------------------------------------------------------------ */
/*  Cross-cutting: Global CSS does not break accessibility             */
/* ------------------------------------------------------------------ */

describe('US-032: CSS accessibility safeguards', () => {
  it('global reset does not suppress focus outlines globally', () => {
    const globalCss = readFileSync(
      resolve(SRC_DIR, 'styles/global.css'),
      'utf-8',
    );
    // The global reset should NOT contain outline: none or outline: 0
    expect(globalCss).not.toMatch(/\*\s*\{[^}]*outline\s*:\s*(?:none|0)/);
  });

  it('all CSS files with transitions have reduced-motion overrides', () => {
    const cssFiles = collectCssFiles(SRC_DIR);
    const transitionPattern = /(?:^|\s|;)(?:transition|animation)\s*:/m;
    const reducedMotionPattern =
      /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/;

    const missing: string[] = [];

    for (const file of cssFiles) {
      const css = readFileSync(file, 'utf-8');
      if (!transitionPattern.test(css)) continue;

      if (!reducedMotionPattern.test(css)) {
        const relative = file.replace(PROJECT_ROOT + '/', '');
        missing.push(relative);
      }
    }

    expect(
      missing,
      `CSS files with transitions but no prefers-reduced-motion:\n${missing.join('\n')}`,
    ).toHaveLength(0);
  });

  it('heading styles maintain readable line-height', () => {
    const globalCss = readFileSync(
      resolve(SRC_DIR, 'styles/global.css'),
      'utf-8',
    );
    // Headings should have line-height defined
    expect(globalCss).toMatch(/h1.*\{[^}]*line-height/s);
  });
});
