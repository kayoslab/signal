/**
 * Architecture Policy — Local-Only Static Application
 *
 * This module defines banned dependency patterns and validation logic
 * to ensure the project remains a privacy-respecting, static-only application
 * with no analytics, tracking, or backend server dependencies.
 */

/** Analytics SDK dependency patterns that must never be installed. */
export const BANNED_ANALYTICS_PATTERNS: readonly string[] = [
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

/** Tracking script dependency patterns that must never be installed. */
export const BANNED_TRACKING_PATTERNS: readonly string[] = [
  'facebook-pixel',
  'google-tag-manager',
  'gtag',
  '@google-analytics',
  'pixel-tracker',
  'ad-tracker',
];

/** Backend server dependency patterns that must never be installed. */
export const BANNED_BACKEND_PATTERNS: readonly string[] = [
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

/** All banned dependency patterns combined. */
export const ALL_BANNED_PATTERNS: readonly string[] = [
  ...BANNED_ANALYTICS_PATTERNS,
  ...BANNED_TRACKING_PATTERNS,
  ...BANNED_BACKEND_PATTERNS,
];

/**
 * Check if a dependency name matches any banned pattern.
 * A match occurs when the dependency name equals or starts with a banned pattern
 * (to catch scoped sub-packages like @segment/analytics-node).
 */
export function isBannedDependency(depName: string): boolean {
  return ALL_BANNED_PATTERNS.some(
    (pattern) => depName === pattern || depName.startsWith(`${pattern}/`),
  );
}

export interface PolicyViolation {
  dependency: string;
  category: 'analytics' | 'tracking' | 'backend';
}

/** Validate a set of dependency names against the architecture policy. */
export function validateDependencies(
  depNames: string[],
): PolicyViolation[] {
  const violations: PolicyViolation[] = [];

  for (const dep of depNames) {
    if (BANNED_ANALYTICS_PATTERNS.some((p) => dep === p || dep.startsWith(`${p}/`))) {
      violations.push({ dependency: dep, category: 'analytics' });
    } else if (BANNED_TRACKING_PATTERNS.some((p) => dep === p || dep.startsWith(`${p}/`))) {
      violations.push({ dependency: dep, category: 'tracking' });
    } else if (BANNED_BACKEND_PATTERNS.some((p) => dep === p || dep.startsWith(`${p}/`))) {
      violations.push({ dependency: dep, category: 'backend' });
    }
  }

  return violations;
}
