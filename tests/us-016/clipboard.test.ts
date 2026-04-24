import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * US-016: Add receipt copy action
 *
 * Unit tests for the clipboard utility — a thin wrapper around
 * navigator.clipboard.writeText() with feature detection.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function importModule() {
  return import('../../src/ui/clipboard');
}

// ---------------------------------------------------------------------------
// Success path
// ---------------------------------------------------------------------------
describe('US-016: copyToClipboard – success path', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('resolves true when writeText succeeds', async () => {
    const { copyToClipboard } = await importModule();
    const result = await copyToClipboard('test text');
    expect(result).toBe(true);
  });

  it('calls writeText with the provided text', async () => {
    const { copyToClipboard } = await importModule();
    await copyToClipboard('hello clipboard');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'hello clipboard',
    );
  });

  it('calls writeText exactly once per invocation', async () => {
    const { copyToClipboard } = await importModule();
    await copyToClipboard('once');
    expect(navigator.clipboard.writeText).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// API absent
// ---------------------------------------------------------------------------
describe('US-016: copyToClipboard – Clipboard API absent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('resolves false when navigator.clipboard is undefined', async () => {
    vi.stubGlobal('navigator', {});
    const { copyToClipboard } = await importModule();
    const result = await copyToClipboard('text');
    expect(result).toBe(false);
  });

  it('resolves false when navigator is undefined', async () => {
    vi.stubGlobal('navigator', undefined);
    const { copyToClipboard } = await importModule();
    const result = await copyToClipboard('text');
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Rejection path
// ---------------------------------------------------------------------------
describe('US-016: copyToClipboard – writeText rejects', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('Permission denied')),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('resolves false when writeText rejects', async () => {
    const { copyToClipboard } = await importModule();
    const result = await copyToClipboard('secret');
    expect(result).toBe(false);
  });

  it('does not throw when writeText rejects', async () => {
    const { copyToClipboard } = await importModule();
    await expect(copyToClipboard('text')).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Module export contract
// ---------------------------------------------------------------------------
describe('US-016: clipboard module exports', () => {
  it('exports copyToClipboard function', async () => {
    const mod = await importModule();
    expect(typeof mod.copyToClipboard).toBe('function');
  });
});
