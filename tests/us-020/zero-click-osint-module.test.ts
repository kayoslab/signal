// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * US-020: Zero Click OSINT module integration test
 *
 * Tests verify the module entry point renders an HTMLElement containing
 * the correct DOM structure with OSINT cards, and maintains separation
 * of concerns (no direct browser API calls in the rendering layer).
 */

const PROJECT_ROOT = resolve(__dirname, '../..');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupBrowserMocks(): void {
  vi.stubGlobal('navigator', {
    languages: ['en-US'],
    language: 'en-US',
    platform: 'MacIntel',
    doNotTrack: '1',
    hardwareConcurrency: 8,
    maxTouchPoints: 0,
  });

  const screenMock = { width: 1920, height: 1080 };
  const windowMock = {
    screen: screenMock,
    devicePixelRatio: 2,
    localStorage: {},
    sessionStorage: {},
    indexedDB: {},
  };
  vi.stubGlobal('screen', screenMock);
  vi.stubGlobal('devicePixelRatio', 2);

  // Ensure window properties exist for device signal collection
  Object.defineProperty(globalThis.window, 'screen', {
    value: screenMock,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis.window, 'devicePixelRatio', {
    value: 2,
    writable: true,
    configurable: true,
  });

  // Stub WebGL canvas context
  const mockCanvas = document.createElement('canvas');
  const originalGetContext = mockCanvas.getContext.bind(mockCanvas);
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'canvas') {
      const canvas = document.createElement('canvas');
      // Restore original createElement temporarily to avoid recursion
      (vi.mocked(document.createElement) as ReturnType<typeof vi.fn>).mockRestore();
      const realCanvas = document.createElement('canvas');
      vi.spyOn(document, 'createElement').mockImplementation((t: string) => {
        if (t === 'canvas') return realCanvas;
        return document.createElement(t);
      });
      (realCanvas as unknown as { getContext: () => null }).getContext = () => null;
      return realCanvas;
    }
    // For non-canvas elements, use original
    const el = document.createElementNS('http://www.w3.org/1999/xhtml', tag);
    return el as HTMLElement;
  });
}

// ---------------------------------------------------------------------------
// AC: Module renders correct structure
// ---------------------------------------------------------------------------
describe('US-020: renderZeroClickOsintModule — DOM structure', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns an HTMLElement', async () => {
    setupBrowserMocks();
    const { renderZeroClickOsintModule } = await import(
      '../../src/modules/zero-click-osint/zero-click-osint-module'
    );
    const el = await renderZeroClickOsintModule();
    expect(el).toBeInstanceOf(HTMLElement);
  });

  it('contains a .osint-card-list container', async () => {
    setupBrowserMocks();
    const { renderZeroClickOsintModule } = await import(
      '../../src/modules/zero-click-osint/zero-click-osint-module'
    );
    const el = await renderZeroClickOsintModule();
    const cardList = el.querySelector('.osint-card-list');
    expect(cardList).not.toBeNull();
  });

  it('renders multiple .osint-card articles', async () => {
    setupBrowserMocks();
    const { renderZeroClickOsintModule } = await import(
      '../../src/modules/zero-click-osint/zero-click-osint-module'
    );
    const el = await renderZeroClickOsintModule();
    const cards = el.querySelectorAll('.osint-card');
    expect(cards.length).toBeGreaterThanOrEqual(7);
  });

  it('each card has a .osint-card-confidence element', async () => {
    setupBrowserMocks();
    const { renderZeroClickOsintModule } = await import(
      '../../src/modules/zero-click-osint/zero-click-osint-module'
    );
    const el = await renderZeroClickOsintModule();
    const cards = el.querySelectorAll('.osint-card');
    for (const card of Array.from(cards)) {
      const badge = card.querySelector('.osint-card-confidence');
      expect(badge).not.toBeNull();
    }
  });

  it('each card has a .osint-card-title element', async () => {
    setupBrowserMocks();
    const { renderZeroClickOsintModule } = await import(
      '../../src/modules/zero-click-osint/zero-click-osint-module'
    );
    const el = await renderZeroClickOsintModule();
    const cards = el.querySelectorAll('.osint-card');
    for (const card of Array.from(cards)) {
      const title = card.querySelector('.osint-card-title');
      expect(title).not.toBeNull();
      expect(title!.textContent!.length).toBeGreaterThan(0);
    }
  });

  it('each card has a .osint-card-why element', async () => {
    setupBrowserMocks();
    const { renderZeroClickOsintModule } = await import(
      '../../src/modules/zero-click-osint/zero-click-osint-module'
    );
    const el = await renderZeroClickOsintModule();
    const cards = el.querySelectorAll('.osint-card');
    for (const card of Array.from(cards)) {
      const why = card.querySelector('.osint-card-why');
      expect(why).not.toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// Separation of concerns
// ---------------------------------------------------------------------------
describe('US-020: zero-click-osint module — separation of concerns', () => {
  it('module entry file does not directly call navigator or window APIs', () => {
    const modulePath = resolve(
      PROJECT_ROOT,
      'src/modules/zero-click-osint/zero-click-osint-module.ts',
    );
    const source = readFileSync(modulePath, 'utf-8');
    // Should not directly access browser APIs — it should delegate to collectSnapshot
    expect(source).not.toMatch(/navigator\./);
    expect(source).not.toMatch(/window\./);
    expect(source).not.toMatch(/document\.createElement/);
  });

  it('map-snapshot-to-findings does not import signal collection code', () => {
    const mapperPath = resolve(
      PROJECT_ROOT,
      'src/modules/zero-click-osint/map-snapshot-to-findings.ts',
    );
    const source = readFileSync(mapperPath, 'utf-8');
    // Should not import from signals directory (it receives snapshot as parameter)
    expect(source).not.toMatch(/from\s+['"].*signals.*collectSnapshot/);
    expect(source).not.toMatch(/from\s+['"].*signals.*collect/);
  });
});

// ---------------------------------------------------------------------------
// Export contract
// ---------------------------------------------------------------------------
describe('US-020: zero-click-osint module — export contract', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('barrel index exports renderZeroClickOsintModule', async () => {
    setupBrowserMocks();
    const mod = await import('../../src/modules/zero-click-osint/index');
    expect(typeof mod.renderZeroClickOsintModule).toBe('function');
  });
});
