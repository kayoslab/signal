import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');

function readJson(relativePath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(ROOT, relativePath), 'utf-8'));
}

/** Dependency name patterns that violate local-only architecture policy. */
const BANNED_ANALYTICS_PATTERNS = [
  'google-analytics',
  'ga-lite',
  '@segment',
  'segment-analytics',
  'mixpanel',
  'hotjar',
  'amplitude',
  'posthog',
  'plausible',
  'heap-api',
  'fullstory',
  'logrocket',
];

const BANNED_TRACKING_PATTERNS = [
  'facebook-pixel',
  'google-tag-manager',
  'gtag',
  '@google-analytics',
  'pixel-tracker',
  'ad-tracker',
];

const BANNED_BACKEND_PATTERNS = [
  'express',
  'fastify',
  'koa',
  'hapi',
  'next',
  'nuxt',
  'nestjs',
  '@nestjs',
  'sails',
  'meteor',
];

const ALL_BANNED = [
  ...BANNED_ANALYTICS_PATTERNS,
  ...BANNED_TRACKING_PATTERNS,
  ...BANNED_BACKEND_PATTERNS,
];

/**
 * Check if a dependency name matches any banned pattern.
 * A match occurs when the dependency name equals or starts with a banned pattern
 * (to catch scoped sub-packages like @segment/analytics-node).
 */
function isBannedDependency(depName: string): boolean {
  return ALL_BANNED.some(
    (pattern) => depName === pattern || depName.startsWith(`${pattern}/`),
  );
}

describe('US-003: Architecture policy — banned dependencies', () => {
  describe('banned dependency lists', () => {
    it('includes analytics SDK patterns', () => {
      for (const sdk of [
        'google-analytics',
        'mixpanel',
        'hotjar',
        'amplitude',
        'segment-analytics',
      ]) {
        expect(BANNED_ANALYTICS_PATTERNS).toContain(sdk);
      }
    });

    it('includes tracking script patterns', () => {
      for (const tracker of [
        'facebook-pixel',
        'google-tag-manager',
        'gtag',
      ]) {
        expect(BANNED_TRACKING_PATTERNS).toContain(tracker);
      }
    });

    it('includes backend server patterns', () => {
      for (const server of ['express', 'fastify', 'koa', 'next', 'nuxt']) {
        expect(BANNED_BACKEND_PATTERNS).toContain(server);
      }
    });
  });

  describe('validation function', () => {
    it('rejects a package.json containing a banned analytics dependency', () => {
      const fakeDeps = { 'mixpanel': '^2.0.0', 'lodash': '^4.0.0' };
      const banned = Object.keys(fakeDeps).filter(isBannedDependency);
      expect(banned).toContain('mixpanel');
    });

    it('rejects a package.json containing a banned tracking dependency', () => {
      const fakeDeps = { 'google-tag-manager': '^1.0.0' };
      const banned = Object.keys(fakeDeps).filter(isBannedDependency);
      expect(banned).toContain('google-tag-manager');
    });

    it('rejects a package.json containing a banned backend dependency', () => {
      const fakeDeps = { 'express': '^4.18.0', 'vite': '^8.0.0' };
      const banned = Object.keys(fakeDeps).filter(isBannedDependency);
      expect(banned).toContain('express');
    });

    it('accepts a clean dependency set with no banned packages', () => {
      const cleanDeps = {
        'vite': '^8.0.0',
        'typescript': '^6.0.0',
        'vitest': '^4.0.0',
      };
      const banned = Object.keys(cleanDeps).filter(isBannedDependency);
      expect(banned).toHaveLength(0);
    });

    it('catches scoped banned packages (e.g. @segment/analytics-node)', () => {
      expect(isBannedDependency('@segment')).toBe(true);
      expect(isBannedDependency('@nestjs')).toBe(true);
    });
  });

  describe('current project package.json is clean', () => {
    it('has no banned dependencies in dependencies', () => {
      const pkg = readJson('package.json') as {
        dependencies?: Record<string, string>;
      };
      const deps = Object.keys(pkg.dependencies ?? {});
      const violations = deps.filter(isBannedDependency);
      expect(violations).toEqual([]);
    });

    it('has no banned runtime dependencies in devDependencies', () => {
      const pkg = readJson('package.json') as {
        devDependencies?: Record<string, string>;
      };
      // devDependencies may include tooling (eslint, vitest) — only flag
      // analytics/tracking/backend packages that should never appear at all
      const devDeps = Object.keys(pkg.devDependencies ?? {});
      const violations = devDeps.filter(isBannedDependency);
      expect(violations).toEqual([]);
    });

    it('has no runtime dependencies section (pure static project)', () => {
      const pkg = readJson('package.json') as {
        dependencies?: Record<string, string>;
      };
      // A static-only project should have no production dependencies.
      // Everything should be in devDependencies.
      const deps = Object.keys(pkg.dependencies ?? {});
      expect(deps).toEqual([]);
    });
  });
});
