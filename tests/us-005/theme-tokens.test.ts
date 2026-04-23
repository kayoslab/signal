import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * US-005: Create theme tokens and base styles
 *
 * Tests verify that reusable design tokens and shared component styles
 * are defined so all modules share a consistent visual identity.
 *
 * Since jsdom does not compute CSS layout or custom properties reliably,
 * tests inspect CSS source files directly for token definitions and
 * style rules.
 */

const PROJECT_ROOT = resolve(__dirname, '../..');
const STYLES_DIR = resolve(PROJECT_ROOT, 'src/styles');

function readTokensCss(): string {
  return readFileSync(resolve(STYLES_DIR, 'tokens.css'), 'utf-8');
}

function readGlobalCss(): string {
  return readFileSync(resolve(STYLES_DIR, 'global.css'), 'utf-8');
}

function loadCssFile(name: string): string {
  const filepath = resolve(STYLES_DIR, name);
  if (!existsSync(filepath)) {
    throw new Error(`Expected CSS file not found: src/styles/${name}`);
  }
  return readFileSync(filepath, 'utf-8');
}

function extractCustomProperties(css: string): string[] {
  const matches = css.match(/--[\w-]+(?=\s*:)/g);
  return matches ?? [];
}

// ---------------------------------------------------------------------------
// AC-1: Color palette defined
// ---------------------------------------------------------------------------
describe('US-005: color palette tokens', () => {
  it('defines core background colors', () => {
    const tokens = readTokensCss();
    expect(tokens).toMatch(/--color-bg\s*:/);
    expect(tokens).toMatch(/--color-bg-dark\s*:/);
    expect(tokens).toMatch(/--color-surface\s*:/);
  });

  it('defines text colors', () => {
    const tokens = readTokensCss();
    expect(tokens).toMatch(/--color-text\s*:/);
    expect(tokens).toMatch(/--color-text-muted\s*:/);
  });

  it('defines accent colors (muted green palette)', () => {
    const tokens = readTokensCss();
    expect(tokens).toMatch(/--color-accent\s*:/);
    expect(tokens).toMatch(/--color-accent-muted\s*:/);
  });

  it('defines border color token', () => {
    const tokens = readTokensCss();
    expect(tokens).toMatch(/--color-border\s*:/);
  });

  it('defines semantic severity colors for badges (success, warning, danger)', () => {
    const tokens = readTokensCss();
    expect(tokens).toMatch(/--color-success\s*:/);
    expect(tokens).toMatch(/--color-warning\s*:/);
    expect(tokens).toMatch(/--color-danger\s*:/);
  });

  it('defines shadow tokens for elevation', () => {
    const tokens = readTokensCss();
    expect(tokens).toMatch(/--shadow-sm\s*:/);
    expect(tokens).toMatch(/--shadow-md\s*:/);
  });

  it('defines border-radius tokens', () => {
    const tokens = readTokensCss();
    expect(tokens).toMatch(/--radius-sm\s*:/);
    expect(tokens).toMatch(/--radius-md\s*:/);
    expect(tokens).toMatch(/--radius-lg\s*:/);
  });

  it('defines transition tokens', () => {
    const tokens = readTokensCss();
    expect(tokens).toMatch(/--transition-fast\s*:/);
    expect(tokens).toMatch(/--transition-base\s*:/);
  });

  it('preserves all existing US-004 color tokens', () => {
    const tokens = readTokensCss();
    const requiredTokens = [
      '--color-bg',
      '--color-bg-dark',
      '--color-surface',
      '--color-text',
      '--color-text-muted',
      '--color-accent',
      '--color-accent-muted',
      '--color-border',
    ];
    for (const token of requiredTokens) {
      expect(tokens).toMatch(new RegExp(`${token}\\s*:`));
    }
  });
});

// ---------------------------------------------------------------------------
// AC-2: Typography scale defined
// ---------------------------------------------------------------------------
describe('US-005: typography scale tokens', () => {
  it('defines font family tokens', () => {
    const tokens = readTokensCss();
    expect(tokens).toMatch(/--font-family\s*:/);
    expect(tokens).toMatch(/--font-mono\s*:/);
  });

  it('defines complete font-size scale (xs through 2xl)', () => {
    const tokens = readTokensCss();
    expect(tokens).toMatch(/--font-size-xs\s*:/);
    expect(tokens).toMatch(/--font-size-sm\s*:/);
    expect(tokens).toMatch(/--font-size-base\s*:/);
    expect(tokens).toMatch(/--font-size-lg\s*:/);
    expect(tokens).toMatch(/--font-size-xl\s*:/);
    expect(tokens).toMatch(/--font-size-2xl\s*:/);
  });

  it('defines font-weight tokens (normal, medium, bold)', () => {
    const tokens = readTokensCss();
    expect(tokens).toMatch(/--font-weight-normal\s*:/);
    expect(tokens).toMatch(/--font-weight-medium\s*:/);
    expect(tokens).toMatch(/--font-weight-bold\s*:/);
  });

  it('defines line-height tokens (tight, base, relaxed)', () => {
    const tokens = readTokensCss();
    expect(tokens).toMatch(/--line-height-tight\s*:/);
    expect(tokens).toMatch(/--line-height-base\s*:/);
    expect(tokens).toMatch(/--line-height-relaxed\s*:/);
  });

  it('defines letter-spacing tokens', () => {
    const tokens = readTokensCss();
    expect(tokens).toMatch(/--letter-spacing-tight\s*:/);
    expect(tokens).toMatch(/--letter-spacing-wide\s*:/);
  });

  it('preserves existing US-004 font-size tokens', () => {
    const tokens = readTokensCss();
    const existing = [
      '--font-size-sm',
      '--font-size-base',
      '--font-size-lg',
      '--font-size-xl',
    ];
    for (const token of existing) {
      expect(tokens).toMatch(new RegExp(`${token}\\s*:`));
    }
  });
});

// ---------------------------------------------------------------------------
// AC-3: Spacing scale defined
// ---------------------------------------------------------------------------
describe('US-005: spacing scale tokens', () => {
  it('defines spacing scale from xs through 2xl', () => {
    const tokens = readTokensCss();
    const spacingTokens = [
      '--spacing-xs',
      '--spacing-sm',
      '--spacing-md',
      '--spacing-lg',
      '--spacing-xl',
      '--spacing-2xl',
    ];
    for (const token of spacingTokens) {
      expect(tokens).toMatch(new RegExp(`${token}\\s*:`));
    }
  });

  it('defines --spacing-3xl for section gaps', () => {
    const tokens = readTokensCss();
    expect(tokens).toMatch(/--spacing-3xl\s*:/);
  });

  it('preserves existing US-004 breakpoint tokens', () => {
    const tokens = readTokensCss();
    expect(tokens).toMatch(/--breakpoint-lg:\s*1200px/);
    expect(tokens).toMatch(/--breakpoint-md:\s*768px/);
  });
});

// ---------------------------------------------------------------------------
// AC-4: Shared card style exists
// ---------------------------------------------------------------------------
describe('US-005: shared card style', () => {
  it('card.css file exists in src/styles/', () => {
    expect(existsSync(resolve(STYLES_DIR, 'card.css'))).toBe(true);
  });

  it('defines a .card class', () => {
    const css = loadCssFile('card.css');
    expect(css).toMatch(/\.card\s*\{/);
  });

  it('card uses background-color from design tokens', () => {
    const css = loadCssFile('card.css');
    expect(css).toMatch(/background(?:-color)?:\s*var\(--color-(?:surface|bg)/);
  });

  it('card uses border from design tokens', () => {
    const css = loadCssFile('card.css');
    expect(css).toMatch(/border.*var\(--color-border\)/);
  });

  it('card uses border-radius from design tokens', () => {
    const css = loadCssFile('card.css');
    expect(css).toMatch(/border-radius:\s*var\(--radius-/);
  });

  it('card uses box-shadow for subtle elevation', () => {
    const css = loadCssFile('card.css');
    expect(css).toMatch(/box-shadow:\s*var\(--shadow-/);
  });

  it('card uses padding from spacing tokens', () => {
    const css = loadCssFile('card.css');
    expect(css).toMatch(/padding.*var\(--spacing-/);
  });

  it('global.css imports card.css', () => {
    const global = readGlobalCss();
    expect(global).toMatch(/@import\s+['"]\.\/card\.css['"]/);
  });
});

// ---------------------------------------------------------------------------
// AC-5: Shared button style exists
// ---------------------------------------------------------------------------
describe('US-005: shared button style', () => {
  it('button.css file exists in src/styles/', () => {
    expect(existsSync(resolve(STYLES_DIR, 'button.css'))).toBe(true);
  });

  it('defines a .btn base class', () => {
    const css = loadCssFile('button.css');
    expect(css).toMatch(/\.btn\s*\{/);
  });

  it('defines .btn-primary variant', () => {
    const css = loadCssFile('button.css');
    expect(css).toMatch(/\.btn-primary\s*\{/);
  });

  it('defines .btn-secondary variant', () => {
    const css = loadCssFile('button.css');
    expect(css).toMatch(/\.btn-secondary\s*\{/);
  });

  it('btn-primary uses accent color for background', () => {
    const css = loadCssFile('button.css');
    // Look for accent color in the primary variant section
    const primaryBlock = css.match(/\.btn-primary\s*\{([^}]+)\}/);
    expect(primaryBlock).not.toBeNull();
    expect(primaryBlock![1]).toMatch(/background(?:-color)?:\s*var\(--color-accent/);
  });

  it('button uses border-radius from design tokens', () => {
    const css = loadCssFile('button.css');
    expect(css).toMatch(/border-radius:\s*var\(--radius-/);
  });

  it('button defines focus-visible state for keyboard accessibility', () => {
    const css = loadCssFile('button.css');
    expect(css).toMatch(/\.btn.*:focus-visible/);
  });

  it('button defines hover state with transition', () => {
    const css = loadCssFile('button.css');
    expect(css).toMatch(/\.btn.*:hover/);
    expect(css).toMatch(/transition/);
  });

  it('button defines disabled state', () => {
    const css = loadCssFile('button.css');
    expect(css).toMatch(/\.btn.*:disabled/);
  });

  it('button sets cursor: pointer', () => {
    const css = loadCssFile('button.css');
    expect(css).toMatch(/cursor:\s*pointer/);
  });

  it('global.css imports button.css', () => {
    const global = readGlobalCss();
    expect(global).toMatch(/@import\s+['"]\.\/button\.css['"]/);
  });
});

// ---------------------------------------------------------------------------
// Typography heading styles
// ---------------------------------------------------------------------------
describe('US-005: heading typography styles', () => {
  it('global.css or a linked stylesheet defines heading styles using tokens', () => {
    const global = readGlobalCss();
    // Headings could be in global.css directly or in an imported file
    // Check global.css and any imported files for h1-h4 rules
    let allCss = global;
    const imports = global.match(/@import\s+['"]\.\/([^'"]+)['"]/g) ?? [];
    for (const imp of imports) {
      const filename = imp.match(/@import\s+['"]\.\/([^'"]+)['"]/)?.[1];
      if (filename) {
        try {
          allCss += loadCssFile(filename);
        } catch {
          // file might not exist yet
        }
      }
    }

    const hasHeadingStyles =
      /h1\s*[,{]/.test(allCss) || /h2\s*[,{]/.test(allCss);
    expect(hasHeadingStyles).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Regression: US-004 tokens are preserved
// ---------------------------------------------------------------------------
describe('US-005: regression — existing tokens preserved', () => {
  it('all US-004 custom properties still exist', () => {
    const tokens = readTokensCss();
    const us004Tokens = [
      '--breakpoint-lg',
      '--breakpoint-md',
      '--color-bg',
      '--color-bg-dark',
      '--color-surface',
      '--color-text',
      '--color-text-muted',
      '--color-accent',
      '--color-accent-muted',
      '--color-border',
      '--spacing-xs',
      '--spacing-sm',
      '--spacing-md',
      '--spacing-lg',
      '--spacing-xl',
      '--spacing-2xl',
      '--font-family',
      '--font-mono',
      '--font-size-sm',
      '--font-size-base',
      '--font-size-lg',
      '--font-size-xl',
    ];
    for (const token of us004Tokens) {
      expect(
        tokens,
        `Expected token ${token} to be preserved from US-004`,
      ).toMatch(new RegExp(`${token}\\s*:`));
    }
  });

  it('tokens are defined inside :root selector', () => {
    const tokens = readTokensCss();
    expect(tokens).toMatch(/:root\s*\{/);
  });
});

// ---------------------------------------------------------------------------
// Token completeness summary
// ---------------------------------------------------------------------------
describe('US-005: token completeness', () => {
  it('defines at least 40 custom properties total', () => {
    const tokens = readTokensCss();
    const props = extractCustomProperties(tokens);
    expect(
      props.length,
      `Expected ≥40 custom properties, found ${props.length}: ${props.join(', ')}`,
    ).toBeGreaterThanOrEqual(40);
  });

  it('all tokens are defined within :root block', () => {
    const tokens = readTokensCss();
    // Ensure there are no custom properties outside :root
    const outsideRoot = tokens.replace(/:root\s*\{[\s\S]*?\}/, '');
    const strayProps = extractCustomProperties(outsideRoot);
    expect(
      strayProps,
      `Found tokens outside :root: ${strayProps.join(', ')}`,
    ).toEqual([]);
  });
});
