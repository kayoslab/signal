// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { captureReceiptAsImage } from '../../src/ui/receipt-to-image';

/**
 * US-018: Add receipt image export action
 *
 * DOM + behaviour tests for createShareImageButton — a factory that returns a
 * button element which captures the receipt as a PNG image and triggers a
 * download, showing loading/success/error feedback with auto-revert.
 */

vi.mock('../../src/ui/receipt-to-image', () => ({
  captureReceiptAsImage: vi.fn(),
}));

const mockCapture = vi.mocked(captureReceiptAsImage);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function importModule() {
  return import('../../src/ui/share-image-button');
}

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// ---------------------------------------------------------------------------
// DOM output
// ---------------------------------------------------------------------------
describe('US-018: createShareImageButton – DOM output', () => {
  it('returns an HTMLButtonElement', async () => {
    const { createShareImageButton } = await importModule();
    const btn = createShareImageButton(() => document.createElement('div'));
    expect(btn).toBeInstanceOf(HTMLButtonElement);
  });

  it('has the receipt-share-btn class', async () => {
    const { createShareImageButton } = await importModule();
    const btn = createShareImageButton(() => document.createElement('div'));
    expect(btn.classList.contains('receipt-share-btn')).toBe(true);
  });

  it('has btn and btn-secondary classes', async () => {
    const { createShareImageButton } = await importModule();
    const btn = createShareImageButton(() => document.createElement('div'));
    expect(btn.classList.contains('btn')).toBe(true);
    expect(btn.classList.contains('btn-secondary')).toBe(true);
  });

  it('displays "Share Image" text by default', async () => {
    const { createShareImageButton } = await importModule();
    const btn = createShareImageButton(() => document.createElement('div'));
    expect(btn.textContent).toBe('Share Image');
  });

  it('is not disabled initially', async () => {
    const { createShareImageButton } = await importModule();
    const btn = createShareImageButton(() => document.createElement('div'));
    expect(btn.disabled).toBe(false);
  });

  it('has an aria-label for accessibility', async () => {
    const { createShareImageButton } = await importModule();
    const btn = createShareImageButton(() => document.createElement('div'));
    const ariaLabel = btn.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    expect(typeof ariaLabel).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Click behaviour – success path
// ---------------------------------------------------------------------------
describe('US-018: createShareImageButton – success feedback', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubGlobal('URL', {
      ...globalThis.URL,
      createObjectURL: vi.fn().mockReturnValue('blob:fake-url'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows "Exporting…" during capture', async () => {
    mockCapture.mockReturnValue(new Promise<Blob>(() => {})); // never resolves

    const { createShareImageButton } = await importModule();
    const btn = createShareImageButton(() => document.createElement('div'));

    btn.click();

    expect(btn.textContent).toBe('Exporting…');
    expect(btn.classList.contains('receipt-share-btn--loading')).toBe(true);
  });

  it('shows "Exported!" on success', async () => {
    const fakeBlob = new Blob(['fake'], { type: 'image/png' });
    mockCapture.mockResolvedValue(fakeBlob);

    const { createShareImageButton } = await importModule();
    const btn = createShareImageButton(() => document.createElement('div'));

    btn.click();
    await flushMicrotasks();

    expect(btn.textContent).toBe('Exported!');
    expect(btn.classList.contains('receipt-share-btn--success')).toBe(true);
  });

  it('reverts to "Share Image" label after ~2 seconds', async () => {
    const fakeBlob = new Blob(['fake'], { type: 'image/png' });
    mockCapture.mockResolvedValue(fakeBlob);

    const { createShareImageButton } = await importModule();
    const btn = createShareImageButton(() => document.createElement('div'));

    btn.click();
    await flushMicrotasks();

    expect(btn.textContent).toBe('Exported!');

    vi.advanceTimersByTime(2500);
    await flushMicrotasks();

    expect(btn.textContent).toBe('Share Image');
    expect(btn.classList.contains('receipt-share-btn--success')).toBe(false);
  });

  it('triggers download via temporary anchor element', async () => {
    const fakeBlob = new Blob(['fake'], { type: 'image/png' });
    mockCapture.mockResolvedValue(fakeBlob);

    const { createShareImageButton } = await importModule();
    const btn = createShareImageButton(() => document.createElement('div'));

    const clickSpy = vi.fn();
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        const anchor = document.createElementNS('http://www.w3.org/1999/xhtml', 'a') as HTMLAnchorElement;
        anchor.click = clickSpy;
        return anchor;
      }
      return document.createElementNS('http://www.w3.org/1999/xhtml', tag) as HTMLElement;
    });

    btn.click();
    await flushMicrotasks();

    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('revokes object URL after download', async () => {
    const fakeBlob = new Blob(['fake'], { type: 'image/png' });
    mockCapture.mockResolvedValue(fakeBlob);

    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', {
      ...globalThis.URL,
      createObjectURL: vi.fn().mockReturnValue('blob:fake-url'),
      revokeObjectURL,
    });

    const { createShareImageButton } = await importModule();
    const btn = createShareImageButton(() => document.createElement('div'));

    btn.click();
    await flushMicrotasks();

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
  });
});

// ---------------------------------------------------------------------------
// Click behaviour – failure path
// ---------------------------------------------------------------------------
describe('US-018: createShareImageButton – failure handling', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('shows "Export Failed" when captureReceiptAsImage throws', async () => {
    mockCapture.mockRejectedValue(new Error('canvas error'));

    const { createShareImageButton } = await importModule();
    const btn = createShareImageButton(() => document.createElement('div'));

    btn.click();
    await flushMicrotasks();

    expect(btn.textContent).toBe('Export Failed');
    expect(btn.classList.contains('receipt-share-btn--error')).toBe(true);
  });

  it('shows "Export Failed" when blob is null', async () => {
    mockCapture.mockResolvedValue(null as unknown as Blob);

    const { createShareImageButton } = await importModule();
    const btn = createShareImageButton(() => document.createElement('div'));

    btn.click();
    await flushMicrotasks();

    expect(btn.textContent).toBe('Export Failed');
    expect(btn.classList.contains('receipt-share-btn--error')).toBe(true);
  });

  it('recovers from error state after ~2 seconds', async () => {
    mockCapture.mockRejectedValue(new Error('fail'));

    const { createShareImageButton } = await importModule();
    const btn = createShareImageButton(() => document.createElement('div'));

    btn.click();
    await flushMicrotasks();

    expect(btn.textContent).toBe('Export Failed');

    vi.advanceTimersByTime(2500);
    await flushMicrotasks();

    expect(btn.textContent).toBe('Share Image');
    expect(btn.classList.contains('receipt-share-btn--error')).toBe(false);
    expect(btn.disabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Double-click guard
// ---------------------------------------------------------------------------
describe('US-018: createShareImageButton – double-click prevention', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('disables button during export operation', async () => {
    mockCapture.mockReturnValue(new Promise<Blob>(() => {})); // never resolves

    const { createShareImageButton } = await importModule();
    const btn = createShareImageButton(() => document.createElement('div'));

    btn.click();
    expect(btn.disabled).toBe(true);
  });

  it('prevents concurrent export operations', async () => {
    mockCapture.mockReturnValue(new Promise<Blob>(() => {})); // never resolves

    const { createShareImageButton } = await importModule();
    const getElement = vi.fn().mockReturnValue(document.createElement('div'));
    const btn = createShareImageButton(getElement);

    btn.click();
    btn.click(); // second click while pending — should be ignored

    expect(getElement).toHaveBeenCalledOnce();
  });

  it('re-enables button after successful export', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const fakeBlob = new Blob(['fake'], { type: 'image/png' });
    mockCapture.mockResolvedValue(fakeBlob);

    vi.stubGlobal('URL', {
      ...globalThis.URL,
      createObjectURL: vi.fn().mockReturnValue('blob:fake-url'),
      revokeObjectURL: vi.fn(),
    });

    const { createShareImageButton } = await importModule();
    const btn = createShareImageButton(() => document.createElement('div'));

    btn.click();
    await flushMicrotasks();

    vi.advanceTimersByTime(2500);
    await flushMicrotasks();

    expect(btn.disabled).toBe(false);

    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// Module export contract
// ---------------------------------------------------------------------------
describe('US-018: share-image-button module exports', () => {
  it('exports createShareImageButton function', async () => {
    const mod = await importModule();
    expect(typeof mod.createShareImageButton).toBe('function');
  });
});
