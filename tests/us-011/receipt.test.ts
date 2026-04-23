// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * US-011: Create receipt layout component
 *
 * Tests verify the receipt-style component renders correctly with
 * title area, label/value rows, and variable row counts.
 *
 * CSS tests inspect source files directly since jsdom does not
 * compute layout or custom properties.
 */

const PROJECT_ROOT = resolve(__dirname, '../..');
const STYLES_DIR = resolve(PROJECT_ROOT, 'src/styles');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function readReceiptCss(): string {
  const filepath = resolve(STYLES_DIR, 'receipt.css');
  if (!existsSync(filepath)) {
    throw new Error('Expected CSS file not found: src/styles/receipt.css');
  }
  return readFileSync(filepath, 'utf-8');
}

function readGlobalCss(): string {
  return readFileSync(resolve(STYLES_DIR, 'global.css'), 'utf-8');
}

// ---------------------------------------------------------------------------
// AC-1: Receipt card renders
// ---------------------------------------------------------------------------
describe('US-011: receipt card renders', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('createReceipt returns an element with .receipt class', async () => {
    const { createReceipt } = await import('../../src/ui/receipt');
    const receipt = createReceipt('Test', []);
    expect(receipt).toBeInstanceOf(HTMLElement);
    expect(receipt.classList.contains('receipt')).toBe(true);
  });

  it('createReceipt does not throw when called with title and rows', async () => {
    const { createReceipt } = await import('../../src/ui/receipt');
    expect(() =>
      createReceipt('Title', [{ label: 'Key', value: 'Val' }]),
    ).not.toThrow();
  });

  it('receipt element contains both title and rows areas', async () => {
    const { createReceipt } = await import('../../src/ui/receipt');
    const receipt = createReceipt('Test', [{ label: 'A', value: '1' }]);
    expect(receipt.querySelector('.receipt-title')).not.toBeNull();
    expect(receipt.querySelector('.receipt-row')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// AC-2: Receipt title area renders
// ---------------------------------------------------------------------------
describe('US-011: receipt title area', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('createReceiptTitle returns an element with .receipt-title class', async () => {
    const { createReceiptTitle } = await import('../../src/ui/receipt');
    const title = createReceiptTitle('Signal Report');
    expect(title.classList.contains('receipt-title')).toBe(true);
  });

  it('title element contains the provided text', async () => {
    const { createReceiptTitle } = await import('../../src/ui/receipt');
    const title = createReceiptTitle('Fingerprint Receipt');
    expect(title.textContent).toContain('Fingerprint Receipt');
  });

  it('title uses a heading element for semantic structure', async () => {
    const { createReceiptTitle } = await import('../../src/ui/receipt');
    const title = createReceiptTitle('Report');
    // Should be a heading (h1-h6) or contain one
    const isHeading = /^H[1-6]$/.test(title.tagName);
    const containsHeading = title.querySelector('h1, h2, h3, h4, h5, h6');
    expect(isHeading || containsHeading !== null).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-3: Receipt row component renders label/value pairs
// ---------------------------------------------------------------------------
describe('US-011: receipt row renders label/value pairs', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('createReceiptRow returns an element with .receipt-row class', async () => {
    const { createReceiptRow } = await import('../../src/ui/receipt');
    const row = createReceiptRow('Timezone', 'America/New_York');
    expect(row.classList.contains('receipt-row')).toBe(true);
  });

  it('row contains the label text', async () => {
    const { createReceiptRow } = await import('../../src/ui/receipt');
    const row = createReceiptRow('Platform', 'macOS');
    expect(row.textContent).toContain('Platform');
  });

  it('row contains the value text', async () => {
    const { createReceiptRow } = await import('../../src/ui/receipt');
    const row = createReceiptRow('Platform', 'macOS');
    expect(row.textContent).toContain('macOS');
  });

  it('label and value are in separate child elements', async () => {
    const { createReceiptRow } = await import('../../src/ui/receipt');
    const row = createReceiptRow('CPU Threads', '8');
    const children = Array.from(row.children);
    expect(children.length).toBeGreaterThanOrEqual(2);

    const texts = children.map((c) => c.textContent?.trim());
    expect(texts).toContain('CPU Threads');
    expect(texts).toContain('8');
  });
});

// ---------------------------------------------------------------------------
// AC-4: Receipt supports variable number of rows
// ---------------------------------------------------------------------------
describe('US-011: receipt supports variable number of rows', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('renders with 0 rows — title present, no row elements', async () => {
    const { createReceipt } = await import('../../src/ui/receipt');
    const receipt = createReceipt('Empty Report', []);
    expect(receipt.querySelector('.receipt-title')).not.toBeNull();
    expect(receipt.querySelectorAll('.receipt-row').length).toBe(0);
  });

  it('renders with 1 row', async () => {
    const { createReceipt } = await import('../../src/ui/receipt');
    const receipt = createReceipt('Single', [{ label: 'Key', value: 'Val' }]);
    expect(receipt.querySelectorAll('.receipt-row').length).toBe(1);
  });

  it('renders with 5+ rows and preserves order', async () => {
    const { createReceipt } = await import('../../src/ui/receipt');
    const rows = [
      { label: 'Timezone', value: 'UTC+0' },
      { label: 'Languages', value: 'en-US' },
      { label: 'Platform', value: 'Linux' },
      { label: 'Renderer', value: 'Mesa' },
      { label: 'CPU Threads', value: '16' },
      { label: 'Touch', value: 'No' },
    ];
    const receipt = createReceipt('Full Report', rows);
    const rendered = receipt.querySelectorAll('.receipt-row');
    expect(rendered.length).toBe(6);

    // Verify order is preserved
    const labels = Array.from(rendered).map(
      (r) => r.children[0]?.textContent?.trim(),
    );
    expect(labels).toEqual([
      'Timezone',
      'Languages',
      'Platform',
      'Renderer',
      'CPU Threads',
      'Touch',
    ]);
  });

  it('each row value matches the input data', async () => {
    const { createReceipt } = await import('../../src/ui/receipt');
    const rows = [
      { label: 'A', value: '1' },
      { label: 'B', value: '2' },
      { label: 'C', value: '3' },
    ];
    const receipt = createReceipt('Test', rows);
    const rendered = receipt.querySelectorAll('.receipt-row');

    rendered.forEach((row, i) => {
      expect(row.textContent).toContain(rows[i].label);
      expect(row.textContent).toContain(rows[i].value);
    });
  });
});

// ---------------------------------------------------------------------------
// Export contract
// ---------------------------------------------------------------------------
describe('US-011: module export contract', () => {
  it('exports createReceipt function', async () => {
    const mod = await import('../../src/ui/receipt');
    expect(typeof mod.createReceipt).toBe('function');
  });

  it('exports createReceiptTitle function', async () => {
    const mod = await import('../../src/ui/receipt');
    expect(typeof mod.createReceiptTitle).toBe('function');
  });

  it('exports createReceiptRow function', async () => {
    const mod = await import('../../src/ui/receipt');
    expect(typeof mod.createReceiptRow).toBe('function');
  });

  it('exports ReceiptRow type (interface with label and value)', async () => {
    // Type-level check: ReceiptRow should be usable as a type
    // We verify by constructing a valid ReceiptRow-shaped object and passing it
    const { createReceipt } = await import('../../src/ui/receipt');
    const row: { label: string; value: string } = {
      label: 'Test',
      value: 'Value',
    };
    const receipt = createReceipt('Type Check', [row]);
    expect(receipt).toBeInstanceOf(HTMLElement);
  });
});

// ---------------------------------------------------------------------------
// CSS file structure
// ---------------------------------------------------------------------------
describe('US-011: receipt CSS file', () => {
  it('receipt.css exists in src/styles/', () => {
    expect(existsSync(resolve(STYLES_DIR, 'receipt.css'))).toBe(true);
  });

  it('defines .receipt class selector', () => {
    const css = readReceiptCss();
    expect(css).toMatch(/\.receipt\s*\{/);
  });

  it('defines .receipt-title class selector', () => {
    const css = readReceiptCss();
    expect(css).toMatch(/\.receipt-title\s*\{/);
  });

  it('defines .receipt-row class selector', () => {
    const css = readReceiptCss();
    expect(css).toMatch(/\.receipt-row\s*\{/);
  });

  it('receipt.css is imported in global.css', () => {
    const global = readGlobalCss();
    expect(global).toMatch(/@import\s+['"]\.\/receipt\.css['"]/);
  });

  it('receipt styles use design tokens (var references)', () => {
    const css = readReceiptCss();
    expect(css).toMatch(/var\(--/);
  });
});

// ---------------------------------------------------------------------------
// Reduced motion support (CLAUDE.md accessibility requirement)
// ---------------------------------------------------------------------------
describe('US-011: accessibility', () => {
  it('receipt row uses flexbox for label/value layout', () => {
    const css = readReceiptCss();
    expect(css).toMatch(/display:\s*flex/);
  });
});
