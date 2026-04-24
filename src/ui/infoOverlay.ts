import './infoOverlay.css';

let overlay: HTMLDivElement | null = null;

function showOverlay(): void {
  if (overlay) overlay.style.display = 'flex';
}

function hideOverlay(): void {
  if (overlay) overlay.style.display = 'none';
}

export function createInfoButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'signal-info-btn';
  btn.setAttribute('aria-label', 'About this project');
  btn.textContent = '\u24D8';
  btn.addEventListener('click', showOverlay);
  return btn;
}

export function createInfoOverlay(): HTMLDivElement {
  overlay = document.createElement('div');
  overlay.className = 'signal-info-overlay';
  overlay.style.display = 'none';

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) hideOverlay();
  });

  const panel = document.createElement('div');
  panel.className = 'signal-info-panel';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'signal-info-close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.textContent = '\u2715';
  closeBtn.addEventListener('click', hideOverlay);

  const p1 = document.createElement('p');
  p1.textContent =
    'Signal Intelligence is a browser-based self-audit that reveals what your device and browser expose before you log into any website.';

  const p2 = document.createElement('p');
  p2.textContent =
    'All analysis runs locally in your browser. No data is stored, no cookies are set, and nothing leaves your device.';

  const p3 = document.createElement('p');
  p3.textContent =
    'Signal Intelligence is entirely created by karl. karl is an autonomous coding agent built on top of Claude.';

  const karlLink = document.createElement('a');
  karlLink.href = 'https://github.com/kayoslab/karl';
  karlLink.textContent = 'Github - karl';
  karlLink.target = '_blank';
  karlLink.rel = 'noopener noreferrer';

  const signalLink = document.createElement('a');
  signalLink.href = 'https://github.com/kayoslab/signal';
  signalLink.textContent = 'Github - Signal Intelligence';
  signalLink.target = '_blank';
  signalLink.rel = 'noopener noreferrer';

  p3.appendChild(document.createElement('br'));
  p3.appendChild(karlLink);
  p3.appendChild(document.createElement('br'));
  p3.appendChild(signalLink);

  panel.appendChild(closeBtn);
  panel.appendChild(p1);
  panel.appendChild(p2);
  panel.appendChild(p3);
  overlay.appendChild(panel);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideOverlay();
  });

  return overlay;
}
