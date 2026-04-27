// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import type { ReceiptRow } from '../../src/ui/receipt';
import type { EntropyResult } from '../../src/scoring/entropy-score';

/**
 * Integration tests verifying that privacy posture rows appear
 * in the fingerprint receipt DOM after rendering.
 *
 * These tests import `computePrivacyPosture` and the receipt UI
 * to verify the three new rows are correctly wired.
 */

interface PrivacyPostureResult {
  entropyLabel: 'Low' | 'Moderate' | 'High';
  uniquenessEstimate: string;
  privacyPosture: string;
}

let computePrivacyPosture: (entropy: EntropyResult) => PrivacyPostureResult;
let createReceipt: (title: string, rows: ReceiptRow[]) => HTMLElement;

beforeAll(async () => {
  const postureMod = await import('../../src/scoring/privacy-posture');
  computePrivacyPosture = postureMod.computePrivacyPosture;

  const uiMod = await import('../../src/ui/receipt');
  createReceipt = uiMod.createReceipt;
});

/**
 * Build posture rows as they would appear in the receipt.
 * This mirrors the integration: compute posture, then map to ReceiptRows.
 */
function buildPostureRows(score: number): ReceiptRow[] {
  const entropy: EntropyResult = { score, maxPossible: 84, breakdown: [] };
  const posture = computePrivacyPosture(entropy);
  return [
    { label: 'Entropy Level', value: posture.entropyLabel },
    { label: 'Uniqueness Estimate', value: `${posture.uniquenessEstimate} [Heuristic]` },
    { label: 'Privacy Posture', value: posture.privacyPosture },
  ];
}

describe('US-015: fingerprint receipt posture rows (DOM integration)', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  // ── Three new rows appear in DOM ──────────────────────────────────

  describe('posture rows rendered in receipt', () => {
    it('renders Entropy Level row', () => {
      const rows = buildPostureRows(50);
      const receipt = createReceipt('Fingerprint Receipt', rows);
      container.appendChild(receipt);

      const labels = Array.from(container.querySelectorAll('.receipt-row-label'))
        .map((el) => el.textContent);
      expect(labels).toContain('Entropy Level');
    });

    it('renders Uniqueness Estimate row', () => {
      const rows = buildPostureRows(50);
      const receipt = createReceipt('Fingerprint Receipt', rows);
      container.appendChild(receipt);

      const labels = Array.from(container.querySelectorAll('.receipt-row-label'))
        .map((el) => el.textContent);
      expect(labels).toContain('Uniqueness Estimate');
    });

    it('renders Privacy Posture row', () => {
      const rows = buildPostureRows(50);
      const receipt = createReceipt('Fingerprint Receipt', rows);
      container.appendChild(receipt);

      const labels = Array.from(container.querySelectorAll('.receipt-row-label'))
        .map((el) => el.textContent);
      expect(labels).toContain('Privacy Posture');
    });

    it('renders exactly 3 posture rows', () => {
      const rows = buildPostureRows(50);
      const receipt = createReceipt('Fingerprint Receipt', rows);
      container.appendChild(receipt);

      const renderedRows = container.querySelectorAll('.receipt-row');
      expect(renderedRows.length).toBe(3);
    });
  });

  // ── Heuristic label in DOM ────────────────────────────────────────

  describe('heuristic disclaimer in rendered DOM', () => {
    it('Uniqueness Estimate row value contains [Heuristic]', () => {
      const rows = buildPostureRows(80);
      const receipt = createReceipt('Fingerprint Receipt', rows);
      container.appendChild(receipt);

      const rowEls = container.querySelectorAll('.receipt-row');
      let found = false;
      rowEls.forEach((row) => {
        const label = row.querySelector('.receipt-row-label')?.textContent;
        const value = row.querySelector('.receipt-row-value')?.textContent;
        if (label === 'Uniqueness Estimate') {
          expect(value).toContain('[Heuristic]');
          found = true;
        }
      });
      expect(found).toBe(true);
    });

    it('heuristic disclaimer present for Low entropy', () => {
      const rows = buildPostureRows(10);
      const receipt = createReceipt('Fingerprint Receipt', rows);
      container.appendChild(receipt);

      const values = Array.from(container.querySelectorAll('.receipt-row-value'))
        .map((el) => el.textContent);
      const uniquenessValue = values[1]; // Uniqueness Estimate is second row
      expect(uniquenessValue).toContain('[Heuristic]');
    });

    it('heuristic disclaimer present for High entropy', () => {
      const rows = buildPostureRows(90);
      const receipt = createReceipt('Fingerprint Receipt', rows);
      container.appendChild(receipt);

      const values = Array.from(container.querySelectorAll('.receipt-row-value'))
        .map((el) => el.textContent);
      const uniquenessValue = values[1];
      expect(uniquenessValue).toContain('[Heuristic]');
    });
  });

  // ── Entropy label is valid ────────────────────────────────────────

  describe('entropy label validation in DOM', () => {
    it('Entropy Level value is Low for score 20', () => {
      const rows = buildPostureRows(20);
      const receipt = createReceipt('Fingerprint Receipt', rows);
      container.appendChild(receipt);

      const values = Array.from(container.querySelectorAll('.receipt-row-value'))
        .map((el) => el.textContent);
      expect(values[0]).toBe('Low');
    });

    it('Entropy Level value is Moderate for score 35', () => {
      const rows = buildPostureRows(35);
      const receipt = createReceipt('Fingerprint Receipt', rows);
      container.appendChild(receipt);

      const values = Array.from(container.querySelectorAll('.receipt-row-value'))
        .map((el) => el.textContent);
      expect(values[0]).toBe('Moderate');
    });

    it('Entropy Level value is High for score 80', () => {
      const rows = buildPostureRows(80);
      const receipt = createReceipt('Fingerprint Receipt', rows);
      container.appendChild(receipt);

      const values = Array.from(container.querySelectorAll('.receipt-row-value'))
        .map((el) => el.textContent);
      expect(values[0]).toBe('High');
    });

    it('Entropy Level is one of Low/Moderate/High for any score', () => {
      for (const score of [0, 25, 26, 45, 46, 100]) {
        const rows = buildPostureRows(score);
        const receipt = createReceipt('Fingerprint Receipt', rows);
        container.appendChild(receipt);

        const values = Array.from(container.querySelectorAll('.receipt-row-value'))
          .map((el) => el.textContent);
        expect(['Low', 'Moderate', 'High']).toContain(values[0]);

        container.innerHTML = '';
      }
    });
  });

  // ── Privacy posture line present and non-empty ────────────────────

  describe('privacy posture line in DOM', () => {
    it('Privacy Posture value is non-empty for Low entropy', () => {
      const rows = buildPostureRows(10);
      const receipt = createReceipt('Fingerprint Receipt', rows);
      container.appendChild(receipt);

      const values = Array.from(container.querySelectorAll('.receipt-row-value'))
        .map((el) => el.textContent);
      const postureValue = values[2]; // Privacy Posture is third row
      expect(postureValue).toBeTruthy();
      expect(postureValue!.length).toBeGreaterThan(0);
    });

    it('Privacy Posture value is non-empty for Moderate entropy', () => {
      const rows = buildPostureRows(50);
      const receipt = createReceipt('Fingerprint Receipt', rows);
      container.appendChild(receipt);

      const values = Array.from(container.querySelectorAll('.receipt-row-value'))
        .map((el) => el.textContent);
      expect(values[2]).toBeTruthy();
    });

    it('Privacy Posture value is non-empty for High entropy', () => {
      const rows = buildPostureRows(90);
      const receipt = createReceipt('Fingerprint Receipt', rows);
      container.appendChild(receipt);

      const values = Array.from(container.querySelectorAll('.receipt-row-value'))
        .map((el) => el.textContent);
      expect(values[2]).toBeTruthy();
    });
  });
});
