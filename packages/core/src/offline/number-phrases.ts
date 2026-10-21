/**
 * Number-phrase grammar for briefs and quotes (research note 09 §5.2.1).
 *
 * Responsibility: read one number phrase at a token position —
 * `[FRACTION] [DIGITS | CARDINAL] MULTIPLIER*` — so "dedh sau" is 150, "sava do lakh"
 * 2,25,000, "paune do lakh" 1,75,000, "saade teen lakh" 3,50,000, "1.5 cr" 1,50,00,000 and
 * "25 l" 25,00,000; then join ranges ("20-25 lakh": the multiplier after the second number
 * applies to both). Boundary: no roles here — whether a number is guests, money or a date
 * is decided in number-roles.ts.
 */
import {
  CARDINAL_WORDS,
  FRACTION_WORDS,
  MONEY_MULTIPLIER_MIN,
  MULTIPLIER_WORDS,
  RANGE_WORDS,
  type FractionKind,
  type FractionRule,
} from './vocab/numbers.js';
import { expandWordGroups } from './vocab/word-list.js';
import { phraseTokens, tokenSet, type Token } from './tokens.js';

function foldedMap<V>(entries: readonly (readonly [string, V])[]): ReadonlyMap<string, V> {
  return new Map(entries.map(([word, value]) => [phraseTokens(word).join(' '), value] as const));
}

// Efficiency: every vocabulary table is folded once at load into a Map.
const CARDINALS = foldedMap(expandWordGroups(CARDINAL_WORDS));
const MULTIPLIERS = foldedMap(expandWordGroups(MULTIPLIER_WORDS));
const FRACTIONS = foldedMap(expandWordGroups(FRACTION_WORDS));
const RANGE_JOINERS = tokenSet(RANGE_WORDS);
const DIGITS = /^(?:\d+(?:\.\d+)?|\.\d+)$/;

export interface NumberPhrase {
  /** First and last token of the phrase (inclusive), multipliers included. */
  readonly start: number;
  readonly end: number;
  readonly low: number;
  readonly high: number;
  /** True when the phrase is all words ("dhai sau"): it counts only before a unit or multiplier. */
  readonly wordOnly: boolean;
  /** Product of the multipliers that followed (1 when none). */
  readonly multiplier: number;
  /** True for k, hazaar, lakh or crore: money on its own (rule 8). */
  readonly money: boolean;
}

interface Base {
  readonly value: number;
  readonly next: number;
  readonly wordOnly: boolean;
}

function plainNumber(token: Token | undefined): { value: number; word: boolean } | undefined {
  if (token === undefined) return undefined;
  if (DIGITS.test(token.text)) return { value: Number(token.text), word: false };
  const cardinal = CARDINALS.get(token.text);
  return cardinal === undefined ? undefined : { value: cardinal, word: true };
}

interface Applied {
  readonly value: number;
  readonly consumesNext: boolean;
}

/** How each fraction word combines with the number after it (09 §5.2.1 grammar). */
const FRACTION_APPLY: Readonly<
  Record<FractionKind, (fraction: number, following: number | undefined) => Applied | undefined>
> = {
  fixed: (fraction) => ({ value: fraction, consumesNext: false }),
  plus: (fraction, following) =>
    following === undefined ? undefined : { value: following + fraction, consumesNext: true },
  minus: (fraction, following) =>
    following === undefined ? undefined : { value: following - fraction, consumesNext: true },
  // Sava alone is one and a quarter; before a number it adds a quarter.
  'alone-or-plus': (fraction, following) =>
    following === undefined
      ? { value: 1 + fraction, consumesNext: false }
      : { value: following + fraction, consumesNext: true },
};

/** Applies a fraction word to the number after it (or lets it stand alone). */
function fractionBase(rule: FractionRule, tokens: readonly Token[], at: number): Base | undefined {
  const following = plainNumber(tokens[at + 1]);
  const applied = FRACTION_APPLY[rule.kind](rule.value, following?.value);
  if (applied === undefined) return undefined;
  return applied.consumesNext
    ? { value: applied.value, next: at + 2, wordOnly: following?.word ?? true }
    : { value: applied.value, next: at + 1, wordOnly: true };
}

function baseAt(tokens: readonly Token[], at: number): Base | undefined {
  const token = tokens[at];
  if (token === undefined) return undefined;
  const fraction = FRACTIONS.get(token.text);
  if (fraction !== undefined) return fractionBase(fraction, tokens, at);
  const plain = plainNumber(token);
  return plain === undefined
    ? undefined
    : { value: plain.value, next: at + 1, wordOnly: plain.word };
}

/** One number with its multipliers, or undefined when no number starts at `at`. */
function singleAt(tokens: readonly Token[], at: number): NumberPhrase | undefined {
  const base = baseAt(tokens, at);
  if (base === undefined) return undefined;
  let multiplier = 1;
  let next = base.next;
  let money = false;
  for (let factor = MULTIPLIERS.get(tokens[next]?.text ?? ''); factor !== undefined;) {
    multiplier *= factor;
    money ||= factor >= MONEY_MULTIPLIER_MIN;
    next += 1;
    factor = MULTIPLIERS.get(tokens[next]?.text ?? '');
  }
  const value = base.value * multiplier;
  return {
    start: at,
    end: next - 1,
    low: value,
    high: value,
    wordOnly: base.wordOnly,
    multiplier,
    money,
  };
}

/**
 * The number phrase starting at `at` (a range when "-", "to" or "se" joins two numbers).
 * @example
 * readNumberAt(tokenise('20-25 lakh').tokens, 0); // { low: 2000000, high: 2500000, … }
 * readNumberAt(tokenise('sava do lakh').tokens, 0)?.low; // 225000
 */
export function readNumberAt(tokens: readonly Token[], at: number): NumberPhrase | undefined {
  const first = singleAt(tokens, at);
  if (first === undefined) return undefined;
  const joiner = tokens[first.end + 1];
  const second =
    joiner !== undefined && RANGE_JOINERS.has(joiner.text)
      ? singleAt(tokens, first.end + 2)
      : undefined;
  if (second === undefined) return first;
  // "20-25 lakh": the second number's multiplier applies to a bare first number.
  const lowFactor = first.multiplier === 1 ? second.multiplier : 1;
  const low = first.low * lowFactor;
  return {
    start: first.start,
    end: second.end,
    low: Math.min(low, second.high),
    high: Math.max(low, second.high),
    wordOnly: first.wordOnly && second.wordOnly,
    multiplier: second.multiplier,
    money: first.money || second.money,
  };
}

/**
 * Every number phrase in the tokens, left to right, never overlapping.
 * @example
 * readNumberPhrases(tokenise('dhai lakh tak, dhai sau mehmaan').tokens).map((p) => p.low); // [250000, 250]
 */
export function readNumberPhrases(tokens: readonly Token[]): NumberPhrase[] {
  const phrases: NumberPhrase[] = [];
  let position = 0;
  while (position < tokens.length) {
    const phrase = readNumberAt(tokens, position);
    if (phrase === undefined) position += 1;
    else {
      phrases.push(phrase);
      position = phrase.end + 1;
    }
  }
  return phrases;
}
