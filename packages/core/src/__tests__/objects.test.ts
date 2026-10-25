/**
 * Tests for the optional-field copier.
 *
 * Responsibility: defined fields are copied with their values (including falsy ones),
 * undefined fields are absent rather than present-as-undefined, only the named keys are
 * read, and the source is never changed. Boundary: plain records; no domain data.
 */
import { describe, expect, it } from 'vitest';
import { pickDefined, withoutUndefined } from '../objects.js';

interface Sample {
  readonly city?: string;
  readonly guests?: number;
  readonly flexible?: boolean;
  readonly note?: string;
}

describe('pickDefined', () => {
  it('copies the named fields that are defined, falsy values included', () => {
    const source: Sample = { city: 'Pune', guests: 0, flexible: false };
    expect(pickDefined(source, ['city', 'guests', 'flexible'])).toEqual({
      city: 'Pune',
      guests: 0,
      flexible: false,
    });
  });

  it('leaves undefined fields out instead of copying them as undefined', () => {
    const picked = pickDefined({ city: 'Pune', guests: undefined }, ['city', 'guests']);
    expect(picked).toEqual({ city: 'Pune' });
    expect(Object.keys(picked)).toEqual(['city']);
  });

  it('reads only the named keys and leaves the source unchanged', () => {
    const source: Sample = { city: 'Pune', note: 'not asked for' };
    const before = { ...source };
    expect(pickDefined(source, ['city'])).toEqual({ city: 'Pune' });
    expect(source).toEqual(before);
  });

  it('returns an empty record when nothing is defined', () => {
    expect(pickDefined<Sample, 'city' | 'guests'>({}, ['city', 'guests'])).toEqual({});
  });
});

describe('withoutUndefined', () => {
  it('keeps every defined field, falsy values included, and drops the undefined ones', () => {
    const kept = withoutUndefined({ city: 'Pune', guests: 0, flexible: false, note: undefined });
    expect(kept).toEqual({ city: 'Pune', guests: 0, flexible: false });
    expect(Object.keys(kept)).toEqual(['city', 'guests', 'flexible']);
  });

  it('copies only own fields, never inherited ones', () => {
    const inherited: { readonly city?: string } = Object.create({ city: 'from the prototype' });
    expect(withoutUndefined(inherited)).toEqual({});
  });

  it('returns an empty record for a record of undefined fields', () => {
    expect(withoutUndefined({ city: undefined, guests: undefined })).toEqual({});
  });
});
