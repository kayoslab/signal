import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = resolve(__dirname, '../..');
const DIST = resolve(ROOT, 'dist');

/** Known analytics and tracking script URLs / SDK references. */
const TRACKING_PATTERNS = [
  'google-analytics.com',
  'googletagmanager.com',
  'gtag/js',
  'analytics.js',
  'ga.js',
  'fbevents.js',
  'connect.facebook.net',
  'pixel.facebook.com',
  'cdn.segment.com',
  'cdn.mxpnl.com',
  'mixpanel.com/track',
  'api.amplitude.com',
  'cdn.amplitude.com',
  'static.hotjar.com',
  'script.hotjar.com',
  'app.posthog.com',
  'plausible.io/js',
  'cdn.heapanalytics.com',
  'rs.fullstory.com',
  'cdn.logrocket.io',
];

/** Read all built JS and HTML content from dist/. */
function readBuildOutput(): string {
  if (!existsSync(DIST)) return '';
  const entries = readdirSync(DIST, { recursive: true }) as string[];
  const textFiles = entries.filter((f) => {
    const ext = extname(f.toString());
    return ['.html', '.js', '.mjs', '.css'].includes(ext);
  });

  return textFiles
    .map((f) => {
      try {
        return readFileSync(resolve(DIST, f.toString()), 'utf-8');
      } catch {
        return '';
      }
    })
    .join('\n');
}

describe('US-003: No tracking scripts in build output', () => {
  let buildContent: string;

  beforeAll(() => {
    execSync('npm run build', { cwd: ROOT, stdio: 'pipe' });
    buildContent = readBuildOutput();
  }, 30_000);

  it('build output is non-empty', () => {
    expect(buildContent.length).toBeGreaterThan(0);
  });

  for (const pattern of TRACKING_PATTERNS) {
    it(`does not contain tracking reference: ${pattern}`, () => {
      expect(buildContent).not.toContain(pattern);
    });
  }

  it('does not contain Google Analytics gtag() calls', () => {
    // gtag('config', ...) or gtag('event', ...) patterns
    expect(buildContent).not.toMatch(/gtag\s*\(\s*['"]config['"]/);
    expect(buildContent).not.toMatch(/gtag\s*\(\s*['"]event['"]/);
  });

  it('does not contain Facebook Pixel fbq() calls', () => {
    expect(buildContent).not.toMatch(/fbq\s*\(\s*['"]init['"]/);
    expect(buildContent).not.toMatch(/fbq\s*\(\s*['"]track['"]/);
  });

  it('does not contain data collection beacon patterns', () => {
    // navigator.sendBeacon to external analytics endpoints
    expect(buildContent).not.toMatch(
      /sendBeacon\s*\(\s*['"]https?:\/\/.*(?:analytics|collect|track|pixel)/,
    );
  });

  it('dist/index.html contains no third-party script tags', () => {
    const indexPath = resolve(DIST, 'index.html');
    if (!existsSync(indexPath)) return;
    const html = readFileSync(indexPath, 'utf-8');
    // Extract all script src values
    const scriptSrcs = [...html.matchAll(/< *script[^>]+src=["']([^"']+)["']/gi)]
      .map((m) => m[1]);
    // All script sources should be relative (local assets), not external URLs
    const externalScripts = scriptSrcs.filter(
      (src) => src.startsWith('http://') || src.startsWith('https://'),
    );
    expect(externalScripts).toEqual([]);
  });
});
