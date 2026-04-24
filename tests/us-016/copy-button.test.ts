// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * US-016: Add receipt copy action
 *
 * DOM + behaviour tests for createCopyButton — a factory that returns a button
 * element which copies receipt text to the clipboard and shows success/failure
 * feedback with auto-revert.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function importModule() {
  return import('../../src/ui/copy-button');
}

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function stubClipboardSuccess(): void {
  vi.stubGlobal('navigator', {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  });
}

function stubClipboardMissing(): void {
  vi.stubGlobal('navigator', {});
}

function stubClipboardFailure(): void {
  vi.stubGlobal('navigator', {
    clipboard: {
      writeText: vi.fn().mockRejectedValue(new Error('Denied')),
    },
  });
}

// ---------------------------------------------------------------------------
// DOM output
// ---------------------------------------------------------------------------
describe('US-016: createCopyButton – DOM output', () => {
  beforeEach(() => {
    stubClipboardSuccess();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns an HTMLButtonElement', async () => {
    const { createCopyButton } = await importModule();
    const btn = createCopyButton(() => 'text');
    expect(btn).toBeInstanceOf(HTMLButtonElement);
  });

  it('has the receipt-copy-btn class', async () => {
    const { createCopyButton } = await importModule();
    const btn = createCopyButton(() => 'text');
    expect(btn.classList.contains('receipt-copy-btn')).toBe(true);
  });

  it('has btn and btn-secondary classes', async () => {
    const { createCopyButton } = await importModule();
    const btn = createCopyButton(() => 'text');
    expect(btn.classList.contains('btn')).toBe(true);
    expect(btn.classList.contains('btn-secondary')).toBe(true);
  });

  it('displays "Copy" text by default', async () => {
    const { createCopyButton } = await importModule();
    const btn = createCopyButton(() => 'text');
    expect(btn.textContent).toBe('Copy');
  });

  it('is not disabled initially', async () => {
    const { createCopyButton } = await importModule();
    const btn = createCopyButton(() => 'text');
    expect(btn.disabled).toBe(false);
  });

  it('has an aria-label for accessibility', async () => {
    const { createCopyButton } = await importModule();
    const btn = createCopyButton(() => 'text');
    const ariaLabel = btn.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    expect(typeof ariaLabel).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Click behaviour – success path
// ---------------------------------------------------------------------------
describe('US-016: createCopyButton – success feedback', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    stubClipboardSuccess();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('calls getText callback on click', async () => {
    const { createCopyButton } = await importModule();
    const getText = vi.fn().mockReturnValue('receipt text');
    const btn = createCopyButton(getText);

    btn.click();
    await flushMicrotasks();

    expect(getText).toHaveBeenCalledOnce();
  });

  it('passes getText result to clipboard writeText', async () => {
    const { createCopyButton } = await importModule();
    const btn = createCopyButton(() => 'my receipt');

    btn.click();
    await flushMicrotasks();

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('my receipt');
  });

  it('shows "Copied!" feedback on success', async () => {
    const { createCopyButton } = await importModule();
    const btn = createCopyButton(() => 'text');

    btn.click();
    await flushMicrotasks();

    expect(btn.textContent).toBe('Copied!');
  });

  it('adds success class on successful copy', async () => {
    const { createCopyButton } = await importModule();
    const btn = createCopyButton(() => 'text');

    btn.click();
    await flushMicrotasks();

    expect(btn.classList.contains('receipt-copy-btn--success')).toBe(true);
  });

  it('reverts to "Copy" label after ~2 seconds', async () => {
    const { createCopyButton } = await importModule();
    const btn = createCopyButton(() => 'text');

    btn.click();
    await flushMicrotasks();

    expect(btn.textContent).toBe('Copied!');

    vi.advanceTimersByTime(2500);
    await flushMicrotasks();

    expect(btn.textContent).toBe('Copy');
  });

  it('removes success class after revert', async () => {
    const { createCopyButton } = await importModule();
    const btn = createCopyButton(() => 'text');

    btn.click();
    await flushMicrotasks();

    vi.advanceTimersByTime(2500);
    await flushMicrotasks();

    expect(btn.classList.contains('receipt-copy-btn--success')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Click behaviour – clipboard unavailable
// ---------------------------------------------------------------------------
describe('US-016: createCopyButton – clipboard unavailable', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    stubClipboardMissing();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows "Copy unavailable" when Clipboard API is missing', async () => {
    const { createCopyButton } = await importModule();
    const btn = createCopyButton(() => 'text');

    btn.click();
    await flushMicrotasks();

    expect(btn.textContent).toBe('Copy unavailable');
  });

  it('adds unavailable class when clipboard is not supported', async () => {
    const { createCopyButton } = await importModule();
    const btn = createCopyButton(() => 'text');

    btn.click();
    await flushMicrotasks();

    expect(btn.classList.contains('receipt-copy-btn--unavailable')).toBe(true);
  });

  it('reverts from unavailable state after timeout', async () => {
    const { createCopyButton } = await importModule();
    const btn = createCopyButton(() => 'text');

    btn.click();
    await flushMicrotasks();

    vi.advanceTimersByTime(2500);
    await flushMicrotasks();

    expect(btn.textContent).toBe('Copy');
    expect(btn.classList.contains('receipt-copy-btn--unavailable')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Click behaviour – clipboard rejection
// ---------------------------------------------------------------------------
describe('US-016: createCopyButton – clipboard rejection', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    stubClipboardFailure();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows "Copy unavailable" when writeText rejects', async () => {
    const { createCopyButton } = await importModule();
    const btn = createCopyButton(() => 'text');

    btn.click();
    await flushMicrotasks();

    expect(btn.textContent).toBe('Copy unavailable');
  });

  it('recovers after writeText rejection', async () => {
    const { createCopyButton } = await importModule();
    const btn = createCopyButton(() => 'text');

    btn.click();
    await flushMicrotasks();

    vi.advanceTimersByTime(2500);
    await flushMicrotasks();

    expect(btn.textContent).toBe('Copy');
    expect(btn.disabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Double-click guard
// ---------------------------------------------------------------------------
describe('US-016: createCopyButton – double-click prevention', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    stubClipboardSuccess();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('disables button during copy operation', async () => {
    const { createCopyButton } = await importModule();
    let resolveWrite!: () => void;
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise<void>((r) => {
        resolveWrite = r;
      }),
    );
    const btn = createCopyButton(() => 'text');

    btn.click();
    // Button should be disabled while copy is in progress
    expect(btn.disabled).toBe(true);

    resolveWrite();
    await flushMicrotasks();
  });

  it('prevents concurrent copy operations', async () => {
    const { createCopyButton } = await importModule();
    const getText = vi.fn().mockReturnValue('text');
    let resolveWrite!: () => void;
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise<void>((r) => {
        resolveWrite = r;
      }),
    );
    const btn = createCopyButton(getText);

    btn.click();
    btn.click(); // second click while pending — should be ignored

    expect(getText).toHaveBeenCalledOnce();

    resolveWrite();
    await flushMicrotasks();
  });

  it('re-enables button after copy completes', async () => {
    const { createCopyButton } = await importModule();
    const btn = createCopyButton(() => 'text');

    btn.click();
    await flushMicrotasks();

    vi.advanceTimersByTime(2500);
    await flushMicrotasks();

    expect(btn.disabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Module export contract
// ---------------------------------------------------------------------------
describe('US-016: copy-button module exports', () => {
  it('exports createCopyButton function', async () => {
    const mod = await importModule();
    expect(typeof mod.createCopyButton).toBe('function');
  });
});
