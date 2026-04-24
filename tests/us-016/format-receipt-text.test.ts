import { describe, it, expect } from 'vitest';
import type { ReceiptRow } from '../../src/ui/receipt';

/**
 * US-016: Add receipt copy action
 *
 * Unit tests for formatReceiptText — a pure function that serialises
 * a receipt title + rows into a clean plain-text block.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function importModule() {
  return import('../../src/modules/fingerprint/format-receipt-text');
}

function makeSampleRows(): ReceiptRow[] {
  return [
    { label: 'Timezone', value: 'America/New_York' },
    { label: 'Languages', value: 'en-US, fr-FR' },
    { label: 'Platform', value: 'MacIntel' },
    { label: 'CPU Threads', value: '8' },
  ];
}

// ---------------------------------------------------------------------------
// Basic output
// ---------------------------------------------------------------------------
describe('US-016: formatReceiptText – basic output', () => {
  it('includes the title in the output', async () => {
    const { formatReceiptText } = await importModule();
    const text = formatReceiptText('Fingerprint Receipt', makeSampleRows());
    expect(text).toContain('Fingerprint Receipt');
  });

  it('includes a separator line after the title', async () => {
    const { formatReceiptText } = await importModule();
    const text = formatReceiptText('Fingerprint Receipt', makeSampleRows());
    const lines = text.split('\n');
    // Title should be the first line, separator shortly after
    const titleIndex = lines.findIndex((l) =>
      l.includes('Fingerprint Receipt'),
    );
    expect(titleIndex).toBeGreaterThanOrEqual(0);
    // There should be a separator-like line (dashes, equals, or similar)
    const hasSeparator = lines.some((l) => /^[-=─]{3,}/.test(l.trim()));
    expect(hasSeparator).toBe(true);
  });

  it('formats each row as "Label: Value"', async () => {
    const { formatReceiptText } = await importModule();
    const text = formatReceiptText('Receipt', makeSampleRows());
    expect(text).toContain('Timezone: America/New_York');
    expect(text).toContain('Languages: en-US, fr-FR');
    expect(text).toContain('Platform: MacIntel');
    expect(text).toContain('CPU Threads: 8');
  });

  it('places each row on its own line', async () => {
    const { formatReceiptText } = await importModule();
    const text = formatReceiptText('Receipt', makeSampleRows());
    const lines = text.split('\n');
    const rowLines = lines.filter((l) => l.includes(': '));
    expect(rowLines.length).toBeGreaterThanOrEqual(4);
  });

  it('returns a string', async () => {
    const { formatReceiptText } = await importModule();
    const text = formatReceiptText('Title', makeSampleRows());
    expect(typeof text).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe('US-016: formatReceiptText – edge cases', () => {
  it('handles empty rows array', async () => {
    const { formatReceiptText } = await importModule();
    const text = formatReceiptText('Empty Receipt', []);
    expect(text).toContain('Empty Receipt');
    expect(typeof text).toBe('string');
  });

  it('handles single row', async () => {
    const { formatReceiptText } = await importModule();
    const text = formatReceiptText('Single', [
      { label: 'Key', value: 'Value' },
    ]);
    expect(text).toContain('Key: Value');
  });

  it('handles rows with long values', async () => {
    const { formatReceiptText } = await importModule();
    const longValue =
      'ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)';
    const text = formatReceiptText('Test', [
      { label: 'Renderer', value: longValue },
    ]);
    expect(text).toContain(longValue);
  });

  it('handles rows with special characters', async () => {
    const { formatReceiptText } = await importModule();
    const text = formatReceiptText('Test', [
      { label: 'Note', value: 'Has <html> & "quotes"' },
    ]);
    expect(text).toContain('Has <html> & "quotes"');
  });

  it('handles rows with empty values', async () => {
    const { formatReceiptText } = await importModule();
    const text = formatReceiptText('Test', [
      { label: 'Empty', value: '' },
    ]);
    expect(text).toContain('Empty');
  });
});

// ---------------------------------------------------------------------------
// Module export contract
// ---------------------------------------------------------------------------
describe('US-016: format-receipt-text module exports', () => {
  it('exports formatReceiptText function', async () => {
    const mod = await importModule();
    expect(typeof mod.formatReceiptText).toBe('function');
  });
});
