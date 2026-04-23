import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = resolve(__dirname, '../..');
const DIST = resolve(ROOT, 'dist');

/** File extensions that are valid static assets. */
const STATIC_EXTENSIONS = new Set([
  '.html',
  '.css',
  '.js',
  '.mjs',
  '.json',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.map',
  '.txt',
  '.xml',
  '.webmanifest',
]);

/** Filenames that indicate server-side entry points. */
const SERVER_ENTRY_PATTERNS = [
  'server.js',
  'server.mjs',
  'server.cjs',
  'app.js',
  'handler.js',
  'api.js',
  'index.cjs',
  'lambda.js',
  'functions',
  '.netlify',
  '.vercel/output/functions',
];

/** Walk dist recursively and return all file paths relative to dist. */
function walkDist(): string[] {
  if (!existsSync(DIST)) return [];
  const entries = readdirSync(DIST, { recursive: true }) as string[];
  return entries.map((e) => e.toString());
}

describe('US-003: Static deployment output', () => {
  beforeAll(() => {
    execSync('npm run build', { cwd: ROOT, stdio: 'pipe' });
  }, 30_000);

  it('dist/ directory is created', () => {
    expect(existsSync(DIST)).toBe(true);
  });

  it('dist/ contains only static asset file types', () => {
    const files = walkDist().filter((f) => {
      // directories from recursive listing may not have extensions
      const ext = extname(f);
      return ext !== ''; // only check files with extensions
    });

    const nonStatic = files.filter((f) => !STATIC_EXTENSIONS.has(extname(f)));
    expect(nonStatic).toEqual([]);
  });

  it('dist/ contains no server-side entry points', () => {
    const files = walkDist();
    const serverFiles = files.filter((f) =>
      SERVER_ENTRY_PATTERNS.some(
        (pattern) => f === pattern || f.endsWith(`/${pattern}`),
      ),
    );
    expect(serverFiles).toEqual([]);
  });

  it('dist/ contains no .env files', () => {
    const files = walkDist();
    const envFiles = files.filter(
      (f) =>
        f === '.env' ||
        f.endsWith('/.env') ||
        f.includes('.env.') ||
        f.endsWith('.env.local'),
    );
    expect(envFiles).toEqual([]);
  });

  it('dist/ contains no backend config files', () => {
    const files = walkDist();
    const backendConfigs = [
      'package.json',
      'tsconfig.json',
      'node_modules',
      'Dockerfile',
      'docker-compose.yml',
      'serverless.yml',
      'netlify.toml',
      'vercel.json',
    ];
    const found = files.filter((f) =>
      backendConfigs.some(
        (config) => f === config || f.endsWith(`/${config}`),
      ),
    );
    expect(found).toEqual([]);
  });

  it('vite config outputs to dist/ (static output directory)', () => {
    const viteConfig = readFileSync(
      resolve(ROOT, 'vite.config.ts'),
      'utf-8',
    );
    expect(viteConfig).toContain("outDir: 'dist'");
  });
});
