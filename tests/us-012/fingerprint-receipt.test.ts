// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { SignalSnapshot } from '../../src/signals/snapshot';
import { MISSING } from '../../src/signals/snapshot';
import type { ReceiptRow } from '../../src/ui/receipt';

/**
 * Build a fully-populated SignalSnapshot for testing.
 * Overrides can be passed to replace any nested value.
 */
function makeSnapshot(overrides: {
  timezone?: string;
  languages?: readonly string[];
  platform?: string;
  doNotTrack?: string;
  hardwareConcurrency?: number | string;
  touchSupport?: boolean | string;
} = {}): SignalSnapshot {
  return {
    locale: {
      timezone: overrides.timezone ?? 'America/New_York',
      languages: overrides.languages ?? Object.freeze(['en-US', 'fr-FR']),
      platform: overrides.platform ?? 'MacIntel',
      doNotTrack: overrides.doNotTrack ?? 'Enabled',
    },
    device: {
      screenWidth: 1920,
      screenHeight: 1080,
      devicePixelRatio: 2,
      hardwareConcurrency: overrides.hardwareConcurrency ?? 8,
      touchSupport: overrides.touchSupport ?? false,
      storageSupport: {
        localStorage: true,
        sessionStorage: true,
        indexedDB: true,
      },
    },
    rendering: {
      webglSupported: true,
      renderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)',
      vendor: 'Google Inc. (Apple)',
      webglVersion: 'WebGL 2.0',
    },
    collectedAt: '2026-04-23T12:00:00.000Z',
    version: 1,
  };
}

/**
 * Helper to find a receipt row by label from the formatted output.
 */
function findRow(rows: ReceiptRow[], label: string): ReceiptRow | undefined {
  return rows.find((r) => r.label === label);
}

describe('US-012: Populate receipt with core fingerprint fields', () => {
  describe('formatSnapshotToReceiptRows', () => {
    let formatSnapshotToReceiptRows: (snapshot: SignalSnapshot) => ReceiptRow[];

    beforeEach(async () => {
      const mod = await import('../../src/modules/fingerprint-receipt');
      formatSnapshotToReceiptRows = mod.formatSnapshotToReceiptRows;
    });

    it('returns exactly 6 receipt rows', () => {
      const rows = formatSnapshotToReceiptRows(makeSnapshot());
      expect(rows).toHaveLength(6);
    });

    it('every row has a non-empty label and value', () => {
      const rows = formatSnapshotToReceiptRows(makeSnapshot());
      for (const row of rows) {
        expect(row.label, `label should be non-empty`).toBeTruthy();
        expect(row.value, `value should be non-empty for "${row.label}"`).toBeTruthy();
      }
    });

    // --- Acceptance Criterion: Timezone shown ---
    describe('timezone field', () => {
      it('shows timezone string as-is', () => {
        const rows = formatSnapshotToReceiptRows(makeSnapshot({ timezone: 'Europe/London' }));
        const row = findRow(rows, 'Timezone');
        expect(row).toBeDefined();
        expect(row!.value).toBe('Europe/London');
      });

      it('shows fallback for MISSING.unknown timezone', () => {
        const rows = formatSnapshotToReceiptRows(makeSnapshot({ timezone: MISSING.unknown }));
        const row = findRow(rows, 'Timezone');
        expect(row).toBeDefined();
        expect(row!.value).toBe('Unavailable');
      });
    });

    // --- Acceptance Criterion: Languages shown ---
    describe('languages field', () => {
      it('joins multiple languages with comma separator', () => {
        const rows = formatSnapshotToReceiptRows(
          makeSnapshot({ languages: Object.freeze(['en-US', 'fr-FR', 'de-DE']) }),
        );
        const row = findRow(rows, 'Languages');
        expect(row).toBeDefined();
        expect(row!.value).toBe('en-US, fr-FR, de-DE');
      });

      it('shows single language without comma', () => {
        const rows = formatSnapshotToReceiptRows(
          makeSnapshot({ languages: Object.freeze(['en-US']) }),
        );
        const row = findRow(rows, 'Languages');
        expect(row).toBeDefined();
        expect(row!.value).toBe('en-US');
      });

      it('shows fallback when languages contain only MISSING.unknown', () => {
        const rows = formatSnapshotToReceiptRows(
          makeSnapshot({ languages: Object.freeze([MISSING.unknown]) }),
        );
        const row = findRow(rows, 'Languages');
        expect(row).toBeDefined();
        expect(row!.value).toBe('Unavailable');
      });
    });

    // --- Acceptance Criterion: Platform shown ---
    describe('platform field', () => {
      it('shows platform string as-is', () => {
        const rows = formatSnapshotToReceiptRows(makeSnapshot({ platform: 'Win32' }));
        const row = findRow(rows, 'Platform');
        expect(row).toBeDefined();
        expect(row!.value).toBe('Win32');
      });

      it('shows fallback for MISSING.unknown platform', () => {
        const rows = formatSnapshotToReceiptRows(makeSnapshot({ platform: MISSING.unknown }));
        const row = findRow(rows, 'Platform');
        expect(row).toBeDefined();
        expect(row!.value).toBe('Unavailable');
      });
    });

    // --- Acceptance Criterion: Touch support shown ---
    describe('touch support field', () => {
      it('shows "Supported" when touchSupport is true', () => {
        const rows = formatSnapshotToReceiptRows(makeSnapshot({ touchSupport: true }));
        const row = findRow(rows, 'Touch Support');
        expect(row).toBeDefined();
        expect(row!.value).toBe('Supported');
      });

      it('shows "Not supported" when touchSupport is false', () => {
        const rows = formatSnapshotToReceiptRows(makeSnapshot({ touchSupport: false }));
        const row = findRow(rows, 'Touch Support');
        expect(row).toBeDefined();
        expect(row!.value).toBe('Not supported');
      });

      it('shows fallback for MISSING.unavailable touchSupport', () => {
        const rows = formatSnapshotToReceiptRows(
          makeSnapshot({ touchSupport: MISSING.unavailable }),
        );
        const row = findRow(rows, 'Touch Support');
        expect(row).toBeDefined();
        expect(row!.value).toBe('Unavailable');
      });
    });

    // --- Acceptance Criterion: CPU threads shown when available ---
    describe('CPU threads field', () => {
      it('shows thread count with unit when hardwareConcurrency is a number', () => {
        const rows = formatSnapshotToReceiptRows(makeSnapshot({ hardwareConcurrency: 16 }));
        const row = findRow(rows, 'CPU Threads');
        expect(row).toBeDefined();
        expect(row!.value).toBe('16 threads');
      });

      it('shows singular "thread" for 1 core', () => {
        const rows = formatSnapshotToReceiptRows(makeSnapshot({ hardwareConcurrency: 1 }));
        const row = findRow(rows, 'CPU Threads');
        expect(row).toBeDefined();
        expect(row!.value).toBe('1 thread');
      });

      it('shows fallback when hardwareConcurrency is MISSING.unavailable', () => {
        const rows = formatSnapshotToReceiptRows(
          makeSnapshot({ hardwareConcurrency: MISSING.unavailable }),
        );
        const row = findRow(rows, 'CPU Threads');
        expect(row).toBeDefined();
        expect(row!.value).toBe('Unavailable');
      });
    });

    // --- Acceptance Criterion: Do Not Track shown ---
    describe('Do Not Track field', () => {
      it('shows "Enabled" when doNotTrack is "Enabled"', () => {
        const rows = formatSnapshotToReceiptRows(makeSnapshot({ doNotTrack: 'Enabled' }));
        const row = findRow(rows, 'Do Not Track');
        expect(row).toBeDefined();
        expect(row!.value).toBe('Enabled');
      });

      it('shows "Disabled" when doNotTrack is "Disabled"', () => {
        const rows = formatSnapshotToReceiptRows(makeSnapshot({ doNotTrack: 'Disabled' }));
        const row = findRow(rows, 'Do Not Track');
        expect(row).toBeDefined();
        expect(row!.value).toBe('Disabled');
      });

      it('shows "Not Set" when doNotTrack is "Not Set"', () => {
        const rows = formatSnapshotToReceiptRows(makeSnapshot({ doNotTrack: 'Not Set' }));
        const row = findRow(rows, 'Do Not Track');
        expect(row).toBeDefined();
        expect(row!.value).toBe('Not Set');
      });

      it('shows "Unavailable" when doNotTrack is MISSING.unknown', () => {
        const rows = formatSnapshotToReceiptRows(makeSnapshot({ doNotTrack: MISSING.unknown }));
        const row = findRow(rows, 'Do Not Track');
        expect(row).toBeDefined();
        expect(row!.value).toBe('Unavailable');
      });
    });

    // --- Missing value edge cases ---
    describe('missing value handling', () => {
      it('handles a snapshot where all fields are missing sentinels', () => {
        const rows = formatSnapshotToReceiptRows(
          makeSnapshot({
            timezone: MISSING.unknown,
            languages: Object.freeze([MISSING.unknown]),
            platform: MISSING.unknown,
            doNotTrack: MISSING.unknown,
            hardwareConcurrency: MISSING.unavailable,
            touchSupport: MISSING.unavailable,
          }),
        );

        expect(rows).toHaveLength(6);
        for (const row of rows) {
          expect(
            row.value === 'Unavailable' || row.value === 'Not set',
            `"${row.label}" should show a fallback value, got "${row.value}"`,
          ).toBe(true);
        }
      });
    });
  });

  // --- Export contract ---
  describe('module export contract', () => {
    it('exports formatSnapshotToReceiptRows as a named function', async () => {
      const mod = await import('../../src/modules/fingerprint-receipt');
      expect(typeof mod.formatSnapshotToReceiptRows).toBe('function');
    });
  });

  // --- DOM integration ---
  describe('DOM rendering integration', () => {
    let container: HTMLDivElement;
    let formatSnapshotToReceiptRows: (snapshot: SignalSnapshot) => ReceiptRow[];
    let createReceipt: (title: string, rows: ReceiptRow[]) => HTMLElement;

    beforeEach(async () => {
      container = document.createElement('div');
      document.body.appendChild(container);

      const receiptMod = await import('../../src/modules/fingerprint-receipt');
      formatSnapshotToReceiptRows = receiptMod.formatSnapshotToReceiptRows;

      const uiMod = await import('../../src/ui/receipt');
      createReceipt = uiMod.createReceipt;
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    it('renders all 6 rows into the DOM via createReceipt', () => {
      const rows = formatSnapshotToReceiptRows(makeSnapshot());
      const receipt = createReceipt('Fingerprint Receipt', rows);
      container.appendChild(receipt);

      const renderedRows = container.querySelectorAll('.receipt-row');
      expect(renderedRows.length).toBe(6);
    });

    it('rendered row labels match expected fields', () => {
      const rows = formatSnapshotToReceiptRows(makeSnapshot());
      const receipt = createReceipt('Fingerprint Receipt', rows);
      container.appendChild(receipt);

      const labels = Array.from(container.querySelectorAll('.receipt-row-label')).map(
        (el) => el.textContent,
      );
      expect(labels).toContain('Timezone');
      expect(labels).toContain('Languages');
      expect(labels).toContain('Platform');
      expect(labels).toContain('Touch Support');
      expect(labels).toContain('CPU Threads');
      expect(labels).toContain('Do Not Track');
    });

    it('rendered row values contain human-readable text', () => {
      const rows = formatSnapshotToReceiptRows(makeSnapshot());
      const receipt = createReceipt('Fingerprint Receipt', rows);
      container.appendChild(receipt);

      const values = Array.from(container.querySelectorAll('.receipt-row-value')).map(
        (el) => el.textContent,
      );
      expect(values).toContain('America/New_York');
      expect(values).toContain('en-US, fr-FR');
      expect(values).toContain('MacIntel');
      expect(values).toContain('Not supported');
      expect(values).toContain('8 threads');
      expect(values).toContain('Enabled');
    });

    it('receipt has the correct title', () => {
      const rows = formatSnapshotToReceiptRows(makeSnapshot());
      const receipt = createReceipt('Fingerprint Receipt', rows);
      container.appendChild(receipt);

      const title = container.querySelector('.receipt-title');
      expect(title).not.toBeNull();
      expect(title!.textContent).toBe('Fingerprint Receipt');
    });
  });
});
