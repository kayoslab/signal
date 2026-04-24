import { copyToClipboard } from './clipboard';

const DEFAULT_LABEL = 'Copy';
const SUCCESS_LABEL = 'Copied!';
const UNAVAILABLE_LABEL = 'Copy unavailable';
const REVERT_DELAY_MS = 2000;

export function createCopyButton(
  getText: () => string,
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'btn btn-secondary receipt-copy-btn';
  btn.textContent = DEFAULT_LABEL;
  btn.setAttribute('aria-label', 'Copy receipt to clipboard');

  let running = false;

  btn.addEventListener('click', async () => {
    if (running) return;
    running = true;
    btn.disabled = true;

    const text = getText();
    const success = await copyToClipboard(text);

    if (success) {
      btn.textContent = SUCCESS_LABEL;
      btn.classList.add('receipt-copy-btn--success');
    } else {
      btn.textContent = UNAVAILABLE_LABEL;
      btn.classList.add('receipt-copy-btn--unavailable');
    }

    setTimeout(() => {
      btn.textContent = DEFAULT_LABEL;
      btn.classList.remove('receipt-copy-btn--success');
      btn.classList.remove('receipt-copy-btn--unavailable');
      btn.disabled = false;
      running = false;
    }, REVERT_DELAY_MS);
  });

  return btn;
}
