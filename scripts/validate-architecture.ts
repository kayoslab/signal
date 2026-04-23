#!/usr/bin/env tsx
/**
 * Architecture Policy Validator
 *
 * Checks that the project adheres to the local-only static architecture policy:
 * - No banned analytics, tracking, or backend dependencies
 * - No production dependencies (static project uses devDependencies only)
 * - Vite outputs to static dist/ directory
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateDependencies } from '../src/policies/architecture-policy.js';

const ROOT = resolve(import.meta.dirname, '..');

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

let hasErrors = false;

function fail(message: string): void {
  console.error(`\u2717 POLICY VIOLATION: ${message}`);
  hasErrors = true;
}

function pass(message: string): void {
  console.log(`\u2713 ${message}`);
}

// 1. Read package.json
const pkg: PackageJson = JSON.parse(
  readFileSync(resolve(ROOT, 'package.json'), 'utf-8'),
);

// 2. Check dependencies against banned patterns
const allDeps = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
];

const violations = validateDependencies(allDeps);

if (violations.length > 0) {
  for (const v of violations) {
    fail(`Banned ${v.category} dependency found: "${v.dependency}"`);
  }
} else {
  pass('No banned dependencies found');
}

// 3. Check no production dependencies exist (static project)
const prodDeps = Object.keys(pkg.dependencies ?? {});
if (prodDeps.length > 0) {
  fail(
    `Production dependencies found: ${prodDeps.join(', ')}. ` +
    'A static-only project should use devDependencies exclusively.',
  );
} else {
  pass('No production dependencies (static project)');
}

// 4. Verify Vite outputs static files
const viteConfig = readFileSync(resolve(ROOT, 'vite.config.ts'), 'utf-8');
if (!viteConfig.includes("outDir: 'dist'") && !viteConfig.includes('outDir: "dist"')) {
  fail('Vite config does not output to dist/ directory');
} else {
  pass('Vite config outputs to dist/ (static hosting ready)');
}

// Exit
if (hasErrors) {
  console.error('\nArchitecture policy check FAILED');
  process.exit(1);
} else {
  console.log('\nArchitecture policy check PASSED');
}
