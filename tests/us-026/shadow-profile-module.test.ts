// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { INFERENCE_MARKER } from '../../src/modules/shadow-profile/inference-schema';

/**
 * US-026: Shadow Profile Module Renderer
 *
 * Tests verify that renderShadowProfileModule() orchestrates data collection,
 * applies inference rules, and renders the result as a DOM section with
 * inference cards — including graceful empty-state handling.
 */

const PROJECT_ROOT = resolve(__dirname, '../..');

const CERTAINTY_PATTERN =
  /\b(definitely|certainly|always|never|proves|guaranteed|undoubtedly|without doubt)\b/i;

// ---------------------------------------------------------------------------
// Browser environment setup
// ---------------------------------------------------------------------------

function setupBrowserMocks(): void {
  vi.stubGlobal('navigator', {
    languages: ['en-US', 'es-ES'],
    platform: 'MacIntel',
    doNotTrack: '1',
    hardwareConcurrency: 16,
    maxTouchPoints: 0,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  });

  Object.defineProperty(globalThis.window, 'screen', {
    value: { width: 2560, height: 1440 },
    writable: true,
    configurable: true,
  });

  Object.defineProperty(globalThis.window, 'devicePixelRatio', {
    value: 2,
    writable: true,
    configurable: true,
  });

  // WebGL stub
  const canvas = document.createElement('canvas');
  const origGetContext = canvas.getContext.bind(canvas);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    function (this: HTMLCanvasElement, contextId: string, ...args: unknown[]) {
      if (contextId === 'webgl' || contextId === 'webgl2') {
        return {
          getParameter: (pname: number) => {
            if (pname === 0x1f01) return 'Google Inc. (Apple)';
            if (pname === 0x1f00) return 'ANGLE (Apple, Apple M2 Max)';
            return null;
          },
          getExtension: () => ({
            UNMASKED_VENDOR_WEBGL: 0x9245,
            UNMASKED_RENDERER_WEBGL: 0x9246,
          }),
        } as unknown as WebGLRenderingContext;
      }
      return origGetContext(contextId, ...args);
    } as typeof canvas.getContext,
  );

  // Storage stubs
  vi.stubGlobal('localStorage', { getItem: vi.fn(), setItem: vi.fn() });
  vi.stubGlobal('sessionStorage', { getItem: vi.fn(), setItem: vi.fn() });

  // Intl.DateTimeFormat stub
  const origDateTimeFormat = Intl.DateTimeFormat;
  vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(
    (...args: ConstructorParameters<typeof Intl.DateTimeFormat>) => {
      const instance = new origDateTimeFormat(...args);
      vi.spyOn(instance, 'resolvedOptions').mockReturnValue({
        ...instance.resolvedOptions(),
        timeZone: 'America/New_York',
      });
      return instance;
    },
  );

  // indexedDB presence
  if (!globalThis.indexedDB) {
    vi.stubGlobal('indexedDB', {});
  }
}

// ---------------------------------------------------------------------------
// Module renderer tests
// ---------------------------------------------------------------------------

describe('US-026: renderShadowProfileModule', () => {
  beforeEach(() => {
    vi.resetModules();
    setupBrowserMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an HTMLElement', async () => {
    const { renderShadowProfileModule } = await import(
      '../../src/modules/shadow-profile/shadow-profile-module'
    );
    const el = await renderShadowProfileModule();
    expect(el).toBeInstanceOf(HTMLElement);
  });

  it('renders a <section> element', async () => {
    const { renderShadowProfileModule } = await import(
      '../../src/modules/shadow-profile/shadow-profile-module'
    );
    const el = await renderShadowProfileModule();
    expect(el.tagName).toBe('SECTION');
  });

  it('section contains an h2 heading with text "Shadow Profile"', async () => {
    const { renderShadowProfileModule } = await import(
      '../../src/modules/shadow-profile/shadow-profile-module'
    );
    const el = await renderShadowProfileModule();
    const h2 = el.querySelector('h2');
    expect(h2).not.toBeNull();
    expect(h2!.textContent).toContain('Shadow Profile');
  });

  it('renders inference cards when inferences are available', async () => {
    const { renderShadowProfileModule } = await import(
      '../../src/modules/shadow-profile/shadow-profile-module'
    );
    const el = await renderShadowProfileModule();
    const cards = el.querySelectorAll('.shadow-profile-card');
    // With the rich mock data, at least some rules should fire
    expect(cards.length).toBeGreaterThanOrEqual(1);
  });

  it('every rendered card contains the visible [Inference] marker', async () => {
    const { renderShadowProfileModule } = await import(
      '../../src/modules/shadow-profile/shadow-profile-module'
    );
    const el = await renderShadowProfileModule();
    const cards = el.querySelectorAll('.shadow-profile-card');
    for (const card of cards) {
      expect(card.textContent).toContain(INFERENCE_MARKER);
    }
  });

  it('no certainty language appears in any rendered card text', async () => {
    const { renderShadowProfileModule } = await import(
      '../../src/modules/shadow-profile/shadow-profile-module'
    );
    const el = await renderShadowProfileModule();
    const cards = el.querySelectorAll('.shadow-profile-card');
    for (const card of cards) {
      expect(card.textContent).not.toMatch(CERTAINTY_PATTERN);
    }
  });

  it('each card displays evidence entries', async () => {
    const { renderShadowProfileModule } = await import(
      '../../src/modules/shadow-profile/shadow-profile-module'
    );
    const el = await renderShadowProfileModule();
    const cards = el.querySelectorAll('.shadow-profile-card');
    for (const card of cards) {
      // Each card should have evidence content (signal names from the inference rules)
      const evidenceEls = card.querySelectorAll('[class*="evidence"]');
      expect(evidenceEls.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('each card displays a confidence badge', async () => {
    const { renderShadowProfileModule } = await import(
      '../../src/modules/shadow-profile/shadow-profile-module'
    );
    const el = await renderShadowProfileModule();
    const cards = el.querySelectorAll('.shadow-profile-card');
    for (const card of cards) {
      const confEl = card.querySelector('[class*="confidence"]');
      expect(confEl).not.toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// Empty state handling
// ---------------------------------------------------------------------------

describe('US-026: empty state', () => {
  beforeEach(() => {
    vi.resetModules();
    // Set up minimal browser mocks that won't trigger any inference rules
    vi.stubGlobal('navigator', {
      languages: ['en-US'],
      platform: 'Linux armv7l',
      doNotTrack: 'unspecified',
      hardwareConcurrency: 2,
      maxTouchPoints: 5,
      userAgent: 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
    });

    Object.defineProperty(globalThis.window, 'screen', {
      value: { width: 375, height: 812 },
      writable: true,
      configurable: true,
    });

    Object.defineProperty(globalThis.window, 'devicePixelRatio', {
      value: 1,
      writable: true,
      configurable: true,
    });

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    vi.stubGlobal('localStorage', { getItem: vi.fn(), setItem: vi.fn() });
    vi.stubGlobal('sessionStorage', { getItem: vi.fn(), setItem: vi.fn() });

    const origDateTimeFormat = Intl.DateTimeFormat;
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(
      (...args: ConstructorParameters<typeof Intl.DateTimeFormat>) => {
        const instance = new origDateTimeFormat(...args);
        vi.spyOn(instance, 'resolvedOptions').mockReturnValue({
          ...instance.resolvedOptions(),
          timeZone: 'Etc/Unknown',
        });
        return instance;
      },
    );

    if (!globalThis.indexedDB) {
      vi.stubGlobal('indexedDB', {});
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles zero inferences gracefully (no errors)', async () => {
    const { renderShadowProfileModule } = await import(
      '../../src/modules/shadow-profile/shadow-profile-module'
    );
    await expect(renderShadowProfileModule()).resolves.toBeInstanceOf(HTMLElement);
  });

  it('renders an empty-state message when no inferences are generated', async () => {
    const { renderShadowProfileModule } = await import(
      '../../src/modules/shadow-profile/shadow-profile-module'
    );
    const el = await renderShadowProfileModule();
    const cards = el.querySelectorAll('.shadow-profile-card');
    if (cards.length === 0) {
      // Should show an informative message, not just render nothing
      const textContent = el.textContent || '';
      expect(textContent.length).toBeGreaterThan(0);
      // The section should still have the heading plus some message
      const h2 = el.querySelector('h2');
      expect(h2).not.toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// Barrel export contract
// ---------------------------------------------------------------------------

describe('US-026: shadow-profile barrel export', () => {
  it('index.ts re-exports renderShadowProfileModule', async () => {
    const mod = await import('../../src/modules/shadow-profile/index');
    expect(typeof mod.renderShadowProfileModule).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Separation of concerns
// ---------------------------------------------------------------------------

describe('US-026: shadow-profile-module separation of concerns', () => {
  it('shadow-profile-module does not directly manipulate DOM outside its return value', () => {
    const filepath = resolve(PROJECT_ROOT, 'src/modules/shadow-profile/shadow-profile-module.ts');
    const source = readFileSync(filepath, 'utf-8');
    // Should not directly reference document.body, getElementById, or querySelector on document
    expect(source).not.toMatch(/document\.body/);
    expect(source).not.toMatch(/document\.getElementById/);
  });
});
