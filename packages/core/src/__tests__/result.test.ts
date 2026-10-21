/**
 * Tests for result.ts: the ok/err helpers and their pass-through behaviour.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { appError } from '../errors.js';
import { err, mapResult, ok, unwrapOr } from '../result.js';

describe('result helpers', () => {
  it('ok and err tag the outcome', () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
    expect(err('x')).toEqual({ ok: false, error: 'x' });
  });

  it('mapResult transforms values and passes errors through untouched', () => {
    expect(mapResult(ok(2), (value) => value * 2)).toEqual(ok(4));
    const failure = err(appError('NOT_FOUND'));
    expect(mapResult(failure, (value: number) => value * 2)).toBe(failure);
  });

  it('unwrapOr returns the value or the fallback', () => {
    expect(unwrapOr(ok(1), 0)).toBe(1);
    expect(unwrapOr(err(appError('INTERNAL')), 0)).toBe(0);
  });
});
