import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');

function fileExists(relativePath: string): boolean {
  return existsSync(resolve(ROOT, relativePath));
}

function readJson(relativePath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(ROOT, relativePath), 'utf-8'));
}

describe('US-001: Workspace initialization', () => {
  describe('package.json', () => {
    it('exists at project root', () => {
      expect(fileExists('package.json')).toBe(true);
    });

    it('has required npm scripts', () => {
      const pkg = readJson('package.json') as {
        scripts?: Record<string, string>;
      };
      expect(pkg.scripts).toBeDefined();
      expect(pkg.scripts!.dev).toBeDefined();
      expect(pkg.scripts!.build).toBeDefined();
      expect(pkg.scripts!.preview).toBeDefined();
      expect(pkg.scripts!.typecheck).toBeDefined();
    });

    it('dev script uses vite', () => {
      const pkg = readJson('package.json') as {
        scripts?: Record<string, string>;
      };
      expect(pkg.scripts!.dev).toContain('vite');
    });

    it('build script uses vite build', () => {
      const pkg = readJson('package.json') as {
        scripts?: Record<string, string>;
      };
      expect(pkg.scripts!.build).toContain('vite build');
    });

    it('typecheck script uses tsc --noEmit', () => {
      const pkg = readJson('package.json') as {
        scripts?: Record<string, string>;
      };
      expect(pkg.scripts!.typecheck).toContain('tsc');
      expect(pkg.scripts!.typecheck).toContain('--noEmit');
    });

    it('is marked as private', () => {
      const pkg = readJson('package.json') as { private?: boolean };
      expect(pkg.private).toBe(true);
    });
  });

  describe('TypeScript configuration', () => {
    it('tsconfig.json exists', () => {
      expect(fileExists('tsconfig.json')).toBe(true);
    });

    it('has strict mode enabled', () => {
      const tsconfig = readJson('tsconfig.json') as {
        compilerOptions?: Record<string, unknown>;
      };
      expect(tsconfig.compilerOptions?.strict).toBe(true);
    });

    it('targets ES2020 or later', () => {
      const tsconfig = readJson('tsconfig.json') as {
        compilerOptions?: Record<string, unknown>;
      };
      const target = (tsconfig.compilerOptions?.target as string)?.toLowerCase();
      const validTargets = [
        'es2020',
        'es2021',
        'es2022',
        'es2023',
        'es2024',
        'esnext',
      ];
      expect(validTargets).toContain(target);
    });

    it('uses bundler module resolution', () => {
      const tsconfig = readJson('tsconfig.json') as {
        compilerOptions?: Record<string, unknown>;
      };
      const moduleRes = (
        tsconfig.compilerOptions?.moduleResolution as string
      )?.toLowerCase();
      expect(moduleRes).toBe('bundler');
    });
  });

  describe('Vite configuration', () => {
    it('vite.config.ts exists', () => {
      expect(fileExists('vite.config.ts')).toBe(true);
    });
  });

  describe('entry files', () => {
    it('index.html exists at project root (not in public/)', () => {
      expect(fileExists('index.html')).toBe(true);
    });

    it('index.html references the TypeScript entry point', () => {
      const html = readFileSync(resolve(ROOT, 'index.html'), 'utf-8');
      expect(html).toContain('type="module"');
      expect(html).toMatch(/src=.*main\.ts/);
    });

    it('index.html contains an #app mount point', () => {
      const html = readFileSync(resolve(ROOT, 'index.html'), 'utf-8');
      expect(html).toContain('id="app"');
    });

    it('main.ts entry point exists', () => {
      expect(fileExists('src/app/main.ts')).toBe(true);
    });

    it('global CSS file exists', () => {
      expect(fileExists('src/styles/global.css')).toBe(true);
    });
  });

  describe('directory structure per CLAUDE.md', () => {
    const requiredDirs = [
      'src/app',
      'src/layout',
      'src/signals',
      'src/permissions',
      'src/scoring',
      'src/modules',
      'src/ui',
      'src/styles',
      'tests',
      'public',
    ];

    for (const dir of requiredDirs) {
      it(`${dir}/ directory exists`, () => {
        expect(fileExists(dir)).toBe(true);
      });
    }
  });

  describe('.gitignore', () => {
    it('exists', () => {
      expect(fileExists('.gitignore')).toBe(true);
    });

    it('ignores node_modules', () => {
      const content = readFileSync(resolve(ROOT, '.gitignore'), 'utf-8');
      expect(content).toContain('node_modules');
    });

    it('ignores dist', () => {
      const content = readFileSync(resolve(ROOT, '.gitignore'), 'utf-8');
      expect(content).toContain('dist');
    });
  });

  describe('dependencies', () => {
    it('node_modules directory exists (npm install succeeded)', () => {
      expect(fileExists('node_modules')).toBe(true);
    });

    it('vite is installed as a dev dependency', () => {
      const pkg = readJson('package.json') as {
        devDependencies?: Record<string, string>;
      };
      expect(pkg.devDependencies?.vite).toBeDefined();
    });

    it('typescript is installed as a dev dependency', () => {
      const pkg = readJson('package.json') as {
        devDependencies?: Record<string, string>;
      };
      expect(pkg.devDependencies?.typescript).toBeDefined();
    });
  });
});
