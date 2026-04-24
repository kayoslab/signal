import { describe, it, expect } from 'vitest';
import type { SignalSnapshot } from '../../src/signals/snapshot';

/**
 * US-020: Map snapshot to OSINT findings
 *
 * Tests verify the pure mapping function that transforms a SignalSnapshot
 * into OsintCardData[] for rendering as zero-click intelligence cards.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFullSnapshot(): SignalSnapshot {
  return {
    locale: {
      timezone: 'America/New_York',
      languages: Object.freeze(['en-US', 'fr-FR']),
      platform: 'MacIntel',
      doNotTrack: '1',
    },
    device: {
      screenWidth: 1920,
      screenHeight: 1080,
      devicePixelRatio: 2,
      hardwareConcurrency: 8,
      touchSupport: false,
      maxTouchPoints: 0,
      deviceMemory: 8,
      colorDepth: 24,
      storageSupport: {
        localStorage: true,
        sessionStorage: true,
        indexedDB: true,
      },
    },
    rendering: {
      webglSupported: true,
      renderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)',
      vendor: 'Google Inc. (Apple)',
      webglVersion: 'webgl2',
    },
    canvas: { canvasHash: 'abc12345', canvasSupported: true },
    webglParams: {
      maxTextureSize: 16384,
      maxRenderbufferSize: 16384,
      maxViewportDims: '16384x16384',
      maxVertexAttribs: 16,
      maxVertexUniformVectors: 4096,
      maxFragmentUniformVectors: 1024,
      maxVaryingVectors: 30,
      maxCubeMapTextureSize: 16384,
      aliasedLineWidthRange: '1-1',
      aliasedPointSizeRange: '1-255',
      shadingLanguageVersion: 'WebGL GLSL ES 3.00',
      extensionCount: 40,
      extensions: ['EXT_texture_filter_anisotropic'],
    },
    fonts: { detectedFonts: ['Arial', 'Helvetica'], fontCount: 2 },
    speech: { voiceCount: 10, voiceList: ['English (US)'], speechSupported: true },
    mediaFeatures: {
      prefersColorScheme: 'light',
      prefersReducedMotion: false,
      prefersContrast: 'no-preference',
      forcedColors: false,
      colorGamut: 'srgb',
      dynamicRange: 'standard',
      invertedColors: false,
    },
    network: { effectiveType: '4g', downlink: 10, rtt: 50, saveData: false },
    collectedAt: '2026-04-24T12:00:00.000Z',
    version: 2,
  };
}

function makeUnavailableSnapshot(): SignalSnapshot {
  return {
    locale: {
      timezone: 'unavailable',
      languages: Object.freeze(['unavailable']),
      platform: 'unavailable',
      doNotTrack: 'unavailable',
    },
    device: {
      screenWidth: 'unavailable',
      screenHeight: 'unavailable',
      devicePixelRatio: 'unavailable',
      hardwareConcurrency: 'unavailable',
      touchSupport: 'unavailable',
      maxTouchPoints: 'unavailable',
      deviceMemory: 'unavailable',
      colorDepth: 'unavailable',
      storageSupport: {
        localStorage: 'unavailable',
        sessionStorage: 'unavailable',
        indexedDB: 'unavailable',
      },
    },
    rendering: {
      webglSupported: false,
      renderer: 'unavailable',
      vendor: 'unavailable',
      webglVersion: 'unavailable',
    },
    canvas: { canvasHash: 'unavailable', canvasSupported: false },
    webglParams: {
      maxTextureSize: 'unavailable' as unknown as number,
      maxRenderbufferSize: 'unavailable' as unknown as number,
      maxViewportDims: 'unavailable',
      maxVertexAttribs: 'unavailable' as unknown as number,
      maxVertexUniformVectors: 'unavailable' as unknown as number,
      maxFragmentUniformVectors: 'unavailable' as unknown as number,
      maxVaryingVectors: 'unavailable' as unknown as number,
      maxCubeMapTextureSize: 'unavailable' as unknown as number,
      aliasedLineWidthRange: 'unavailable',
      aliasedPointSizeRange: 'unavailable',
      shadingLanguageVersion: 'unavailable',
      extensionCount: 0,
      extensions: [],
    },
    fonts: { detectedFonts: [], fontCount: 0 },
    speech: { voiceCount: 0, voiceList: [], speechSupported: false },
    mediaFeatures: {
      prefersColorScheme: 'unavailable',
      prefersReducedMotion: 'unavailable' as unknown as boolean,
      prefersContrast: 'unavailable',
      forcedColors: 'unavailable' as unknown as boolean,
      colorGamut: 'unavailable',
      dynamicRange: 'unavailable',
      invertedColors: 'unavailable' as unknown as boolean,
    },
    network: { effectiveType: 'unavailable', downlink: 'unavailable' as unknown as number, rtt: 'unavailable' as unknown as number, saveData: 'unavailable' as unknown as boolean },
    collectedAt: '2026-04-24T12:00:00.000Z',
    version: 2,
  };
}

function makeMobileSnapshot(): SignalSnapshot {
  return {
    locale: {
      timezone: 'Asia/Tokyo',
      languages: Object.freeze(['ja']),
      platform: 'iPhone',
      doNotTrack: 'unknown',
    },
    device: {
      screenWidth: 375,
      screenHeight: 812,
      devicePixelRatio: 3,
      hardwareConcurrency: 6,
      touchSupport: true,
      maxTouchPoints: 5,
      deviceMemory: 4,
      colorDepth: 32,
      storageSupport: {
        localStorage: true,
        sessionStorage: true,
        indexedDB: true,
      },
    },
    rendering: {
      webglSupported: true,
      renderer: 'Apple GPU',
      vendor: 'Apple Inc.',
      webglVersion: 'webgl2',
    },
    canvas: { canvasHash: 'mobile123', canvasSupported: true },
    webglParams: {
      maxTextureSize: 16384,
      maxRenderbufferSize: 16384,
      maxViewportDims: '16384x16384',
      maxVertexAttribs: 16,
      maxVertexUniformVectors: 4096,
      maxFragmentUniformVectors: 1024,
      maxVaryingVectors: 30,
      maxCubeMapTextureSize: 16384,
      aliasedLineWidthRange: '1-1',
      aliasedPointSizeRange: '1-255',
      shadingLanguageVersion: 'WebGL GLSL ES 3.00',
      extensionCount: 40,
      extensions: ['EXT_texture_filter_anisotropic'],
    },
    fonts: { detectedFonts: ['Arial'], fontCount: 1 },
    speech: { voiceCount: 5, voiceList: ['Japanese'], speechSupported: true },
    mediaFeatures: {
      prefersColorScheme: 'light',
      prefersReducedMotion: false,
      prefersContrast: 'no-preference',
      forcedColors: false,
      colorGamut: 'p3',
      dynamicRange: 'high',
      invertedColors: false,
    },
    network: { effectiveType: '4g', downlink: 10, rtt: 50, saveData: false },
    collectedAt: '2026-04-24T12:00:00.000Z',
    version: 2,
  };
}

// ---------------------------------------------------------------------------
// AC-1: Cards rendered for timezone, language, browser family, device class
// AC-2: Cards rendered for screen profile, rendering engine, input capability
// ---------------------------------------------------------------------------
describe('US-020: mapSnapshotToFindings — card count and coverage', () => {
  it('returns at least 7 cards from a full snapshot', async () => {
    const { mapSnapshotToFindings } = await import(
      '../../src/modules/zero-click-osint/map-snapshot-to-findings'
    );
    const cards = mapSnapshotToFindings(makeFullSnapshot());
    expect(cards.length).toBeGreaterThanOrEqual(7);
  });

  it('includes a timezone card', async () => {
    const { mapSnapshotToFindings } = await import(
      '../../src/modules/zero-click-osint/map-snapshot-to-findings'
    );
    const cards = mapSnapshotToFindings(makeFullSnapshot());
    const tz = cards.find((c) => c.title.toLowerCase().includes('timezone'));
    expect(tz).toBeDefined();
  });

  it('includes a language card', async () => {
    const { mapSnapshotToFindings } = await import(
      '../../src/modules/zero-click-osint/map-snapshot-to-findings'
    );
    const cards = mapSnapshotToFindings(makeFullSnapshot());
    const lang = cards.find((c) => c.title.toLowerCase().includes('language'));
    expect(lang).toBeDefined();
  });

  it('includes a browser family card', async () => {
    const { mapSnapshotToFindings } = await import(
      '../../src/modules/zero-click-osint/map-snapshot-to-findings'
    );
    const cards = mapSnapshotToFindings(makeFullSnapshot());
    const browser = cards.find((c) => c.title.toLowerCase().includes('browser'));
    expect(browser).toBeDefined();
  });

  it('includes a device class card', async () => {
    const { mapSnapshotToFindings } = await import(
      '../../src/modules/zero-click-osint/map-snapshot-to-findings'
    );
    const cards = mapSnapshotToFindings(makeFullSnapshot());
    const device = cards.find((c) => c.title.toLowerCase().includes('device'));
    expect(device).toBeDefined();
  });

  it('includes a screen profile card', async () => {
    const { mapSnapshotToFindings } = await import(
      '../../src/modules/zero-click-osint/map-snapshot-to-findings'
    );
    const cards = mapSnapshotToFindings(makeFullSnapshot());
    const screen = cards.find((c) => c.title.toLowerCase().includes('screen'));
    expect(screen).toBeDefined();
  });

  it('includes a rendering engine card', async () => {
    const { mapSnapshotToFindings } = await import(
      '../../src/modules/zero-click-osint/map-snapshot-to-findings'
    );
    const cards = mapSnapshotToFindings(makeFullSnapshot());
    const renderer = cards.find(
      (c) => c.title.toLowerCase().includes('render') || c.title.toLowerCase().includes('gpu'),
    );
    expect(renderer).toBeDefined();
  });

  it('includes an input capability card', async () => {
    const { mapSnapshotToFindings } = await import(
      '../../src/modules/zero-click-osint/map-snapshot-to-findings'
    );
    const cards = mapSnapshotToFindings(makeFullSnapshot());
    const input = cards.find((c) => c.title.toLowerCase().includes('input'));
    expect(input).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// AC-4: All cards use confidence labels
// ---------------------------------------------------------------------------
describe('US-020: mapSnapshotToFindings — card shape (OsintCardData)', () => {
  it('every card has all required fields', async () => {
    const { mapSnapshotToFindings } = await import(
      '../../src/modules/zero-click-osint/map-snapshot-to-findings'
    );
    const cards = mapSnapshotToFindings(makeFullSnapshot());
    for (const card of cards) {
      expect(typeof card.title).toBe('string');
      expect(card.title.length).toBeGreaterThan(0);
      expect(typeof card.value).toBe('string');
      expect(card.value.length).toBeGreaterThan(0);
      expect(typeof card.source).toBe('string');
      expect(card.source.length).toBeGreaterThan(0);
      expect(typeof card.confidence).toBe('string');
      expect(typeof card.whyItMatters).toBe('string');
      expect(card.whyItMatters.length).toBeGreaterThan(0);
    }
  });

  it('every card has a valid confidence label (low | medium | high)', async () => {
    const { mapSnapshotToFindings } = await import(
      '../../src/modules/zero-click-osint/map-snapshot-to-findings'
    );
    const cards = mapSnapshotToFindings(makeFullSnapshot());
    const validConfidences = ['low', 'medium', 'high'];
    for (const card of cards) {
      expect(validConfidences).toContain(card.confidence);
    }
  });

  it('returns an array', async () => {
    const { mapSnapshotToFindings } = await import(
      '../../src/modules/zero-click-osint/map-snapshot-to-findings'
    );
    const cards = mapSnapshotToFindings(makeFullSnapshot());
    expect(Array.isArray(cards)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-3: Approximate region clearly labeled as heuristic
// ---------------------------------------------------------------------------
describe('US-020: mapSnapshotToFindings — region heuristic label', () => {
  it('region card value contains [Heuristic] label', async () => {
    const { mapSnapshotToFindings } = await import(
      '../../src/modules/zero-click-osint/map-snapshot-to-findings'
    );
    const cards = mapSnapshotToFindings(makeFullSnapshot());
    const region = cards.find(
      (c) =>
        c.title.toLowerCase().includes('region') ||
        c.title.toLowerCase().includes('location') ||
        c.title.toLowerCase().includes('geographic'),
    );
    expect(region).toBeDefined();
    expect(region!.value).toContain('[Heuristic]');
  });

  it('region card has low confidence', async () => {
    const { mapSnapshotToFindings } = await import(
      '../../src/modules/zero-click-osint/map-snapshot-to-findings'
    );
    const cards = mapSnapshotToFindings(makeFullSnapshot());
    const region = cards.find(
      (c) =>
        c.title.toLowerCase().includes('region') ||
        c.title.toLowerCase().includes('location') ||
        c.title.toLowerCase().includes('geographic'),
    );
    expect(region).toBeDefined();
    expect(region!.confidence).toBe('low');
  });
});

// ---------------------------------------------------------------------------
// Specific value assertions
// ---------------------------------------------------------------------------
describe('US-020: mapSnapshotToFindings — value correctness', () => {
  it('timezone card value contains the raw timezone string', async () => {
    const { mapSnapshotToFindings } = await import(
      '../../src/modules/zero-click-osint/map-snapshot-to-findings'
    );
    const cards = mapSnapshotToFindings(makeFullSnapshot());
    const tz = cards.find((c) => c.title.toLowerCase().includes('timezone'));
    expect(tz!.value).toContain('America/New_York');
  });

  it('language card value contains primary language', async () => {
    const { mapSnapshotToFindings } = await import(
      '../../src/modules/zero-click-osint/map-snapshot-to-findings'
    );
    const cards = mapSnapshotToFindings(makeFullSnapshot());
    const lang = cards.find((c) => c.title.toLowerCase().includes('language'));
    expect(lang!.value).toContain('en-US');
  });

  it('rendering engine card references the GPU renderer', async () => {
    const { mapSnapshotToFindings } = await import(
      '../../src/modules/zero-click-osint/map-snapshot-to-findings'
    );
    const cards = mapSnapshotToFindings(makeFullSnapshot());
    const renderer = cards.find(
      (c) => c.title.toLowerCase().includes('render') || c.title.toLowerCase().includes('gpu'),
    );
    expect(renderer!.value).toContain('Apple M1 Pro');
  });
});

// ---------------------------------------------------------------------------
// Unavailable / sentinel scenarios
// ---------------------------------------------------------------------------
describe('US-020: mapSnapshotToFindings — unavailable signals', () => {
  it('still returns cards when all signals are unavailable', async () => {
    const { mapSnapshotToFindings } = await import(
      '../../src/modules/zero-click-osint/map-snapshot-to-findings'
    );
    const cards = mapSnapshotToFindings(makeUnavailableSnapshot());
    expect(cards.length).toBeGreaterThan(0);
  });

  it('cards from unavailable snapshot still have valid confidence labels', async () => {
    const { mapSnapshotToFindings } = await import(
      '../../src/modules/zero-click-osint/map-snapshot-to-findings'
    );
    const cards = mapSnapshotToFindings(makeUnavailableSnapshot());
    const validConfidences = ['low', 'medium', 'high'];
    for (const card of cards) {
      expect(validConfidences).toContain(card.confidence);
    }
  });
});

// ---------------------------------------------------------------------------
// Mobile snapshot
// ---------------------------------------------------------------------------
describe('US-020: mapSnapshotToFindings — mobile device', () => {
  it('device class card reflects mobile for small touch screen', async () => {
    const { mapSnapshotToFindings } = await import(
      '../../src/modules/zero-click-osint/map-snapshot-to-findings'
    );
    const cards = mapSnapshotToFindings(makeMobileSnapshot());
    const device = cards.find((c) => c.title.toLowerCase().includes('device'));
    expect(device!.value.toLowerCase()).toContain('mobile');
  });

  it('input capability card reflects touch for mobile device', async () => {
    const { mapSnapshotToFindings } = await import(
      '../../src/modules/zero-click-osint/map-snapshot-to-findings'
    );
    const cards = mapSnapshotToFindings(makeMobileSnapshot());
    const input = cards.find((c) => c.title.toLowerCase().includes('input'));
    expect(input!.value.toLowerCase()).toContain('touch');
  });
});

// ---------------------------------------------------------------------------
// Export contract
// ---------------------------------------------------------------------------
describe('US-020: mapSnapshotToFindings — export contract', () => {
  it('exports mapSnapshotToFindings function', async () => {
    const mod = await import(
      '../../src/modules/zero-click-osint/map-snapshot-to-findings'
    );
    expect(typeof mod.mapSnapshotToFindings).toBe('function');
  });
});
