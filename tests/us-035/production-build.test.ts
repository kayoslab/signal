import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = resolve(__dirname, '../..');
const DIST = resolve(ROOT, 'dist');
const DIST_ASSETS = resolve(DIST, 'assets');

describe('US-035: Validate production static build', () => {
  beforeAll(() => {
    execSync('npm run build', { cwd: ROOT, stdio: 'pipe' });
  }, 60_000);

  it('npm run build exits successfully and creates dist/', () => {
    expect(existsSync(DIST)).toBe(true);
  });

  it('dist/index.html exists', () => {
    const indexPath = resolve(DIST, 'index.html');
    expect(existsSync(indexPath)).toBe(true);
  });

  it('dist/assets/ contains at least one .js bundle', () => {
    expect(existsSync(DIST_ASSETS)).toBe(true);
    const files = readdirSync(DIST_ASSETS);
    const jsFiles = files.filter((f) => f.endsWith('.js'));
    expect(jsFiles.length).toBeGreaterThanOrEqual(1);
  });

  it('dist/assets/ contains at least one .css bundle', () => {
    expect(existsSync(DIST_ASSETS)).toBe(true);
    const files = readdirSync(DIST_ASSETS);
    const cssFiles = files.filter((f) => f.endsWith('.css'));
    expect(cssFiles.length).toBeGreaterThanOrEqual(1);
  });

  it('built index.html has no raw /src/ TypeScript references', () => {
    const html = readFileSync(resolve(DIST, 'index.html'), 'utf-8');
    expect(html).not.toMatch(/\/src\/.*\.ts/);
  });

  it('built index.html references hashed assets', () => {
    const html = readFileSync(resolve(DIST, 'index.html'), 'utf-8');
    // Vite produces filenames like index-Lb6A2QJw.js (name-hash.ext)
    const hasHashedJs = /\/assets\/\w+-[a-zA-Z0-9_-]+\.js/.test(html);
    const hasHashedCss = /\/assets\/\w+-[a-zA-Z0-9_-]+\.css/.test(html);
    expect(hasHashedJs || hasHashedCss).toBe(true);
  });
});
