import { describe, it, expect } from 'vitest';

/**
 * US-020: Browser family inference helper
 *
 * Tests verify the pure function that infers browser family from
 * platform string and WebGL vendor/renderer heuristics.
 */

// ---------------------------------------------------------------------------
// AC: Browser family card rendered
// ---------------------------------------------------------------------------
describe('US-020: infer browser family — known combos', () => {
  it('infers Safari from Apple GPU renderer', async () => {
    const { inferBrowserFamily } = await import(
      '../../src/modules/zero-click-osint/infer-browser-family'
    );
    const result = inferBrowserFamily('MacIntel', 'Apple GPU', 'Apple Inc.');
    expect(result.family.toLowerCase()).toContain('safari');
  });

  it('infers Chrome from Google vendor', async () => {
    const { inferBrowserFamily } = await import(
      '../../src/modules/zero-click-osint/infer-browser-family'
    );
    const result = inferBrowserFamily(
      'MacIntel',
      'ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)',
      'Google Inc. (Apple)',
    );
    expect(result.family.toLowerCase()).toContain('chrome');
  });

  it('infers Firefox from Mozilla renderer patterns', async () => {
    const { inferBrowserFamily } = await import(
      '../../src/modules/zero-click-osint/infer-browser-family'
    );
    const result = inferBrowserFamily('MacIntel', 'Mesa Intel(R) UHD', 'Mozilla');
    expect(result.family.toLowerCase()).toContain('firefox');
  });
});

describe('US-020: infer browser family — confidence levels', () => {
  it('returns a valid confidence level', async () => {
    const { inferBrowserFamily } = await import(
      '../../src/modules/zero-click-osint/infer-browser-family'
    );
    const result = inferBrowserFamily('MacIntel', 'Apple GPU', 'Apple Inc.');
    expect(['low', 'medium', 'high']).toContain(result.confidence);
  });

  it('returns medium confidence at most (inference is imprecise)', async () => {
    const { inferBrowserFamily } = await import(
      '../../src/modules/zero-click-osint/infer-browser-family'
    );
    const result = inferBrowserFamily('MacIntel', 'Apple GPU', 'Apple Inc.');
    expect(result.confidence).not.toBe('high');
  });
});

describe('US-020: infer browser family — sentinel handling', () => {
  it('returns Unknown for unknown platform', async () => {
    const { inferBrowserFamily } = await import(
      '../../src/modules/zero-click-osint/infer-browser-family'
    );
    const result = inferBrowserFamily('unknown', 'unknown', 'unknown');
    expect(result.family.toLowerCase()).toContain('unknown');
  });

  it('returns Unknown for unavailable platform', async () => {
    const { inferBrowserFamily } = await import(
      '../../src/modules/zero-click-osint/infer-browser-family'
    );
    const result = inferBrowserFamily('unavailable', 'unavailable', 'unavailable');
    expect(result.family.toLowerCase()).toContain('unknown');
  });

  it('returns Unknown for empty strings', async () => {
    const { inferBrowserFamily } = await import(
      '../../src/modules/zero-click-osint/infer-browser-family'
    );
    const result = inferBrowserFamily('', '', '');
    expect(result.family.toLowerCase()).toContain('unknown');
  });

  it('returns low confidence when inputs are sentinel values', async () => {
    const { inferBrowserFamily } = await import(
      '../../src/modules/zero-click-osint/infer-browser-family'
    );
    const result = inferBrowserFamily('unknown', 'unknown', 'unknown');
    expect(result.confidence).toBe('low');
  });
});

describe('US-020: infer browser family — return shape', () => {
  it('returns object with family string and confidence', async () => {
    const { inferBrowserFamily } = await import(
      '../../src/modules/zero-click-osint/infer-browser-family'
    );
    const result = inferBrowserFamily('MacIntel', 'some renderer', 'some vendor');
    expect(typeof result.family).toBe('string');
    expect(typeof result.confidence).toBe('string');
    expect(result.family.length).toBeGreaterThan(0);
  });
});

describe('US-020: infer browser family — export contract', () => {
  it('exports inferBrowserFamily function', async () => {
    const mod = await import(
      '../../src/modules/zero-click-osint/infer-browser-family'
    );
    expect(typeof mod.inferBrowserFamily).toBe('function');
  });
});
