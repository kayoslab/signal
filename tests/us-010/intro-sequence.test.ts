// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROJECT_ROOT = resolve(__dirname, '../..');

/**
 * Tests for the intro-sequence module (`src/modules/intro/intro-sequence.ts`).
 *
 * Acceptance criteria covered:
 * - AC1: Intro text appears on first load
 * - AC2: Signal count derived from snapshot fields
 * - AC3: Privacy statement appears
 * - AC4: Intro completes automatically within 2 seconds
 * - AC5: Reduced motion users receive minimal animation
 */

/* ------------------------------------------------------------------ */
/*  Browser environment helpers                                        */
/* ------------------------------------------------------------------ */

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

  // Provide enough of the window object for signal collectors
  const origWindow = globalThis.window;
  Object.defineProperty(globalThis.window, 'screen', {
    value: { width: 1920, height: 1080 },
    configurable: true,
  });
  Object.defineProperty(globalThis.window, 'devicePixelRatio', {
    value: 2,
    configurable: true,
  });

  // matchMedia stub (default: motion allowed)
  Object.defineProperty(globalThis.window, 'matchMedia', {
    value: vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
    configurable: true,
  });
}

/* ------------------------------------------------------------------ */
/*  Test suites                                                        */
/* ------------------------------------------------------------------ */

describe('Intro Sequence', () => {
  let root: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    setupBrowserEnv();
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

  async function loadRenderIntro() {
    const mod = await import('../../src/modules/intro/intro-sequence');
    return mod.renderIntro;
  }

  describe('AC1: intro text appears on first load', () => {
    it('renders an overlay element into the root', async () => {
      const renderIntro = await loadRenderIntro();
      const introPromise = renderIntro(root);

      // The overlay should be in the DOM immediately after calling renderIntro
      const overlay = root.querySelector('[class*="intro"], [data-intro]');
      expect(overlay || root.children.length).toBeTruthy();

      // Advance timers to let the intro complete
      await vi.advanceTimersByTimeAsync(2500);
      await introPromise;
    });

    it('contains introductory text content', async () => {
      const renderIntro = await loadRenderIntro();
      const introPromise = renderIntro(root);

      // The root should contain text — at minimum some kind of intro message
      const textContent = root.textContent ?? '';
      expect(textContent.length).toBeGreaterThan(0);

      await vi.advanceTimersByTimeAsync(2500);
      await introPromise;
    });
  });

  describe('AC2: signal count derived from snapshot fields', () => {
    it('displays a numeric signal count in the intro', async () => {
      const renderIntro = await loadRenderIntro();
      const introPromise = renderIntro(root);

      const textContent = root.textContent ?? '';
      // Should contain a number (the signal count) — e.g. "17 signals"
      const hasNumber = /\d+/.test(textContent);
      expect(hasNumber).toBe(true);

      await vi.advanceTimersByTimeAsync(2500);
      await introPromise;
    });

    it('signal count text matches a recognizable pattern', async () => {
      const renderIntro = await loadRenderIntro();
      const introPromise = renderIntro(root);

      const textContent = root.textContent ?? '';
      // Should match a pattern like "N signals" or "N signals detected"
      const signalPattern = /\d+\s*signal/i;
      expect(textContent).toMatch(signalPattern);

      await vi.advanceTimersByTimeAsync(2500);
      await introPromise;
    });
  });

  describe('AC3: privacy statement appears', () => {
    it('displays a privacy-related statement', async () => {
      const renderIntro = await loadRenderIntro();
      const introPromise = renderIntro(root);

      const textContent = (root.textContent ?? '').toLowerCase();
      // Should contain privacy language — one of these common phrases
      const hasPrivacyText =
        textContent.includes('local') ||
        textContent.includes('privacy') ||
        textContent.includes('no data leaves') ||
        textContent.includes('client-side') ||
        textContent.includes('your browser');
      expect(hasPrivacyText).toBe(true);

      await vi.advanceTimersByTimeAsync(2500);
      await introPromise;
    });
  });

  describe('AC4: intro completes automatically within 2 seconds', () => {
    it('resolves its promise within 2000ms', async () => {
      const renderIntro = await loadRenderIntro();
      let resolved = false;

      const introPromise = renderIntro(root).then(() => {
        resolved = true;
      });

      // At 1999ms it may or may not be done
      // At 2000ms it must be done
      await vi.advanceTimersByTimeAsync(2000);
      await introPromise;

      expect(resolved).toBe(true);
    });

    it('removes the overlay from the DOM after completion', async () => {
      const renderIntro = await loadRenderIntro();
      const introPromise = renderIntro(root);

      // Before completion, root should have intro content
      expect(root.children.length).toBeGreaterThan(0);

      await vi.advanceTimersByTimeAsync(2500);
      await introPromise;

      // After completion, the intro overlay should be removed or empty
      // The root should be cleared for the shell to render into
      const overlay = root.querySelector('[class*="intro"], [data-intro]');
      expect(overlay).toBeNull();
    });
  });

  describe('AC5: reduced motion support', () => {
    it('CSS file contains prefers-reduced-motion media query', () => {
      const cssPath = resolve(
        PROJECT_ROOT,
        'src/modules/intro/intro-sequence.css',
      );
      let css: string;
      try {
        css = readFileSync(cssPath, 'utf-8');
      } catch {
        // File doesn't exist yet — this test documents the requirement
        expect.fail(
          'intro-sequence.css must exist and contain a prefers-reduced-motion media query',
        );
        return;
      }

      expect(css).toMatch(
        /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/,
      );
    });

    it('completes within 2 seconds even with reduced motion', async () => {
      // Override matchMedia to report reduced motion preference
      Object.defineProperty(globalThis.window, 'matchMedia', {
        value: vi.fn((query: string) => ({
          matches: query.includes('prefers-reduced-motion'),
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
        configurable: true,
      });

      const renderIntro = await loadRenderIntro();
      let resolved = false;

      const introPromise = renderIntro(root).then(() => {
        resolved = true;
      });

      await vi.advanceTimersByTimeAsync(2000);
      await introPromise;

      expect(resolved).toBe(true);
    });
  });

  describe('integration: intro into shell handoff', () => {
    it('root is available for shell rendering after intro completes', async () => {
      const renderIntro = await loadRenderIntro();
      const introPromise = renderIntro(root);

      await vi.advanceTimersByTimeAsync(2500);
      await introPromise;

      // Root should be in the DOM and usable
      expect(root.parentElement).toBe(document.body);
      expect(root).toBeTruthy();
    });

    it('renderIntro returns a promise', async () => {
      const renderIntro = await loadRenderIntro();
      const result = renderIntro(root);

      expect(result).toBeInstanceOf(Promise);

      await vi.advanceTimersByTimeAsync(2500);
      await result;
    });
  });
});
