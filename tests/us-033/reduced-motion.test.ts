// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const PROJECT_ROOT = resolve(__dirname, '../..');
const SRC_DIR = resolve(PROJECT_ROOT, 'src');

/**
 * Tests for US-033: Add reduced motion behavior
 *
 * Acceptance criteria:
 * - AC1: Intro animations reduced or removed
 * - AC2: Transitions reduced
 * - AC3: No content hidden when motion disabled
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

function setupBrowserEnv() {
  vi.stubGlobal('navigator', {
    languages: Object.freeze(['en-US', 'en']),
    language: 'en-US',
    platform: 'MacIntel',
    doNotTrack: '1',
    hardwareConcurrency: 8,
    maxTouchPoints: 0,
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

/* ------------------------------------------------------------------ */
/*  AC1: Intro animations reduced or removed                           */
/* ------------------------------------------------------------------ */

describe('AC1: Intro animations reduced or removed', () => {
  const introCssPath = resolve(
    PROJECT_ROOT,
    'src/modules/intro/intro-sequence.css',
  );

  it('intro CSS contains prefers-reduced-motion media query', () => {
    const css = readFileSync(introCssPath, 'utf-8');
    expect(css).toMatch(
      /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/,
    );
  });

  it('intro CSS sets transition to none (not just reduced duration) under reduced motion', () => {
    const css = readFileSync(introCssPath, 'utf-8');
    // Extract the reduced-motion media query block
    const mediaMatch = css.match(
      /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{([\s\S]*?)\n\}/,
    );
    expect(mediaMatch).not.toBeNull();
    const block = mediaMatch![1];
    // Should contain transition: none for both .intro-line and .intro-overlay
    expect(block).toMatch(/transition\s*:\s*none/);
  });

  describe('intro JS with reduced motion', () => {
    let root: HTMLElement;

    beforeEach(() => {
      vi.useFakeTimers();
      setupBrowserEnv();
      mockMatchMedia(true);
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

    it('completes intro within 200ms when reduced motion is active', async () => {
      const { renderIntro } = await import(
        '../../src/modules/intro/intro-sequence'
      );
      let resolved = false;

      const introPromise = renderIntro(root).then(() => {
        resolved = true;
      });

      // At 200ms, the intro should be done under reduced motion
      await vi.advanceTimersByTimeAsync(200);
      await introPromise;

      expect(resolved).toBe(true);
    });

    it('all three intro lines are made visible immediately', async () => {
      const { renderIntro } = await import(
        '../../src/modules/intro/intro-sequence'
      );
      const introPromise = renderIntro(root);

      // Lines should be visible right away (before any timers advance)
      const lines = root.querySelectorAll('.intro-line');
      expect(lines.length).toBe(3);

      for (const line of lines) {
        expect(line.classList.contains('intro-line--visible')).toBe(true);
      }

      await vi.advanceTimersByTimeAsync(2000);
      await introPromise;
    });

    it('overlay is removed after completion', async () => {
      const { renderIntro } = await import(
        '../../src/modules/intro/intro-sequence'
      );
      const introPromise = renderIntro(root);

      await vi.advanceTimersByTimeAsync(2000);
      await introPromise;

      const overlay = root.querySelector('.intro-overlay');
      expect(overlay).toBeNull();
    });
  });
});

/* ------------------------------------------------------------------ */
/*  AC2: Transitions reduced                                           */
/* ------------------------------------------------------------------ */

describe('AC2: Transitions reduced across all CSS', () => {
  it('every CSS file with transition or animation has a prefers-reduced-motion override', () => {
    const cssFiles = collectCssFiles(SRC_DIR);
    const transitionPattern = /(?:^|\s|;)(?:transition|animation)(?:-[\w-]+)?\s*:/m;
    const reducedMotionPattern =
      /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/;

    const missing: string[] = [];

    for (const file of cssFiles) {
      const css = readFileSync(file, 'utf-8');
      // Skip files that only define CSS custom properties (tokens)
      if (!transitionPattern.test(css)) continue;
      // Skip token files that only define variables, not actual transitions
      const hasActualTransition = /(?:^|\s|;)(?:transition|animation)\s*:/m.test(css);
      if (!hasActualTransition) continue;

      if (!reducedMotionPattern.test(css)) {
        const relative = file.replace(PROJECT_ROOT + '/', '');
        missing.push(relative);
      }
    }

    expect(
      missing,
      `CSS files with transitions but no prefers-reduced-motion override:\n${missing.join('\n')}`,
    ).toHaveLength(0);
  });

  it('shell.css global catch-all covers all shell descendants', () => {
    const shellCss = readFileSync(
      resolve(SRC_DIR, 'layout/shell.css'),
      'utf-8',
    );
    // Must target .shell * to catch all child elements
    expect(shellCss).toMatch(/\.shell\s+\*/);
    // Must set transition-duration to near-zero
    expect(shellCss).toMatch(/transition-duration\s*:\s*0\.01ms/);
    // Must set animation-duration to near-zero
    expect(shellCss).toMatch(/animation-duration\s*:\s*0\.01ms/);
  });

  it('button.css has explicit prefers-reduced-motion override', () => {
    const buttonCss = readFileSync(
      resolve(SRC_DIR, 'styles/button.css'),
      'utf-8',
    );
    expect(buttonCss).toMatch(
      /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/,
    );
  });

  it('receipt.css disables pulse animation under reduced motion', () => {
    const css = readFileSync(resolve(SRC_DIR, 'styles/receipt.css'), 'utf-8');
    const mediaMatch = css.match(
      /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{([\s\S]*?)\n\}/,
    );
    expect(mediaMatch).not.toBeNull();
    expect(mediaMatch![1]).toMatch(/animation\s*:\s*none/);
  });

  it('osint-card.css sets transition: none under reduced motion', () => {
    const css = readFileSync(resolve(SRC_DIR, 'styles/osint-card.css'), 'utf-8');
    const mediaMatch = css.match(
      /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{([\s\S]*?)\n\}/,
    );
    expect(mediaMatch).not.toBeNull();
    expect(mediaMatch![1]).toMatch(/transition\s*:\s*none/);
  });

  it('permission-debt.css sets transition: none under reduced motion', () => {
    const css = readFileSync(
      resolve(SRC_DIR, 'modules/permission-debt/permission-debt.css'),
      'utf-8',
    );
    const mediaMatch = css.match(
      /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{([\s\S]*?)\n\}/,
    );
    expect(mediaMatch).not.toBeNull();
    expect(mediaMatch![1]).toMatch(/transition\s*:\s*none/);
  });
});

/* ------------------------------------------------------------------ */
/*  AC3: No content hidden when motion disabled                        */
/* ------------------------------------------------------------------ */

describe('AC3: No content hidden when motion disabled', () => {
  it('intro CSS sets opacity: 1 and transform: none for .intro-line under reduced motion', () => {
    const css = readFileSync(
      resolve(SRC_DIR, 'modules/intro/intro-sequence.css'),
      'utf-8',
    );
    const mediaMatch = css.match(
      /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{([\s\S]*?)\n\}/,
    );
    expect(mediaMatch).not.toBeNull();
    const block = mediaMatch![1];

    // .intro-line must have opacity: 1 so content is never invisible
    expect(block).toMatch(/opacity\s*:\s*1/);
    // .intro-line must have transform: none so content is in place
    expect(block).toMatch(/transform\s*:\s*none/);
  });

  it('no CSS file hides content conditionally on motion preference', () => {
    const cssFiles = collectCssFiles(SRC_DIR);
    const reducedMotionBlockPattern =
      /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{([\s\S]*?)\n\}/g;
    const hidingPattern = /(?:display\s*:\s*none|visibility\s*:\s*hidden)/;

    const violations: string[] = [];

    for (const file of cssFiles) {
      const css = readFileSync(file, 'utf-8');
      let match: RegExpExecArray | null;
      while ((match = reducedMotionBlockPattern.exec(css)) !== null) {
        if (hidingPattern.test(match[1])) {
          const relative = file.replace(PROJECT_ROOT + '/', '');
          violations.push(relative);
        }
      }
    }

    expect(
      violations,
      `CSS files that hide content under reduced motion:\n${violations.join('\n')}`,
    ).toHaveLength(0);
  });

  describe('integration: full intro with reduced motion', () => {
    let root: HTMLElement;

    beforeEach(() => {
      vi.useFakeTimers();
      setupBrowserEnv();
      mockMatchMedia(true);
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

    it('all three text lines are immediately readable in the DOM', async () => {
      const { renderIntro } = await import(
        '../../src/modules/intro/intro-sequence'
      );
      const introPromise = renderIntro(root);

      // All lines should be present and have text
      const lines = root.querySelectorAll('.intro-line');
      expect(lines.length).toBe(3);

      const texts = Array.from(lines).map((el) => el.textContent ?? '');

      // Headline
      expect(texts[0]).toContain('browser');
      // Signal count
      expect(texts[1]).toMatch(/\d+\s*signal/i);
      // Privacy statement
      expect(texts[2].toLowerCase()).toMatch(/local|privacy|no data/);

      // All should have the visible class
      for (const line of lines) {
        expect(line.classList.contains('intro-line--visible')).toBe(true);
      }

      await vi.advanceTimersByTimeAsync(2000);
      await introPromise;
    });

    it('overlay element is accessible during display period', async () => {
      const { renderIntro } = await import(
        '../../src/modules/intro/intro-sequence'
      );
      const introPromise = renderIntro(root);

      const overlay = root.querySelector('.intro-overlay');
      expect(overlay).not.toBeNull();
      // Overlay should not have display:none or visibility:hidden
      expect(overlay!.classList.contains('intro-overlay--fade-out')).toBe(
        false,
      );

      await vi.advanceTimersByTimeAsync(2000);
      await introPromise;
    });
  });
});
