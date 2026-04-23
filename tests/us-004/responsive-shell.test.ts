// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * US-004: Create responsive application shell
 *
 * Tests verify the layout shell renders semantic HTML structure
 * and that CSS rules enforce responsive behavior.
 *
 * jsdom does not compute CSS layout, so responsive behavior is
 * verified by inspecting CSS source rules directly.
 */

const PROJECT_ROOT = resolve(__dirname, '../..');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function readCssFile(filename: string): string {
  const filepath = resolve(PROJECT_ROOT, 'src/layout', filename);
  return readFileSync(filepath, 'utf-8');
}

function readGlobalCss(): string {
  return readFileSync(resolve(PROJECT_ROOT, 'src/styles/global.css'), 'utf-8');
}

function loadShellCss(): string {
  const modulePath = resolve(PROJECT_ROOT, 'src/layout/shell.module.css');
  const plainPath = resolve(PROJECT_ROOT, 'src/layout/shell.css');
  if (existsSync(modulePath)) return readFileSync(modulePath, 'utf-8');
  if (existsSync(plainPath)) return readFileSync(plainPath, 'utf-8');
  throw new Error(
    'Shell CSS not found. Expected src/layout/shell.module.css or src/layout/shell.css',
  );
}

function loadAllCss(): string {
  let css = '';
  try { css += readGlobalCss(); } catch { /* ignore */ }
  try { css += loadShellCss(); } catch { /* ignore */ }
  return css;
}

// ---------------------------------------------------------------------------
// DOM rendering tests — shell structure
// ---------------------------------------------------------------------------
describe('US-004: responsive application shell', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  // -----------------------------------------------------------------------
  // AC-1, AC-2, AC-3: Header, main content area, and footer exist
  // -----------------------------------------------------------------------
  describe('shell HTML structure', () => {
    beforeEach(async () => {
      const mod = await import('../../src/layout/shell');
      mod.renderShell(container);
    });

    it('renders a <header> element', () => {
      const header = container.querySelector('header');
      expect(header).not.toBeNull();
    });

    it('renders a <main> content area', () => {
      const main = container.querySelector('main');
      expect(main).not.toBeNull();
    });

    it('renders a <footer> element', () => {
      const footer = container.querySelector('footer');
      expect(footer).not.toBeNull();
    });

    it('uses semantic landmark elements (header, main, footer)', () => {
      expect(container.querySelector('header')?.tagName).toBe('HEADER');
      expect(container.querySelector('main')?.tagName).toBe('MAIN');
      expect(container.querySelector('footer')?.tagName).toBe('FOOTER');
    });

    it('renders header before main, and main before footer in DOM order', () => {
      const children = Array.from(container.children);
      const headerIdx = children.findIndex((el) => el.tagName === 'HEADER');
      const mainIdx = children.findIndex((el) => el.tagName === 'MAIN');
      const footerIdx = children.findIndex((el) => el.tagName === 'FOOTER');

      expect(headerIdx).toBeGreaterThanOrEqual(0);
      expect(mainIdx).toBeGreaterThan(headerIdx);
      expect(footerIdx).toBeGreaterThan(mainIdx);
    });

    it('assigns an id to the main content area for module injection', () => {
      const main = container.querySelector('main');
      expect(main?.id).toBeTruthy();
    });
  });

  // -----------------------------------------------------------------------
  // AC-4: Desktop layout uses three columns at large widths (>=1200px)
  // -----------------------------------------------------------------------
  describe('shell CSS — desktop three-column layout', () => {
    it('defines a media query at min-width 1200px for desktop breakpoint', () => {
      const css = loadShellCss();
      expect(/min-width:\s*1200px/.test(css)).toBe(true);
    });

    it('uses a three-column grid layout at desktop widths', () => {
      const css = loadShellCss();
      const mediaBlock = css.match(
        /@media[^{]*min-width:\s*1200px[^{]*\{([\s\S]*?\})\s*\}/,
      );
      expect(mediaBlock).not.toBeNull();

      const content = mediaBlock![1];
      const hasThreeColumns =
        /repeat\(\s*3\s*,\s*1fr\s*\)/.test(content) ||
        /1fr\s+1fr\s+1fr/.test(content);
      expect(hasThreeColumns).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // AC-5: Mobile layout stacks modules vertically
  // -----------------------------------------------------------------------
  describe('shell CSS — mobile stacked layout', () => {
    it('defaults to single-column layout for mobile viewports', () => {
      const css = loadShellCss();
      // Strip media query blocks to inspect base (mobile-first) styles
      const base = css.replace(/@media[^{]*\{[\s\S]*?\}\s*\}/g, '');

      const hasSingleColumn =
        /grid-template-columns:\s*1fr\b/.test(base) ||
        (/display:\s*grid/.test(base) &&
          !/grid-template-columns:\s*(?!1fr)/.test(base));
      expect(hasSingleColumn).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // AC-6: No horizontal scrolling on common viewports
  // -----------------------------------------------------------------------
  describe('horizontal scroll prevention', () => {
    it('sets overflow-x to hidden on body or app container', () => {
      const allCss = loadAllCss();
      expect(/overflow-x:\s*hidden/.test(allCss)).toBe(true);
    });

    it('constrains width to prevent content overflow', () => {
      const allCss = loadAllCss();
      const hasConstraint =
        /max-width:\s*100vw/.test(allCss) ||
        /max-width:\s*100%/.test(allCss) ||
        /width:\s*100%/.test(allCss) ||
        /overflow-x:\s*hidden/.test(allCss);
      expect(hasConstraint).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Accessibility — semantic landmarks
  // -----------------------------------------------------------------------
  describe('accessibility', () => {
    beforeEach(async () => {
      const mod = await import('../../src/layout/shell');
      mod.renderShell(container);
    });

    it('uses semantic landmarks for screen reader navigation', () => {
      expect(container.querySelector('header')).not.toBeNull();
      expect(container.querySelector('main')).not.toBeNull();
      expect(container.querySelector('footer')).not.toBeNull();
    });

    it('main content area is a <main> element', () => {
      const main = container.querySelector('main');
      expect(main).not.toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Design tokens
  // -----------------------------------------------------------------------
  describe('design tokens', () => {
    it('tokens file defines --breakpoint-lg: 1200px', () => {
      const tokens = readFileSync(
        resolve(PROJECT_ROOT, 'src/styles/tokens.css'),
        'utf-8',
      );
      expect(/--breakpoint-lg:\s*1200px/.test(tokens)).toBe(true);
    });

    it('tokens file defines color custom properties', () => {
      const tokens = readFileSync(
        resolve(PROJECT_ROOT, 'src/styles/tokens.css'),
        'utf-8',
      );
      expect(/--color-/.test(tokens)).toBe(true);
    });

    it('tokens file defines spacing custom properties', () => {
      const tokens = readFileSync(
        resolve(PROJECT_ROOT, 'src/styles/tokens.css'),
        'utf-8',
      );
      expect(/--spacing-/.test(tokens) || /--space-/.test(tokens)).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Reduced motion support (CLAUDE.md accessibility requirement)
  // -----------------------------------------------------------------------
  describe('reduced motion support', () => {
    it('includes a prefers-reduced-motion media query', () => {
      const allCss = loadAllCss();
      expect(/prefers-reduced-motion/.test(allCss)).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // renderShell export contract
  // -----------------------------------------------------------------------
  describe('renderShell export contract', () => {
    it('exports a renderShell function', async () => {
      const mod = await import('../../src/layout/shell');
      expect(typeof mod.renderShell).toBe('function');
    });

    it('does not throw when called with a valid container', async () => {
      const mod = await import('../../src/layout/shell');
      expect(() => mod.renderShell(container)).not.toThrow();
    });

    it('populates the container with at least 3 child elements', async () => {
      const mod = await import('../../src/layout/shell');
      mod.renderShell(container);
      expect(container.children.length).toBeGreaterThanOrEqual(3);
    });
  });
});
