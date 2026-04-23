import { describe, it, expect } from 'vitest';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

describe('sample unit test', () => {
  it('clamps a value within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});
