/**
 * Tests for the number-phrase grammar.
 *
 * Responsibility: fraction words (sava, paune, saade, dedh, dhai), cardinals, multipliers,
 * decimals, ranges and the money and word-only flags. Boundary: expected values are the
 * grammar's own worked examples.
 */
import { describe, expect, it } from 'vitest';
import { readNumberAt, readNumberPhrases } from '../offline/number-phrases.js';
import { tokenise } from '../offline/tokens.js';

function valueOf(text: string): number | undefined {
  return readNumberAt(tokenise(text).tokens, 0)?.low;
}

describe('readNumberAt', () => {
  it.each([
    ['dedh sau', 150],
    ['dhai lakh', 250_000],
    ['sava do lakh', 225_000],
    ['sava lakh', 125_000],
    ['paune do lakh', 175_000],
    ['saade teen lakh', 350_000],
    ['1.5 cr', 15_000_000],
    ['25 l', 2_500_000],
    ['15k', 15_000],
    ['pachaas hazaar', 50_000],
    ['सवा सौ', 125],
    ['ek crore', 10_000_000],
  ])('reads "%s" as %d', (text, value) => {
    expect(valueOf(text)).toBe(value);
  });

  it('needs a number after paune and saade, but sava and dedh stand alone', () => {
    expect(valueOf('paune')).toBeUndefined();
    expect(valueOf('saade')).toBeUndefined();
    expect(valueOf('sava')).toBe(1.25);
    expect(valueOf('dedh')).toBe(1.5);
  });

  it('flags word-only phrases and money multipliers', () => {
    const words = readNumberAt(tokenise('do sau').tokens, 0);
    expect(words).toMatchObject({ low: 200, wordOnly: true, multiplier: 100, money: false });
    const digits = readNumberAt(tokenise('sava 2 lakh').tokens, 0);
    expect(digits).toMatchObject({ low: 225_000, wordOnly: false, money: true });
    expect(readNumberAt(tokenise('lakh').tokens, 0)).toBeUndefined();
    expect(readNumberAt(tokenise('').tokens, 0)).toBeUndefined();
  });

  it('applies a trailing multiplier to both ends of a range', () => {
    const range = readNumberAt(tokenise('20-25 lakh').tokens, 0);
    expect(range).toMatchObject({ start: 0, end: 3, low: 2_000_000, high: 2_500_000, money: true });
    expect(readNumberAt(tokenise('100 to 120').tokens, 0)).toMatchObject({ low: 100, high: 120 });
  });

  it('keeps each end of a range that has its own multiplier, in order', () => {
    expect(readNumberAt(tokenise('10 lakh se 5 lakh').tokens, 0)).toMatchObject({
      low: 500_000,
      high: 1_000_000,
    });
  });

  it('reads a joiner with no second number as a single number', () => {
    expect(readNumberAt(tokenise('20 to the hall').tokens, 0)).toMatchObject({
      low: 20,
      high: 20,
      end: 0,
    });
  });
});

describe('readNumberPhrases', () => {
  it('reads every phrase once, left to right', () => {
    const tokens = tokenise('dhai lakh tak, dhai sau mehmaan').tokens;
    expect(readNumberPhrases(tokens).map((phrase) => phrase.low)).toEqual([250_000, 250]);
  });

  it('returns nothing for text without numbers', () => {
    expect(readNumberPhrases(tokenise('shaadi in Jaipur').tokens)).toEqual([]);
  });
});
