import { describe, it, expect } from 'vitest';
import type { SignalSnapshot } from '../../src/signals/snapshot';

/**
 * US-013: Populate receipt with advanced fingerprint fields
 *
 * Unit tests for the pure formatter function that converts a SignalSnapshot
 * into an array of ReceiptRow objects for display.
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
    collectedAt: '2026-04-23T12:00:00.000Z',
    version: 1,
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
    collectedAt: '2026-04-23T12:00:00.000Z',
    version: 1,
  };
}

function makeUnknownSnapshot(): SignalSnapshot {
  return {
    locale: {
      timezone: 'unknown',
      languages: Object.freeze(['unknown']),
      platform: 'unknown',
      doNotTrack: 'unknown',
    },
    device: {
      screenWidth: 'unknown',
      screenHeight: 'unknown',
      devicePixelRatio: 'unknown',
      hardwareConcurrency: 'unknown',
      touchSupport: 'unknown',
      storageSupport: {
        localStorage: 'unknown',
        sessionStorage: 'unknown',
        indexedDB: 'unknown',
      },
    },
    rendering: {
      webglSupported: false,
      renderer: 'unknown',
      vendor: 'unknown',
      webglVersion: 'unknown',
    },
    collectedAt: '2026-04-23T12:00:00.000Z',
    version: 1,
  };
}

const FALLBACK = 'Not available';

// ---------------------------------------------------------------------------
// AC-1: Renderer shown when available
// ---------------------------------------------------------------------------
describe('US-013: renderer shown when available', () => {
  it('includes Renderer row with actual value from snapshot', async () => {
    const { formatSnapshotToRows } = await import(
      '../../src/modules/fingerprint/format-snapshot'
    );
    const rows = formatSnapshotToRows(makeFullSnapshot());
    const renderer = rows.find((r) => r.label === 'Renderer');
    expect(renderer).toBeDefined();
    expect(renderer!.value).toContain('ANGLE');
  });

  it('includes Vendor row with actual value from snapshot', async () => {
    const { formatSnapshotToRows } = await import(
      '../../src/modules/fingerprint/format-snapshot'
    );
    const rows = formatSnapshotToRows(makeFullSnapshot());
    const vendor = rows.find((r) => r.label === 'Vendor');
    expect(vendor).toBeDefined();
    expect(vendor!.value).toContain('Google');
  });

  it('includes WebGL Version row', async () => {
    const { formatSnapshotToRows } = await import(
      '../../src/modules/fingerprint/format-snapshot'
    );
    const rows = formatSnapshotToRows(makeFullSnapshot());
    const webgl = rows.find((r) => r.label === 'WebGL Version');
    expect(webgl).toBeDefined();
    expect(webgl!.value).toBe('webgl2');
  });

  it('shows fallback copy when renderer is unavailable', async () => {
    const { formatSnapshotToRows } = await import(
      '../../src/modules/fingerprint/format-snapshot'
    );
    const rows = formatSnapshotToRows(makeUnavailableSnapshot());
    const renderer = rows.find((r) => r.label === 'Renderer');
    expect(renderer).toBeDefined();
    expect(renderer!.value).toBe(FALLBACK);
  });
});

// ---------------------------------------------------------------------------
// AC-2: Storage capability shown
// ---------------------------------------------------------------------------
describe('US-013: storage capability shown', () => {
  it('includes Storage row when all stores are available', async () => {
    const { formatSnapshotToRows } = await import(
      '../../src/modules/fingerprint/format-snapshot'
    );
    const rows = formatSnapshotToRows(makeFullSnapshot());
    const storage = rows.find((r) => r.label === 'Storage');
    expect(storage).toBeDefined();
    expect(storage!.value).toContain('localStorage');
    expect(storage!.value).toContain('sessionStorage');
    expect(storage!.value).toContain('indexedDB');
  });

  it('shows only available stores when some are unavailable', async () => {
    const { formatSnapshotToRows } = await import(
      '../../src/modules/fingerprint/format-snapshot'
    );
    const snapshot = makeFullSnapshot();
    (snapshot.device.storageSupport as { localStorage: boolean | string }).localStorage = 'unavailable';
    (snapshot.device.storageSupport as { indexedDB: boolean | string }).indexedDB = 'unavailable';

    const rows = formatSnapshotToRows(snapshot);
    const storage = rows.find((r) => r.label === 'Storage');
    expect(storage).toBeDefined();
    expect(storage!.value).toContain('sessionStorage');
    expect(storage!.value).not.toContain('localStorage');
    expect(storage!.value).not.toContain('indexedDB');
  });

  it('shows fallback when no stores are available', async () => {
    const { formatSnapshotToRows } = await import(
      '../../src/modules/fingerprint/format-snapshot'
    );
    const rows = formatSnapshotToRows(makeUnavailableSnapshot());
    const storage = rows.find((r) => r.label === 'Storage');
    expect(storage).toBeDefined();
    expect(storage!.value).toBe(FALLBACK);
  });
});

// ---------------------------------------------------------------------------
// AC-3: Screen profile shown
// ---------------------------------------------------------------------------
describe('US-013: screen profile shown', () => {
  it('shows formatted screen resolution when dimensions are numbers', async () => {
    const { formatSnapshotToRows } = await import(
      '../../src/modules/fingerprint/format-snapshot'
    );
    const rows = formatSnapshotToRows(makeFullSnapshot());
    const screen = rows.find((r) => r.label === 'Screen Resolution');
    expect(screen).toBeDefined();
    expect(screen!.value).toMatch(/1920\s*[×x]\s*1080/);
  });

  it('shows fallback when screen dimensions are unavailable', async () => {
    const { formatSnapshotToRows } = await import(
      '../../src/modules/fingerprint/format-snapshot'
    );
    const rows = formatSnapshotToRows(makeUnavailableSnapshot());
    const screen = rows.find((r) => r.label === 'Screen Resolution');
    expect(screen).toBeDefined();
    expect(screen!.value).toBe(FALLBACK);
  });

  it('shows fallback when only one dimension is unavailable', async () => {
    const { formatSnapshotToRows } = await import(
      '../../src/modules/fingerprint/format-snapshot'
    );
    const snapshot = makeFullSnapshot();
    (snapshot.device as { screenHeight: number | string }).screenHeight = 'unavailable';

    const rows = formatSnapshotToRows(snapshot);
    const screen = rows.find((r) => r.label === 'Screen Resolution');
    expect(screen).toBeDefined();
    expect(screen!.value).toBe(FALLBACK);
  });

  it('includes Device Pixel Ratio row', async () => {
    const { formatSnapshotToRows } = await import(
      '../../src/modules/fingerprint/format-snapshot'
    );
    const rows = formatSnapshotToRows(makeFullSnapshot());
    const dpr = rows.find((r) => r.label === 'Device Pixel Ratio');
    expect(dpr).toBeDefined();
    expect(dpr!.value).toBe('2');
  });
});

// ---------------------------------------------------------------------------
// AC-4: Unavailable values display fallback copy
// ---------------------------------------------------------------------------
describe('US-013: unavailable values display fallback copy', () => {
  it('all rows show fallback when all values are unavailable', async () => {
    const { formatSnapshotToRows } = await import(
      '../../src/modules/fingerprint/format-snapshot'
    );
    const rows = formatSnapshotToRows(makeUnavailableSnapshot());
    for (const row of rows) {
      expect(row.value).toBe(FALLBACK);
    }
  });

  it('all rows show fallback when all values are unknown', async () => {
    const { formatSnapshotToRows } = await import(
      '../../src/modules/fingerprint/format-snapshot'
    );
    const rows = formatSnapshotToRows(makeUnknownSnapshot());
    for (const row of rows) {
      expect(row.value).toBe(FALLBACK);
    }
  });
});

// ---------------------------------------------------------------------------
// Full snapshot — all expected fields present
// ---------------------------------------------------------------------------
describe('US-013: formatSnapshotToRows produces all expected rows', () => {
  it('returns rows for all expected fields', async () => {
    const { formatSnapshotToRows } = await import(
      '../../src/modules/fingerprint/format-snapshot'
    );
    const rows = formatSnapshotToRows(makeFullSnapshot());
    const labels = rows.map((r) => r.label);

    expect(labels).toContain('Renderer');
    expect(labels).toContain('Vendor');
    expect(labels).toContain('WebGL Version');
    expect(labels).toContain('Storage');
    expect(labels).toContain('Screen Resolution');
    expect(labels).toContain('Device Pixel Ratio');
    expect(labels).toContain('Touch Support');
    expect(labels).toContain('CPU Threads');
    expect(labels).toContain('Timezone');
    expect(labels).toContain('Languages');
    expect(labels).toContain('Platform');
    expect(labels).toContain('Do Not Track');
  });

  it('formats languages as comma-separated string', async () => {
    const { formatSnapshotToRows } = await import(
      '../../src/modules/fingerprint/format-snapshot'
    );
    const rows = formatSnapshotToRows(makeFullSnapshot());
    const languages = rows.find((r) => r.label === 'Languages');
    expect(languages).toBeDefined();
    expect(languages!.value).toBe('en-US, fr-FR');
  });

  it('formats touch support as human-readable string', async () => {
    const { formatSnapshotToRows } = await import(
      '../../src/modules/fingerprint/format-snapshot'
    );
    const rows = formatSnapshotToRows(makeFullSnapshot());
    const touch = rows.find((r) => r.label === 'Touch Support');
    expect(touch).toBeDefined();
    // false should display as "No" (or similar human-readable)
    expect(touch!.value).toMatch(/no/i);
  });

  it('formats CPU threads as string number', async () => {
    const { formatSnapshotToRows } = await import(
      '../../src/modules/fingerprint/format-snapshot'
    );
    const rows = formatSnapshotToRows(makeFullSnapshot());
    const cpu = rows.find((r) => r.label === 'CPU Threads');
    expect(cpu).toBeDefined();
    expect(cpu!.value).toBe('8');
  });

  it('returns array of objects with label and value strings', async () => {
    const { formatSnapshotToRows } = await import(
      '../../src/modules/fingerprint/format-snapshot'
    );
    const rows = formatSnapshotToRows(makeFullSnapshot());
    expect(Array.isArray(rows)).toBe(true);
    for (const row of rows) {
      expect(typeof row.label).toBe('string');
      expect(typeof row.value).toBe('string');
    }
  });
});

// ---------------------------------------------------------------------------
// Mixed scenario: some values available, some not
// ---------------------------------------------------------------------------
describe('US-013: mixed availability scenarios', () => {
  it('renderer available but storage partially unavailable', async () => {
    const { formatSnapshotToRows } = await import(
      '../../src/modules/fingerprint/format-snapshot'
    );
    const snapshot = makeFullSnapshot();
    (snapshot.device.storageSupport as { sessionStorage: boolean | string }).sessionStorage = 'unavailable';

    const rows = formatSnapshotToRows(snapshot);

    const renderer = rows.find((r) => r.label === 'Renderer');
    expect(renderer!.value).toContain('ANGLE');

    const storage = rows.find((r) => r.label === 'Storage');
    expect(storage!.value).toContain('localStorage');
    expect(storage!.value).toContain('indexedDB');
    expect(storage!.value).not.toContain('sessionStorage');
  });

  it('screen available but renderer unavailable', async () => {
    const { formatSnapshotToRows } = await import(
      '../../src/modules/fingerprint/format-snapshot'
    );
    const snapshot = makeFullSnapshot();
    (snapshot.rendering as { renderer: string }).renderer = 'unavailable';

    const rows = formatSnapshotToRows(snapshot);

    const renderer = rows.find((r) => r.label === 'Renderer');
    expect(renderer!.value).toBe(FALLBACK);

    const screen = rows.find((r) => r.label === 'Screen Resolution');
    expect(screen!.value).toMatch(/1920\s*[×x]\s*1080/);
  });
});

// ---------------------------------------------------------------------------
// Export contract
// ---------------------------------------------------------------------------
describe('US-013: format-snapshot module exports', () => {
  it('exports formatSnapshotToRows function', async () => {
    const mod = await import('../../src/modules/fingerprint/format-snapshot');
    expect(typeof mod.formatSnapshotToRows).toBe('function');
  });
});
