// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../src/permissions/permissions-adapter', () => ({
  checkPermissions: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../src/scoring/permission-debt-score', () => ({
  calculatePermissionDebtScore: vi.fn().mockReturnValue({ score: 0, maxPossible: 61, breakdown: [] }),
}));

/**
 * US-013: Populate receipt with advanced fingerprint fields
 *
 * Integration tests for renderFingerprintReceipt() which orchestrates
 * snapshot collection, formatting, and receipt DOM construction.
 */

// ---------------------------------------------------------------------------
// Browser environment setup
// ---------------------------------------------------------------------------
function setupBrowserEnv(): void {
  vi.stubGlobal('navigator', {
    ...globalThis.navigator,
    languages: ['en-US'],
    language: 'en-US',
    platform: 'MacIntel',
    doNotTrack: '1',
    hardwareConcurrency: 8,
    maxTouchPoints: 0,
  });

  // Screen dimensions
  Object.defineProperty(window, 'screen', {
    value: { width: 1920, height: 1080 },
    writable: true,
    configurable: true,
  });

  Object.defineProperty(window, 'devicePixelRatio', {
    value: 2,
    writable: true,
    configurable: true,
  });
}

// ---------------------------------------------------------------------------
// Integration: renderFingerprintReceipt
// ---------------------------------------------------------------------------
describe('US-013: renderFingerprintReceipt integration', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    setupBrowserEnv();
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  it('returns an HTMLElement', async () => {
    const { renderFingerprintReceipt } = await import(
      '../../src/modules/fingerprint/fingerprint-receipt'
    );
    const receipt = await renderFingerprintReceipt();
    expect(receipt).toBeInstanceOf(HTMLElement);
  });

  it('receipt has .receipt class', async () => {
    const { renderFingerprintReceipt } = await import(
      '../../src/modules/fingerprint/fingerprint-receipt'
    );
    const receipt = await renderFingerprintReceipt();
    expect(receipt.classList.contains('receipt')).toBe(true);
  });

  it('receipt contains a title element', async () => {
    const { renderFingerprintReceipt } = await import(
      '../../src/modules/fingerprint/fingerprint-receipt'
    );
    const receipt = await renderFingerprintReceipt();
    const title = receipt.querySelector('.receipt-title');
    expect(title).not.toBeNull();
    expect(title!.textContent).toContain('Fingerprint');
  });

  it('receipt contains .receipt-row children matching expected field count', async () => {
    const { renderFingerprintReceipt } = await import(
      '../../src/modules/fingerprint/fingerprint-receipt'
    );
    const receipt = await renderFingerprintReceipt();
    const rows = receipt.querySelectorAll('.receipt-row');
    // Expected fields: Renderer, Vendor, WebGL Version, Storage,
    // Screen Resolution, Device Pixel Ratio, Touch Support, CPU Threads,
    // Timezone, Languages, Platform, Do Not Track = 12
    // + Entropy Level, Uniqueness Estimate, Privacy Posture = 15
    expect(rows.length).toBe(32);
  });

  it('receipt rows contain label and value elements', async () => {
    const { renderFingerprintReceipt } = await import(
      '../../src/modules/fingerprint/fingerprint-receipt'
    );
    const receipt = await renderFingerprintReceipt();
    const rows = receipt.querySelectorAll('.receipt-row');

    for (const row of rows) {
      const label = row.querySelector('.receipt-row-label');
      const value = row.querySelector('.receipt-row-value');
      expect(label).not.toBeNull();
      expect(value).not.toBeNull();
      expect(label!.textContent!.length).toBeGreaterThan(0);
      expect(value!.textContent!.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Module export contract
// ---------------------------------------------------------------------------
describe('US-013: fingerprint-receipt module exports', () => {
  it('exports renderFingerprintReceipt function', async () => {
    const mod = await import(
      '../../src/modules/fingerprint/fingerprint-receipt'
    );
    expect(typeof mod.renderFingerprintReceipt).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Barrel export
// ---------------------------------------------------------------------------
describe('US-013: fingerprint barrel export', () => {
  it('re-exports renderFingerprintReceipt from index', async () => {
    const mod = await import('../../src/modules/fingerprint/index');
    expect(typeof mod.renderFingerprintReceipt).toBe('function');
  });

  it('re-exports formatSnapshotToRows from index', async () => {
    const mod = await import('../../src/modules/fingerprint/index');
    expect(typeof mod.formatSnapshotToRows).toBe('function');
  });
});
