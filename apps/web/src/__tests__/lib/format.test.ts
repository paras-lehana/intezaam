/**
 * Responsibility: the web's own display formats — seconds and the local ISO day.
 * Boundary: pure functions; rupee formatting is core's (`formatInr`, `formatLakh`) and
 * tested there.
 */
import { describe, expect, it } from 'vitest';
import { formatSeconds, toIsoDay } from '../../lib/format';

describe('formatSeconds', () => {
  it('shows one decimal of a second', () => {
    expect(formatSeconds(3240)).toBe('3.2 s');
  });
});

describe('toIsoDay', () => {
  it('uses the local calendar day, padded', () => {
    expect(toIsoDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(toIsoDay(new Date(2026, 9, 20, 0, 1))).toBe('2026-10-20');
  });
});
