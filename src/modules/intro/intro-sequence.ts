import { collectSnapshot } from '../../signals/snapshot';
import { countSignalFields } from './count-signals';
import './intro-sequence.css';

/**
 * Renders the animated intro sequence overlay.
 *
 * Displays a headline, signal count, and privacy statement,
 * then auto-removes the overlay. Completes within 2 seconds.
 * Respects prefers-reduced-motion.
 */
export async function renderIntro(root: HTMLElement): Promise<void> {
  const snapshot = collectSnapshot();
  const signalCount = countSignalFields(snapshot);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const overlay = document.createElement('div');
  overlay.className = 'intro-overlay';
  overlay.setAttribute('data-intro', '');

  const headline = createLine(
    'Your browser is already talking.',
    'intro-line--headline',
  );
  const count = createLine(
    `${signalCount} signals detected`,
    'intro-line--count',
  );
  const privacy = createLine(
    'All analysis runs locally. No data leaves your browser.',
    'intro-line--privacy',
  );

  overlay.appendChild(headline);
  overlay.appendChild(count);
  overlay.appendChild(privacy);
  root.appendChild(overlay);

  if (reducedMotion) {
    headline.classList.add('intro-line--visible');
    count.classList.add('intro-line--visible');
    privacy.classList.add('intro-line--visible');

    await delay(50);
  } else {
    // Staggered reveal: 3 lines at ~400ms intervals, then fade out
    await delay(100);
    headline.classList.add('intro-line--visible');

    await delay(400);
    count.classList.add('intro-line--visible');

    await delay(400);
    privacy.classList.add('intro-line--visible');

    await delay(600);
    overlay.classList.add('intro-overlay--fade-out');

    await delay(300);
  }

  overlay.remove();
}

function createLine(text: string, modifier: string): HTMLElement {
  const el = document.createElement('div');
  el.className = `intro-line ${modifier}`;
  el.textContent = text;
  return el;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
