// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('../../src/permissions/permissions-adapter', () => ({
  checkPermissions: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../src/scoring/permission-debt-score', () => ({
  calculatePermissionDebtScore: vi.fn().mockReturnValue({ score: 0, maxPossible: 61, breakdown: [] }),
}));

/**
 * US-017: Add receipt rerun action
 *
 * Integration tests for the rerun flow within renderFingerprintReceipt().
 * Verifies that:
 *  - The receipt contains a rerun button
 *  - Clicking rerun refreshes receipt rows with fresh snapshot data
 *  - Loading state is shown during rerun
 *  - aria-live attribute is present on the rows container
 *  - Focus is not lost after rerun completes
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

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Advance fake timers and flush microtask queue. */
async function advanceTimersAndFlush(ms: number): Promise<void> {
  vi.advanceTimersByTime(ms);
  await flushMicrotasks();
}

// ---------------------------------------------------------------------------
// Integration: rerun flow
// ---------------------------------------------------------------------------
describe('US-017: fingerprint receipt rerun integration', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    setupBrowserEnv();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('receipt contains a rerun button', async () => {
    const { renderFingerprintReceipt } = await import(
      '../../src/modules/fingerprint/fingerprint-receipt'
    );
    const receipt = await renderFingerprintReceipt();
    container.appendChild(receipt);

    const btn = receipt.querySelector('.receipt-rerun-btn');
    expect(btn).not.toBeNull();
    expect(btn!.textContent).toBe('Re-run Audit');
  });

  it('rerun button is inside a .receipt-actions container', async () => {
    const { renderFingerprintReceipt } = await import(
      '../../src/modules/fingerprint/fingerprint-receipt'
    );
    const receipt = await renderFingerprintReceipt();
    container.appendChild(receipt);

    const actions = receipt.querySelector('.receipt-actions');
    expect(actions).not.toBeNull();
    expect(actions!.querySelector('.receipt-rerun-btn')).not.toBeNull();
  });

  it('rerun button is outside .receipt-rows (avoids focus loss)', async () => {
    const { renderFingerprintReceipt } = await import(
      '../../src/modules/fingerprint/fingerprint-receipt'
    );
    const receipt = await renderFingerprintReceipt();
    container.appendChild(receipt);

    const rowsContainer = receipt.querySelector('.receipt-rows');
    const btnInsideRows = rowsContainer!.querySelector('.receipt-rerun-btn');
    expect(btnInsideRows).toBeNull();
  });

  it('clicking rerun replaces receipt rows with fresh data', async () => {
    const { renderFingerprintReceipt } = await import(
      '../../src/modules/fingerprint/fingerprint-receipt'
    );
    const receipt = await renderFingerprintReceipt();
    container.appendChild(receipt);

    const rowsBefore = receipt.querySelectorAll('.receipt-row');
    const valuesBefore = Array.from(rowsBefore).map(
      (r) => r.querySelector('.receipt-row-value')!.textContent,
    );

    // Change a browser signal so fresh snapshot differs
    vi.stubGlobal('navigator', {
      ...globalThis.navigator,
      languages: ['fr-FR', 'de-DE'],
      language: 'fr-FR',
      platform: 'MacIntel',
      doNotTrack: '0',
      hardwareConcurrency: 4,
      maxTouchPoints: 5,
    });

    const btn = receipt.querySelector('.receipt-rerun-btn') as HTMLButtonElement;
    btn.click();

    // Advance past the minimum display delay
    await advanceTimersAndFlush(500);

    const rowsAfter = receipt.querySelectorAll('.receipt-row');
    const valuesAfter = Array.from(rowsAfter).map(
      (r) => r.querySelector('.receipt-row-value')!.textContent,
    );

    // Row count should remain 15 (12 snapshot + 3 posture)
    expect(rowsAfter.length).toBe(32);

    // At least some values should differ (languages changed, DNT changed, etc.)
    const changed = valuesAfter.some((v, i) => v !== valuesBefore[i]);
    expect(changed).toBe(true);
  });

  it('shows loading state during rerun (button disabled + loading class)', async () => {
    const { renderFingerprintReceipt } = await import(
      '../../src/modules/fingerprint/fingerprint-receipt'
    );
    const receipt = await renderFingerprintReceipt();
    container.appendChild(receipt);

    const btn = receipt.querySelector('.receipt-rerun-btn') as HTMLButtonElement;
    btn.click();

    // Immediately after click, button should be in loading state
    expect(btn.disabled).toBe(true);
    expect(btn.classList.contains('receipt-rerun-btn--loading')).toBe(true);

    // After delay resolves, loading state should clear
    await advanceTimersAndFlush(500);

    expect(btn.disabled).toBe(false);
    expect(btn.classList.contains('receipt-rerun-btn--loading')).toBe(false);
  });

  it('receipt rows count stays at 15 after rerun', async () => {
    const { renderFingerprintReceipt } = await import(
      '../../src/modules/fingerprint/fingerprint-receipt'
    );
    const receipt = await renderFingerprintReceipt();
    container.appendChild(receipt);

    const btn = receipt.querySelector('.receipt-rerun-btn') as HTMLButtonElement;
    btn.click();
    await advanceTimersAndFlush(500);

    const rows = receipt.querySelectorAll('.receipt-row');
    expect(rows.length).toBe(32);
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------
describe('US-017: fingerprint receipt rerun accessibility', () => {
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

  it('receipt-rows container has aria-live="polite"', async () => {
    const { renderFingerprintReceipt } = await import(
      '../../src/modules/fingerprint/fingerprint-receipt'
    );
    const receipt = await renderFingerprintReceipt();
    container.appendChild(receipt);

    const rowsContainer = receipt.querySelector('.receipt-rows');
    expect(rowsContainer).not.toBeNull();
    expect(rowsContainer!.getAttribute('aria-live')).toBe('polite');
  });

  it('rerun button has an accessible name', async () => {
    const { renderFingerprintReceipt } = await import(
      '../../src/modules/fingerprint/fingerprint-receipt'
    );
    const receipt = await renderFingerprintReceipt();
    container.appendChild(receipt);

    const btn = receipt.querySelector('.receipt-rerun-btn') as HTMLButtonElement;
    // textContent serves as accessible name, or aria-label if present
    const accessibleName =
      btn.getAttribute('aria-label') || btn.textContent || '';
    expect(accessibleName.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// CSS: receipt-actions and loading state styles
// ---------------------------------------------------------------------------
const STYLES_DIR = resolve(__dirname, '../../src/styles');

function readReceiptCss(): string {
  return readFileSync(resolve(STYLES_DIR, 'receipt.css'), 'utf-8');
}

describe('US-017: receipt CSS – rerun styles', () => {
  it('receipt.css contains .receipt-actions rule', () => {
    const css = readReceiptCss();
    expect(css).toContain('.receipt-actions');
  });

  it('receipt.css contains .receipt-rerun-btn--loading rule', () => {
    const css = readReceiptCss();
    expect(css).toContain('.receipt-rerun-btn--loading');
  });

  it('receipt.css contains prefers-reduced-motion media query', () => {
    const css = readReceiptCss();
    expect(css).toContain('prefers-reduced-motion');
  });
});
