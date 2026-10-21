/**
 * Tests for domain/units.ts: lakh and crore conversions and range helpers.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { CRORE_INR, LAKH_INR, lakh, lakhRange, range } from '../domain/units.js';

describe('money units', () => {
  it('a crore is a hundred lakh', () => {
    expect(CRORE_INR / LAKH_INR).toBe(100);
  });

  it('converts lakh figures to whole rupees', () => {
    expect(lakh(2.5)).toBe(2.5 * LAKH_INR);
    expect(lakh(14.1)).toBe(Math.round(14.1 * LAKH_INR));
  });

  it('builds ranges', () => {
    expect(lakhRange(28, 48)).toEqual({ min: lakh(28), max: lakh(48) });
    expect(range(600, 750)).toEqual({ min: 600, max: 750 });
  });
});
