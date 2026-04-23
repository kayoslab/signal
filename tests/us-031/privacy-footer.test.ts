// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * US-031: Add persistent privacy footer
 *
 * Tests verify the footer contains all required trust statements
 * and uses semantic HTML with proper styling via design tokens.
 */

const PROJECT_ROOT = resolve(__dirname, '../..');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function loadShellCss(): string {
  const modulePath = resolve(PROJECT_ROOT, 'src/layout/shell.module.css');
  const plainPath = resolve(PROJECT_ROOT, 'src/layout/shell.css');
  if (existsSync(modulePath)) return readFileSync(modulePath, 'utf-8');
  if (existsSync(plainPath)) return readFileSync(plainPath, 'utf-8');
  throw new Error(
    'Shell CSS not found. Expected src/layout/shell.module.css or src/layout/shell.css',
  );
}

// ---------------------------------------------------------------------------
// AC-1: Footer visible on page
// ---------------------------------------------------------------------------
describe('US-031: persistent privacy footer', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('footer presence', () => {
    beforeEach(async () => {
      const mod = await import('../../src/layout/shell');
      mod.renderShell(container);
    });

    it('renders a <footer> element in the shell', () => {
      const footer = container.querySelector('footer');
      expect(footer).not.toBeNull();
    });

    it('footer is the last child of the shell', () => {
      const children = Array.from(container.children);
      const lastChild = children[children.length - 1];
      expect(lastChild.tagName).toBe('FOOTER');
    });

    it('footer uses semantic <footer> tag', () => {
      const footer = container.querySelector('footer');
      expect(footer?.tagName).toBe('FOOTER');
    });
  });

  // -----------------------------------------------------------------------
  // AC-2: States no cookies
  // -----------------------------------------------------------------------
  describe('trust statement: no cookies', () => {
    beforeEach(async () => {
      const mod = await import('../../src/layout/shell');
      mod.renderShell(container);
    });

    it('footer contains "No cookies" text', () => {
      const footer = container.querySelector('footer');
      expect(footer?.textContent?.toLowerCase()).toContain('no cookies');
    });
  });

  // -----------------------------------------------------------------------
  // AC-3: States no analytics
  // -----------------------------------------------------------------------
  describe('trust statement: no analytics', () => {
    beforeEach(async () => {
      const mod = await import('../../src/layout/shell');
      mod.renderShell(container);
    });

    it('footer contains "No analytics" text', () => {
      const footer = container.querySelector('footer');
      expect(footer?.textContent?.toLowerCase()).toContain('no analytics');
    });
  });

  // -----------------------------------------------------------------------
  // AC-4: States no backend profiling
  // -----------------------------------------------------------------------
  describe('trust statement: no backend profiling', () => {
    beforeEach(async () => {
      const mod = await import('../../src/layout/shell');
      mod.renderShell(container);
    });

    it('footer contains "No backend profiling" text', () => {
      const footer = container.querySelector('footer');
      expect(footer?.textContent?.toLowerCase()).toContain(
        'no backend profiling',
      );
    });
  });

  // -----------------------------------------------------------------------
  // AC-5: States all analysis runs locally
  // -----------------------------------------------------------------------
  describe('trust statement: analysis runs locally', () => {
    beforeEach(async () => {
      const mod = await import('../../src/layout/shell');
      mod.renderShell(container);
    });

    it('footer contains text about analysis running locally', () => {
      const footer = container.querySelector('footer');
      expect(footer?.textContent?.toLowerCase()).toMatch(
        /analysis runs locally/,
      );
    });
  });

  // -----------------------------------------------------------------------
  // All four trust statements present together
  // -----------------------------------------------------------------------
  describe('all trust statements present', () => {
    beforeEach(async () => {
      const mod = await import('../../src/layout/shell');
      mod.renderShell(container);
    });

    it('footer contains all four required trust statements', () => {
      const footer = container.querySelector('footer');
      const text = footer?.textContent?.toLowerCase() ?? '';

      expect(text).toContain('no cookies');
      expect(text).toContain('no analytics');
      expect(text).toContain('no backend profiling');
      expect(text).toMatch(/analysis runs locally/);
    });

    it('each trust statement is in its own element for testability', () => {
      const footer = container.querySelector('footer');
      const items =
        footer?.querySelectorAll('li, span, [data-trust]') ??
        ([] as unknown as NodeListOf<Element>);
      expect(items.length).toBeGreaterThanOrEqual(4);
    });
  });

  // -----------------------------------------------------------------------
  // CSS — footer uses design tokens
  // -----------------------------------------------------------------------
  describe('footer CSS uses design tokens', () => {
    it('footer styles reference --color-text-muted or muted color token', () => {
      const css = loadShellCss();
      expect(css).toMatch(/--color-text-muted/);
    });

    it('footer styles reference spacing tokens', () => {
      const css = loadShellCss();
      const hasSpacing =
        /--spacing-/.test(css) || /--space-/.test(css);
      expect(hasSpacing).toBe(true);
    });

    it('footer styles reference font-size tokens', () => {
      const css = loadShellCss();
      expect(css).toMatch(/--font-size/);
    });
  });

  // -----------------------------------------------------------------------
  // Regression — existing shell structure preserved
  // -----------------------------------------------------------------------
  describe('regression: shell structure preserved', () => {
    beforeEach(async () => {
      const mod = await import('../../src/layout/shell');
      mod.renderShell(container);
    });

    it('shell still contains header, main, and footer in order', () => {
      const children = Array.from(container.children);
      const tags = children.map((el) => el.tagName);

      expect(tags).toContain('HEADER');
      expect(tags).toContain('MAIN');
      expect(tags).toContain('FOOTER');

      const headerIdx = tags.indexOf('HEADER');
      const mainIdx = tags.indexOf('MAIN');
      const footerIdx = tags.indexOf('FOOTER');

      expect(mainIdx).toBeGreaterThan(headerIdx);
      expect(footerIdx).toBeGreaterThan(mainIdx);
    });

    it('main content area retains its id for module injection', () => {
      const main = container.querySelector('main');
      expect(main?.id).toBeTruthy();
    });
  });
});
