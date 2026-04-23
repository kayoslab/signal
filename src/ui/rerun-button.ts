const DEFAULT_LABEL = 'Re-run Audit';
const LOADING_LABEL = 'Scanning\u2026';

export function createRerunButton(
  onRerun: () => Promise<void>,
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'btn btn-secondary receipt-rerun-btn';
  btn.textContent = DEFAULT_LABEL;

  let running = false;

  btn.addEventListener('click', async () => {
    if (running) return;
    running = true;

    btn.disabled = true;
    btn.textContent = LOADING_LABEL;
    btn.classList.add('receipt-rerun-btn--loading');

    try {
      await onRerun();
    } catch {
      // Swallow – caller handles errors; button must recover.
    } finally {
      btn.disabled = false;
      btn.textContent = DEFAULT_LABEL;
      btn.classList.remove('receipt-rerun-btn--loading');
      running = false;
    }
  });

  return btn;
}
