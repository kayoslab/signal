import { captureReceiptAsImage } from './receipt-to-image';

const DEFAULT_LABEL = 'Share Image';
const LOADING_LABEL = 'Exporting\u2026';
const SUCCESS_LABEL = 'Exported!';
const ERROR_LABEL = 'Export Failed';
const REVERT_DELAY_MS = 2000;

export function createShareImageButton(
  getReceiptElement: () => HTMLElement,
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'btn btn-secondary receipt-share-btn';
  btn.textContent = DEFAULT_LABEL;
  btn.setAttribute('aria-label', 'Export receipt as image');

  let running = false;

  btn.addEventListener('click', async () => {
    if (running) return;
    running = true;
    btn.disabled = true;

    btn.textContent = LOADING_LABEL;
    btn.classList.add('receipt-share-btn--loading');

    try {
      const element = getReceiptElement();
      const blob = await captureReceiptAsImage(element);

      btn.classList.remove('receipt-share-btn--loading');

      if (!blob) {
        btn.textContent = ERROR_LABEL;
        btn.classList.add('receipt-share-btn--error');
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'signal-receipt.png';
        anchor.click();
        URL.revokeObjectURL(url);

        btn.textContent = SUCCESS_LABEL;
        btn.classList.add('receipt-share-btn--success');
      }
    } catch {
      btn.classList.remove('receipt-share-btn--loading');
      btn.textContent = ERROR_LABEL;
      btn.classList.add('receipt-share-btn--error');
    }

    setTimeout(() => {
      btn.textContent = DEFAULT_LABEL;
      btn.classList.remove('receipt-share-btn--success');
      btn.classList.remove('receipt-share-btn--error');
      btn.disabled = false;
      running = false;
    }, REVERT_DELAY_MS);
  });

  return btn;
}
