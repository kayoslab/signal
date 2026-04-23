import { describe, it, expect } from 'vitest';

/**
 * US-020: Device class inference helper
 *
 * Tests verify the pure function that classifies devices as
 * Mobile / Tablet / Desktop / Unknown based on screen dimensions,
 * DPR, and touch support.
 */

// ---------------------------------------------------------------------------
// AC: Device class card rendered
// ---------------------------------------------------------------------------
describe('US-020: infer device class — desktop', () => {
  it('classifies large screen without touch as Desktop', async () => {
    const { inferDeviceClass } = await import(
      '../../src/modules/zero-click-osint/infer-device-class'
    );
    const result = inferDeviceClass(1920, 2, false);
    expect(result.deviceClass.toLowerCase()).toContain('desktop');
  });

  it('classifies 1440px screen without touch as Desktop', async () => {
    const { inferDeviceClass } = await import(
      '../../src/modules/zero-click-osint/infer-device-class'
    );
    const result = inferDeviceClass(1440, 1, false);
    expect(result.deviceClass.toLowerCase()).toContain('desktop');
  });
});

describe('US-020: infer device class — mobile', () => {
  it('classifies small screen with touch as Mobile', async () => {
    const { inferDeviceClass } = await import(
      '../../src/modules/zero-click-osint/infer-device-class'
    );
    const result = inferDeviceClass(375, 3, true);
    expect(result.deviceClass.toLowerCase()).toContain('mobile');
  });

  it('classifies 414px screen with touch as Mobile', async () => {
    const { inferDeviceClass } = await import(
      '../../src/modules/zero-click-osint/infer-device-class'
    );
    const result = inferDeviceClass(414, 3, true);
    expect(result.deviceClass.toLowerCase()).toContain('mobile');
  });
});

describe('US-020: infer device class — tablet', () => {
  it('classifies mid-range screen with touch as Tablet', async () => {
    const { inferDeviceClass } = await import(
      '../../src/modules/zero-click-osint/infer-device-class'
    );
    const result = inferDeviceClass(768, 2, true);
    const dc = result.deviceClass.toLowerCase();
    expect(dc === 'tablet' || dc === 'mobile').toBe(true);
  });

  it('classifies iPad-sized screen with touch as Tablet', async () => {
    const { inferDeviceClass } = await import(
      '../../src/modules/zero-click-osint/infer-device-class'
    );
    const result = inferDeviceClass(1024, 2, true);
    expect(result.deviceClass.toLowerCase()).toContain('tablet');
  });
});

describe('US-020: infer device class — confidence', () => {
  it('returns a valid confidence level', async () => {
    const { inferDeviceClass } = await import(
      '../../src/modules/zero-click-osint/infer-device-class'
    );
    const result = inferDeviceClass(1920, 2, false);
    expect(['low', 'medium', 'high']).toContain(result.confidence);
  });

  it('returns medium confidence (device boundaries are fuzzy)', async () => {
    const { inferDeviceClass } = await import(
      '../../src/modules/zero-click-osint/infer-device-class'
    );
    const result = inferDeviceClass(1920, 2, false);
    expect(result.confidence).toBe('medium');
  });
});

describe('US-020: infer device class — sentinel handling', () => {
  it('returns Unknown when screen width is unavailable', async () => {
    const { inferDeviceClass } = await import(
      '../../src/modules/zero-click-osint/infer-device-class'
    );
    const result = inferDeviceClass('unavailable', 'unavailable', 'unavailable');
    expect(result.deviceClass.toLowerCase()).toContain('unknown');
  });

  it('returns Unknown when screen width is unknown', async () => {
    const { inferDeviceClass } = await import(
      '../../src/modules/zero-click-osint/infer-device-class'
    );
    const result = inferDeviceClass('unknown', 'unknown', 'unknown');
    expect(result.deviceClass.toLowerCase()).toContain('unknown');
  });

  it('returns low confidence for sentinel inputs', async () => {
    const { inferDeviceClass } = await import(
      '../../src/modules/zero-click-osint/infer-device-class'
    );
    const result = inferDeviceClass('unknown', 'unknown', 'unknown');
    expect(result.confidence).toBe('low');
  });
});

describe('US-020: infer device class — return shape', () => {
  it('returns object with deviceClass string and confidence', async () => {
    const { inferDeviceClass } = await import(
      '../../src/modules/zero-click-osint/infer-device-class'
    );
    const result = inferDeviceClass(1920, 2, false);
    expect(typeof result.deviceClass).toBe('string');
    expect(typeof result.confidence).toBe('string');
    expect(result.deviceClass.length).toBeGreaterThan(0);
  });
});

describe('US-020: infer device class — export contract', () => {
  it('exports inferDeviceClass function', async () => {
    const mod = await import(
      '../../src/modules/zero-click-osint/infer-device-class'
    );
    expect(typeof mod.inferDeviceClass).toBe('function');
  });
});
