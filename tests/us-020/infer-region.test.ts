import { describe, it, expect } from 'vitest';

/**
 * US-020: Region inference helper
 *
 * Tests verify the pure function that maps IANA timezone identifiers
 * to broad geographic regions. The '[Heuristic]' label must always
 * be present per acceptance criteria.
 */

// ---------------------------------------------------------------------------
// AC: Approximate region clearly labeled as heuristic
// ---------------------------------------------------------------------------
describe('US-020: infer region — heuristic label always present', () => {
  it('includes [Heuristic] in output for America/New_York', async () => {
    const { inferRegion } = await import(
      '../../src/modules/zero-click-osint/infer-region'
    );
    const result = inferRegion('America/New_York');
    expect(result.region).toContain('[Heuristic]');
  });

  it('includes [Heuristic] in output for Europe/London', async () => {
    const { inferRegion } = await import(
      '../../src/modules/zero-click-osint/infer-region'
    );
    const result = inferRegion('Europe/London');
    expect(result.region).toContain('[Heuristic]');
  });

  it('includes [Heuristic] in output for Asia/Tokyo', async () => {
    const { inferRegion } = await import(
      '../../src/modules/zero-click-osint/infer-region'
    );
    const result = inferRegion('Asia/Tokyo');
    expect(result.region).toContain('[Heuristic]');
  });

  it('includes [Heuristic] in output for unknown timezone', async () => {
    const { inferRegion } = await import(
      '../../src/modules/zero-click-osint/infer-region'
    );
    const result = inferRegion('unknown');
    expect(result.region).toContain('[Heuristic]');
  });

  it('includes [Heuristic] in output for unavailable timezone', async () => {
    const { inferRegion } = await import(
      '../../src/modules/zero-click-osint/infer-region'
    );
    const result = inferRegion('unavailable');
    expect(result.region).toContain('[Heuristic]');
  });
});

describe('US-020: infer region — known timezone mappings', () => {
  it('maps America/* to a region containing America or North/South', async () => {
    const { inferRegion } = await import(
      '../../src/modules/zero-click-osint/infer-region'
    );
    const result = inferRegion('America/Chicago');
    const regionLower = result.region.toLowerCase();
    expect(
      regionLower.includes('america') || regionLower.includes('north') || regionLower.includes('central'),
    ).toBe(true);
  });

  it('maps Europe/* to a region containing Europe', async () => {
    const { inferRegion } = await import(
      '../../src/modules/zero-click-osint/infer-region'
    );
    const result = inferRegion('Europe/Berlin');
    expect(result.region.toLowerCase()).toContain('europe');
  });

  it('maps Asia/* to a region containing Asia', async () => {
    const { inferRegion } = await import(
      '../../src/modules/zero-click-osint/infer-region'
    );
    const result = inferRegion('Asia/Shanghai');
    expect(result.region.toLowerCase()).toContain('asia');
  });

  it('maps Pacific/* to a region containing Pacific or Oceania', async () => {
    const { inferRegion } = await import(
      '../../src/modules/zero-click-osint/infer-region'
    );
    const result = inferRegion('Pacific/Auckland');
    const regionLower = result.region.toLowerCase();
    expect(
      regionLower.includes('pacific') || regionLower.includes('oceania'),
    ).toBe(true);
  });

  it('maps Australia/* to a region containing Australia or Oceania', async () => {
    const { inferRegion } = await import(
      '../../src/modules/zero-click-osint/infer-region'
    );
    const result = inferRegion('Australia/Sydney');
    const regionLower = result.region.toLowerCase();
    expect(
      regionLower.includes('australia') || regionLower.includes('oceania'),
    ).toBe(true);
  });

  it('maps Africa/* to a region containing Africa', async () => {
    const { inferRegion } = await import(
      '../../src/modules/zero-click-osint/infer-region'
    );
    const result = inferRegion('Africa/Cairo');
    expect(result.region.toLowerCase()).toContain('africa');
  });
});

describe('US-020: infer region — confidence', () => {
  it('always returns low confidence', async () => {
    const { inferRegion } = await import(
      '../../src/modules/zero-click-osint/infer-region'
    );
    expect(inferRegion('America/New_York').confidence).toBe('low');
    expect(inferRegion('Europe/London').confidence).toBe('low');
    expect(inferRegion('unknown').confidence).toBe('low');
  });
});

describe('US-020: infer region — sentinel handling', () => {
  it('handles empty string gracefully', async () => {
    const { inferRegion } = await import(
      '../../src/modules/zero-click-osint/infer-region'
    );
    const result = inferRegion('');
    expect(result.region).toContain('[Heuristic]');
    expect(result.confidence).toBe('low');
  });

  it('handles arbitrary unrecognized timezone gracefully', async () => {
    const { inferRegion } = await import(
      '../../src/modules/zero-click-osint/infer-region'
    );
    const result = inferRegion('Mars/Olympus_Mons');
    expect(result.region).toContain('[Heuristic]');
    expect(result.confidence).toBe('low');
  });
});

describe('US-020: infer region — return shape', () => {
  it('returns object with region string and confidence', async () => {
    const { inferRegion } = await import(
      '../../src/modules/zero-click-osint/infer-region'
    );
    const result = inferRegion('America/New_York');
    expect(typeof result.region).toBe('string');
    expect(typeof result.confidence).toBe('string');
    expect(result.region.length).toBeGreaterThan(0);
  });
});

describe('US-020: infer region — export contract', () => {
  it('exports inferRegion function', async () => {
    const mod = await import(
      '../../src/modules/zero-click-osint/infer-region'
    );
    expect(typeof mod.inferRegion).toBe('function');
  });
});
