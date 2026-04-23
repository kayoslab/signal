import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = resolve(__dirname, '../..');

describe('US-001: Production build', () => {
  beforeAll(() => {
    execSync('npm run build', { cwd: ROOT, stdio: 'pipe' });
  }, 30_000);

  it('creates dist/ directory', () => {
    expect(existsSync(resolve(ROOT, 'dist'))).toBe(true);
  });

  it('dist/ contains index.html', () => {
    expect(existsSync(resolve(ROOT, 'dist/index.html'))).toBe(true);
  });

  it('dist/ contains bundled JS assets', () => {
    const assetsDir = resolve(ROOT, 'dist/assets');
    if (!existsSync(assetsDir)) {
      // Some Vite configs may output JS alongside index.html
      const distFiles = readdirSync(resolve(ROOT, 'dist'), {
        recursive: true,
      }) as string[];
      const hasJs = distFiles.some((f) => f.toString().endsWith('.js'));
      expect(hasJs).toBe(true);
      return;
    }
    const files = readdirSync(assetsDir);
    const jsFiles = files.filter((f) => f.endsWith('.js'));
    expect(jsFiles.length).toBeGreaterThan(0);
  });

  it('dist/index.html references bundled assets (not raw .ts)', () => {
    const html = readFileSync(resolve(ROOT, 'dist/index.html'), 'utf-8');
    expect(html).not.toContain('.ts"');
    expect(html).not.toContain(".ts'");
  });
});
