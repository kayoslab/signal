// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * US-018: Fingerprint receipt integration — Share Image button
 *
 * Verifies that renderFingerprintReceipt() includes the Share Image button
 * in the receipt-actions container alongside Copy and Re-run Audit.
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
// Integration: receipt includes Share Image button
// ---------------------------------------------------------------------------
describe('US-018: renderFingerprintReceipt – Share Image integration', () => {
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

  it('receipt contains a .receipt-actions container', async () => {
    const { renderFingerprintReceipt } = await import(
      '../../src/modules/fingerprint/fingerprint-receipt'
    );
    const receipt = renderFingerprintReceipt();
    const actions = receipt.querySelector('.receipt-actions');
    expect(actions).not.toBeNull();
  });

  it('receipt-actions contains 3 buttons (Copy, Share Image, Re-run Audit)', async () => {
    const { renderFingerprintReceipt } = await import(
      '../../src/modules/fingerprint/fingerprint-receipt'
    );
    const receipt = renderFingerprintReceipt();
    const buttons = receipt.querySelectorAll('.receipt-actions button');
    expect(buttons.length).toBe(3);
  });

  it('Share Image button is present in receipt-actions', async () => {
    const { renderFingerprintReceipt } = await import(
      '../../src/modules/fingerprint/fingerprint-receipt'
    );
    const receipt = renderFingerprintReceipt();
    const shareBtn = receipt.querySelector('.receipt-share-btn');
    expect(shareBtn).not.toBeNull();
    expect(shareBtn!.textContent).toBe('Share Image');
  });

  it('buttons are in correct order: Copy, Share Image, Re-run Audit', async () => {
    const { renderFingerprintReceipt } = await import(
      '../../src/modules/fingerprint/fingerprint-receipt'
    );
    const receipt = renderFingerprintReceipt();
    const buttons = receipt.querySelectorAll('.receipt-actions button');
    const labels = Array.from(buttons).map((b) => b.textContent);
    expect(labels).toEqual(['Copy', 'Share Image', 'Re-run Audit']);
  });

  it('receipt still contains 15 receipt rows (no regression)', async () => {
    const { renderFingerprintReceipt } = await import(
      '../../src/modules/fingerprint/fingerprint-receipt'
    );
    const receipt = renderFingerprintReceipt();
    const rows = receipt.querySelectorAll('.receipt-row');
    expect(rows.length).toBe(15);
  });
});
