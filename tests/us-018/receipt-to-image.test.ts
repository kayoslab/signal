// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import html2canvas from 'html2canvas';

/**
 * US-018: Receipt to image capture
 *
 * Unit tests for captureReceiptAsImage — an async function that uses html2canvas
 * to render a DOM element to a canvas and returns a PNG Blob.
 */

vi.mock('html2canvas', () => ({
  default: vi.fn(),
}));

const mockHtml2canvas = vi.mocked(html2canvas);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function importModule() {
  return import('../../src/ui/receipt-to-image');
}

// ---------------------------------------------------------------------------
// captureReceiptAsImage
// ---------------------------------------------------------------------------
describe('US-018: captureReceiptAsImage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls html2canvas with the provided element', async () => {
    const fakeCanvas = document.createElement('canvas');
    fakeCanvas.toBlob = vi.fn((cb: BlobCallback) => {
      cb(new Blob(['png-data'], { type: 'image/png' }));
    });
    mockHtml2canvas.mockResolvedValue(fakeCanvas);

    const { captureReceiptAsImage } = await importModule();
    const element = document.createElement('div');

    await captureReceiptAsImage(element);

    expect(mockHtml2canvas).toHaveBeenCalledWith(element, expect.any(Object));
  });

  it('returns a Blob with image/png type', async () => {
    const pngBlob = new Blob(['png-data'], { type: 'image/png' });
    const fakeCanvas = document.createElement('canvas');
    fakeCanvas.toBlob = vi.fn((cb: BlobCallback) => {
      cb(pngBlob);
    });
    mockHtml2canvas.mockResolvedValue(fakeCanvas);

    const { captureReceiptAsImage } = await importModule();
    const element = document.createElement('div');

    const result = await captureReceiptAsImage(element);

    expect(result).toBeInstanceOf(Blob);
    expect(result!.type).toBe('image/png');
  });

  it('returns null when canvas.toBlob produces null', async () => {
    const fakeCanvas = document.createElement('canvas');
    fakeCanvas.toBlob = vi.fn((cb: BlobCallback) => {
      cb(null);
    });
    mockHtml2canvas.mockResolvedValue(fakeCanvas);

    const { captureReceiptAsImage } = await importModule();
    const element = document.createElement('div');

    const result = await captureReceiptAsImage(element);

    expect(result).toBeNull();
  });

  it('throws when html2canvas fails', async () => {
    mockHtml2canvas.mockRejectedValue(new Error('rendering failed'));

    const { captureReceiptAsImage } = await importModule();
    const element = document.createElement('div');

    await expect(captureReceiptAsImage(element)).rejects.toThrow('rendering failed');
  });
});

// ---------------------------------------------------------------------------
// Module export contract
// ---------------------------------------------------------------------------
describe('US-018: receipt-to-image module exports', () => {
  it('exports captureReceiptAsImage function', async () => {
    const mod = await importModule();
    expect(typeof mod.captureReceiptAsImage).toBe('function');
  });
});
