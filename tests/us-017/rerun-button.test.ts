// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';

/**
 * US-017: Add receipt rerun action
 *
 * Unit tests for createRerunButton — a factory that returns a button element
 * which triggers an async callback, shows a loading state, and re-enables
 * itself once the callback resolves or rejects.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function importModule() {
  return import('../../src/ui/rerun-button');
}

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// ---------------------------------------------------------------------------
// DOM output
// ---------------------------------------------------------------------------
describe('US-017: createRerunButton – DOM output', () => {
  it('returns an HTMLButtonElement', async () => {
    const { createRerunButton } = await importModule();
    const btn = createRerunButton(async () => {});
    expect(btn).toBeInstanceOf(HTMLButtonElement);
  });

  it('has the receipt-rerun-btn class', async () => {
    const { createRerunButton } = await importModule();
    const btn = createRerunButton(async () => {});
    expect(btn.classList.contains('receipt-rerun-btn')).toBe(true);
  });

  it('has btn and btn-secondary classes', async () => {
    const { createRerunButton } = await importModule();
    const btn = createRerunButton(async () => {});
    expect(btn.classList.contains('btn')).toBe(true);
    expect(btn.classList.contains('btn-secondary')).toBe(true);
  });

  it('displays "Re-run Audit" text by default', async () => {
    const { createRerunButton } = await importModule();
    const btn = createRerunButton(async () => {});
    expect(btn.textContent).toBe('Re-run Audit');
  });

  it('is not disabled initially', async () => {
    const { createRerunButton } = await importModule();
    const btn = createRerunButton(async () => {});
    expect(btn.disabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Click behaviour
// ---------------------------------------------------------------------------
describe('US-017: createRerunButton – click behaviour', () => {
  it('calls the onRerun callback when clicked', async () => {
    const { createRerunButton } = await importModule();
    const onRerun = vi.fn().mockResolvedValue(undefined);
    const btn = createRerunButton(onRerun);

    btn.click();
    await flushMicrotasks();

    expect(onRerun).toHaveBeenCalledOnce();
  });

  it('disables the button while callback is pending', async () => {
    const { createRerunButton } = await importModule();
    let resolve!: () => void;
    const pending = new Promise<void>((r) => {
      resolve = r;
    });
    const btn = createRerunButton(() => pending);

    btn.click();
    // Button should be disabled while pending
    expect(btn.disabled).toBe(true);

    resolve();
    await flushMicrotasks();

    expect(btn.disabled).toBe(false);
  });

  it('shows loading text while callback is pending', async () => {
    const { createRerunButton } = await importModule();
    let resolve!: () => void;
    const pending = new Promise<void>((r) => {
      resolve = r;
    });
    const btn = createRerunButton(() => pending);

    btn.click();
    // Text should change to a loading label
    expect(btn.textContent).not.toBe('Re-run Audit');
    expect(btn.textContent!.length).toBeGreaterThan(0);

    resolve();
    await flushMicrotasks();
  });

  it('adds loading class while callback is pending', async () => {
    const { createRerunButton } = await importModule();
    let resolve!: () => void;
    const pending = new Promise<void>((r) => {
      resolve = r;
    });
    const btn = createRerunButton(() => pending);

    btn.click();
    expect(btn.classList.contains('receipt-rerun-btn--loading')).toBe(true);

    resolve();
    await flushMicrotasks();

    expect(btn.classList.contains('receipt-rerun-btn--loading')).toBe(false);
  });

  it('restores original text after callback resolves', async () => {
    const { createRerunButton } = await importModule();
    const btn = createRerunButton(async () => {});

    btn.click();
    await flushMicrotasks();

    expect(btn.textContent).toBe('Re-run Audit');
  });

  it('re-enables button after callback rejects (error path)', async () => {
    const { createRerunButton } = await importModule();
    const btn = createRerunButton(async () => {
      throw new Error('collection failed');
    });

    btn.click();
    await flushMicrotasks();

    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toBe('Re-run Audit');
    expect(btn.classList.contains('receipt-rerun-btn--loading')).toBe(false);
  });

  it('prevents multiple concurrent clicks', async () => {
    const { createRerunButton } = await importModule();
    let resolve!: () => void;
    const pending = new Promise<void>((r) => {
      resolve = r;
    });
    const onRerun = vi.fn().mockReturnValue(pending);
    const btn = createRerunButton(onRerun);

    btn.click();
    btn.click(); // second click while pending — should be ignored
    expect(onRerun).toHaveBeenCalledOnce();

    resolve();
    await flushMicrotasks();
  });
});

// ---------------------------------------------------------------------------
// Module export contract
// ---------------------------------------------------------------------------
describe('US-017: rerun-button module exports', () => {
  it('exports createRerunButton function', async () => {
    const mod = await importModule();
    expect(typeof mod.createRerunButton).toBe('function');
  });
});
