/**
 * Tests for domain/scale.ts: scale-band classification at its thresholds.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import {
  INTIMATE_BELOW_GUESTS,
  LARGE_ABOVE_GUESTS,
  SCALE_BANDS,
  SCALE_LABELS,
  scaleBandFor,
} from '../domain/scale.js';

describe('scale bands (CTX-03)', () => {
  it('classifies at and around both thresholds', () => {
    expect(scaleBandFor(INTIMATE_BELOW_GUESTS - 1)).toBe('intimate');
    expect(scaleBandFor(INTIMATE_BELOW_GUESTS)).toBe('mid');
    expect(scaleBandFor(LARGE_ABOVE_GUESTS)).toBe('mid');
    expect(scaleBandFor(LARGE_ABOVE_GUESTS + 1)).toBe('large');
  });

  it('labels every band', () => {
    for (const band of SCALE_BANDS) expect(SCALE_LABELS[band].length).toBeGreaterThan(0);
  });
});
