/**
 * Tests for the offline tokeniser and phrase matcher.
 *
 * Responsibility: display words versus folded tokens, Indian digit grouping, digit/letter
 * splits, ranges versus hyphens, clause ends, exact quoting, and longest-first phrase matching.
 * Boundary: the expected tokens follow from the inputs the tests write.
 */
import { describe, expect, it } from 'vitest';
import {
  buildPhraseIndex,
  findPhrases,
  matchAt,
  phraseTokens,
  quoteOf,
  tokenise,
  tokenSet,
} from '../offline/tokens.js';

function texts(text: string): string[] {
  return tokenise(text).tokens.map((token) => token.text);
}

describe('tokenise', () => {
  it('splits digits from letters and folds case', () => {
    expect(texts('Budget 25L, 300 pax')).toEqual(['budget', '25', 'l', '300', 'pax']);
    expect(texts('7th Rs500')).toEqual(['7', 'th', 'rs', '500']);
  });

  it('removes Indian digit grouping and reads Devanagari digits', () => {
    expect(texts('₹25,00,000')).toEqual(['₹', '2500000']);
    expect(texts('२५ लाख')).toEqual(['25', 'लाख']);
  });

  it('keeps a dash between numbers as a range and turns other hyphens into spaces', () => {
    expect(texts('100-120 log')).toEqual(['100', '-', '120', 'log']);
    expect(texts('pyaaz-lahsun, 2-day')).toEqual(['pyaaz', 'lahsun', '2', 'day']);
    expect(texts('20 – 25')).toEqual(['20', '-', '25']);
  });

  it('keeps clock times, decimals and the approximation marks whole', () => {
    expect(texts('11:30 pm, 1.5 cr, ~100+')).toEqual(['11:30', 'pm', '1.5', 'cr', '~', '100', '+']);
  });

  it('marks the last token of a clause-ending word only', () => {
    const tokens = tokenise('25L, then').tokens;
    expect(tokens.map((token) => token.clauseEnd)).toEqual([false, true, false]);
  });

  it('skips words that hold no token without shifting word indexes', () => {
    const parsed = tokenise('shaadi !!! Jaipur');
    expect(parsed.tokens.map((token) => token.word)).toEqual([0, 1]);
    expect(parsed.words).toHaveLength(2);
  });
});

describe('quoteOf', () => {
  it('returns the display words a token span came from, as written', () => {
    const parsed = tokenise('dhai sau mehmaan, sagai');
    expect(quoteOf(parsed, 0, 2)).toBe('dhai sau mehmaan');
    expect(quoteOf(tokenise('Budget ₹25,00,000 only'), 1, 2)).toBe('₹25,00,000');
  });

  it('returns an empty quote for a span outside the tokens', () => {
    expect(quoteOf(tokenise('two words'), 0, 9)).toBe('');
  });
});

describe('phrase index', () => {
  const index = buildPhraseIndex([
    ['no daaru', false],
    ['daaru', true],
    ['', true],
  ]);

  it('folds phrases like a brief and ignores empty phrases', () => {
    expect(phraseTokens('Rs 40,000')).toEqual(['rs', '40000']);
    expect([...index.keys()]).toEqual(['no', 'daaru']);
  });

  it('matches the longest phrase at a position', () => {
    const tokens = tokenise('No daaru please').tokens;
    expect(matchAt(tokens, 0, index)).toEqual({ start: 0, end: 1, value: false });
    expect(matchAt(tokens, 1, index)).toEqual({ start: 1, end: 1, value: true });
    expect(matchAt(tokens, 5, index)).toBeUndefined();
  });

  it('finds non-overlapping matches left to right', () => {
    const tokens = tokenise('daaru, no daaru').tokens;
    expect(findPhrases(tokens, index).map((match) => match.value)).toEqual([true, false]);
  });

  it('builds single-token sets on folded text', () => {
    const set = tokenSet(['Log', 'लोग']);
    expect(set.has('log')).toBe(true);
    expect(set.has('लोग')).toBe(true);
  });
});
