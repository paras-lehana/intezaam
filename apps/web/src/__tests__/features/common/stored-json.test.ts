/**
 * Responsibility: the guarded JSON parse and the shared "read a remembered value through its
 * schema" step — a valid value comes back as the schema makes it, and an absent, blocked,
 * malformed or schema-failing value becomes the caller's fallback. Boundary: the values
 * stored here are test-owned inputs; the tools' own readers are tested with their modules.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { parseJsonSafe, readStored } from '../../../components/features/common/stored-json';

const KEY = 'intezaam:test-store';
const schema = z.array(z.string().max(8)).max(3);
const FALLBACK: readonly string[] = [];

afterEach(() => {
  window.localStorage.removeItem(KEY);
});

describe('parseJsonSafe', () => {
  it('returns what valid JSON encodes', () => {
    expect(parseJsonSafe('{"a":[1,2]}')).toEqual({ a: [1, 2] });
  });

  it('returns undefined for text that is not JSON', () => {
    expect(parseJsonSafe('{oops')).toBeUndefined();
    expect(parseJsonSafe('')).toBeUndefined();
  });
});

describe('readStored', () => {
  it('returns the fallback when nothing is stored', () => {
    expect(readStored(KEY, schema, [...FALLBACK])).toEqual(FALLBACK);
  });

  it('returns the stored value as the schema reads it', () => {
    const value = ['haldi', 'mehendi'];
    window.localStorage.setItem(KEY, JSON.stringify(value));
    expect(readStored(KEY, schema, [...FALLBACK])).toEqual(schema.parse(value));
  });

  it('falls back on malformed JSON and on a value the schema refuses', () => {
    window.localStorage.setItem(KEY, '["haldi"');
    expect(readStored(KEY, schema, [...FALLBACK])).toEqual(FALLBACK);
    window.localStorage.setItem(KEY, JSON.stringify(['a', 'b', 'c', 'd']));
    expect(readStored(KEY, schema, [...FALLBACK])).toEqual(FALLBACK);
    window.localStorage.setItem(KEY, JSON.stringify({ not: 'a list' }));
    expect(readStored(KEY, schema, [...FALLBACK])).toEqual(FALLBACK);
  });

  it('falls back when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(readStored(KEY, schema, [...FALLBACK])).toEqual(FALLBACK);
  });
});
