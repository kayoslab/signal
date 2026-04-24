import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const testsRoot = resolve(__dirname, '..');

describe('US-034: Coverage manifest', () => {
  describe('signal collector tests exist (AC 1)', () => {
    it.each([
      ['us-006/locale-signals.test.ts'],
      ['us-007/device-signals.test.ts'],
      ['us-008/rendering-signals.test.ts'],
      ['us-009/snapshot.test.ts'],
    ])('%s exists', (relativePath) => {
      expect(existsSync(resolve(testsRoot, relativePath))).toBe(true);
    });
  });

  describe('scoring tests exist (AC 2)', () => {
    it.each([
      ['us-014/entropy-score.test.ts'],
      ['us-015/privacy-posture.test.ts'],
      ['us-022/permission-debt-score.test.ts'],
    ])('%s exists', (relativePath) => {
      expect(existsSync(resolve(testsRoot, relativePath))).toBe(true);
    });
  });

  describe('inference tests exist (AC 3)', () => {
    it.each([
      ['us-024/inference-schema.test.ts'],
      ['us-025/inference-rules.test.ts'],
    ])('%s exists', (relativePath) => {
      expect(existsSync(resolve(testsRoot, relativePath))).toBe(true);
    });
  });

  describe('main page smoke test exists (AC 4)', () => {
    it('us-034/main-smoke.test.ts exists', () => {
      expect(existsSync(resolve(testsRoot, 'us-034/main-smoke.test.ts'))).toBe(true);
    });
  });

  describe('receipt render smoke tests exist (AC 5)', () => {
    it.each([
      ['us-011/receipt.test.ts'],
      ['us-012/fingerprint-receipt.test.ts'],
      ['us-013/fingerprint-receipt.test.ts'],
      ['us-013/format-snapshot.test.ts'],
    ])('%s exists', (relativePath) => {
      expect(existsSync(resolve(testsRoot, relativePath))).toBe(true);
    });
  });
});
