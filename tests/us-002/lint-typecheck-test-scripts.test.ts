import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');

function readJson(relativePath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(ROOT, relativePath), 'utf-8'));
}

describe('US-002: Lint, typecheck and unit test scripts', () => {
  describe('npm scripts exist', () => {
    const pkg = readJson('package.json') as {
      scripts?: Record<string, string>;
    };

    it('npm run lint script exists', () => {
      expect(pkg.scripts?.lint).toBeDefined();
    });

    it('npm run typecheck script exists', () => {
      expect(pkg.scripts?.typecheck).toBeDefined();
    });

    it('npm run test script exists', () => {
      expect(pkg.scripts?.test).toBeDefined();
    });
  });

  describe('ESLint is configured', () => {
    it('ESLint config file exists', () => {
      const flatConfig = existsSync(resolve(ROOT, 'eslint.config.js'));
      const flatConfigMjs = existsSync(resolve(ROOT, 'eslint.config.mjs'));
      const flatConfigCjs = existsSync(resolve(ROOT, 'eslint.config.cjs'));
      expect(flatConfig || flatConfigMjs || flatConfigCjs).toBe(true);
    });

    it('eslint is installed as a dev dependency', () => {
      const pkg = readJson('package.json') as {
        devDependencies?: Record<string, string>;
      };
      expect(pkg.devDependencies?.eslint).toBeDefined();
    });

    it('typescript-eslint is installed as a dev dependency', () => {
      const pkg = readJson('package.json') as {
        devDependencies?: Record<string, string>;
      };
      const hasTypescriptEslint =
        pkg.devDependencies?.['typescript-eslint'] !== undefined ||
        pkg.devDependencies?.['@typescript-eslint/eslint-plugin'] !== undefined;
      expect(hasTypescriptEslint).toBe(true);
    });
  });

  describe('Vitest is configured', () => {
    it('vitest is installed as a dev dependency', () => {
      const pkg = readJson('package.json') as {
        devDependencies?: Record<string, string>;
      };
      expect(pkg.devDependencies?.vitest).toBeDefined();
    });

    it('vitest config file exists or vitest is configured in vite config', () => {
      const vitestConfig =
        existsSync(resolve(ROOT, 'vitest.config.ts')) ||
        existsSync(resolve(ROOT, 'vitest.config.js')) ||
        existsSync(resolve(ROOT, 'vitest.config.mjs'));

      if (!vitestConfig) {
        // vitest can also be configured within vite.config.ts
        const viteConfig = readFileSync(
          resolve(ROOT, 'vite.config.ts'),
          'utf-8',
        );
        expect(viteConfig).toMatch(/vitest|test:/);
      } else {
        expect(vitestConfig).toBe(true);
      }
    });

    it('test script invokes vitest', () => {
      const pkg = readJson('package.json') as {
        scripts?: Record<string, string>;
      };
      expect(pkg.scripts?.test).toContain('vitest');
    });
  });

  describe('npm run lint passes', () => {
    it('exits with code 0 on existing src/ code', () => {
      expect(() => {
        execSync('npm run lint', { cwd: ROOT, stdio: 'pipe' });
      }).not.toThrow();
    }, 30_000);
  });

  describe('npm run typecheck passes', () => {
    it('exits with code 0', () => {
      expect(() => {
        execSync('npm run typecheck', { cwd: ROOT, stdio: 'pipe' });
      }).not.toThrow();
    }, 30_000);
  });

  describe('npm run test passes', () => {
    it('exits with code 0 and all tests pass', () => {
      expect(() => {
        execSync('npm run test', { cwd: ROOT, stdio: 'pipe' });
      }).not.toThrow();
    }, 60_000);
  });

  describe('a sample unit test exists', () => {
    it('sample test file exists in tests/us-002/', () => {
      const sampleExists =
        existsSync(resolve(ROOT, 'tests/us-002/sample.test.ts')) ||
        existsSync(resolve(ROOT, 'tests/us-002/sample-unit.test.ts'));
      expect(sampleExists).toBe(true);
    });
  });
});
