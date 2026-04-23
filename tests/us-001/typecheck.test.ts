import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');

describe('US-001: TypeScript type checking', () => {
  it('npm run typecheck passes with zero errors', () => {
    expect(() => {
      execSync('npm run typecheck', { cwd: ROOT, stdio: 'pipe' });
    }).not.toThrow();
  }, 30_000);
});
