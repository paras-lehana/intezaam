/**
 * Tokeniser and phrase matcher for the offline readers and the evidence guards.
 *
 * Responsibility: split text into display words (for quoting evidence exactly as written)
 * and folded tokens (for matching): Indian digit grouping is removed ("25,00,000"), digits
 * and letters are split ("15k", "25L", "7th"), a hyphen between numbers is a range and any
 * other hyphen a space. Phrase tables are indexed by their first token and matched longest
 * first, so "shaadi ki saalgirah" wins over "shaadi" and "no daaru" over "daaru".
 * Boundary: pure; tokens never leave the module that asked for them.
 */
import { foldForMatch, toDisplayText } from '../security/normalise.js';

export interface Token {
  /** The folded token text ("15", "k", "लाख", "shaadi"). */
  readonly text: string;
  /** Index of the display word this token came from. */
  readonly word: number;
  /** True when the source word ended a clause (",", ".", ";", "!", "?"). */
  readonly clauseEnd: boolean;
}

export interface WordSpan {
  readonly start: number;
  readonly end: number;
}

export interface TokenisedText {
  readonly display: string;
  readonly words: readonly WordSpan[];
  readonly tokens: readonly Token[];
}

const WORD = /\S+/g;
const CLAUSE_END = /[,.;!?।]$/;
const TRAILING_CLAUSE_MARKS = /[,.;!?।]+$/u;
const STANDALONE_DASH = /^[-–]$/;
const DIGIT_GROUP_COMMA = /(\d),(?=\d)/g;
/** A dash between two digits is a range ("100-120"); U+2012 marks it while other dashes go. */
const RANGE_DASH = /(\d)[-–](?=\d)/g;
const RANGE_MARK = '\u2012';
const RANGE_MARKS = /\u2012/g;
const OTHER_DASH = /[-–]/g;
const DIGIT_THEN_LETTER = /(\d)(\p{L})/gu;
const LETTER_THEN_DIGIT = /(\p{L}\p{M}*)(\d)/gu;
/** Times, numbers (a bare ".5" only when no letter or digit precedes it), words, ₹ ~ + and -. */
const TOKEN =
  /\d{1,2}:\d{2}|\d+(?:\.\d+)?|(?<![\p{L}\d])\.\d+|[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*|[₹~+]|-/gu;

/** Splits one folded word into tokens; a range dash survives as its own "-" token. */
function wordTokens(folded: string): string[] {
  if (STANDALONE_DASH.test(folded)) return ['-'];
  const spaced = folded
    .replace(DIGIT_GROUP_COMMA, '$1')
    .replace(RANGE_DASH, `$1 ${RANGE_MARK} `)
    .replace(OTHER_DASH, ' ')
    .replace(RANGE_MARKS, '-')
    .replace(DIGIT_THEN_LETTER, '$1 $2')
    .replace(LETTER_THEN_DIGIT, '$1 $2');
  return spaced.match(TOKEN) ?? [];
}

/**
 * Splits text into display words and folded tokens.
 * @example
 * tokenise('Budget 25L, 300 pax').tokens.map((t) => t.text); // ['budget', '25', 'l', '300', 'pax']
 */
export function tokenise(text: string): TokenisedText {
  const display = toDisplayText(text);
  const words: WordSpan[] = [];
  const tokens: Token[] = [];
  for (const match of display.matchAll(WORD)) {
    const raw = match[0];
    const parts = wordTokens(foldForMatch(raw));
    if (parts.length === 0) continue;
    const word = words.length;
    words.push({ start: match.index, end: match.index + raw.length });
    const clauseEnd = CLAUSE_END.test(raw);
    parts.forEach((part, index) => {
      tokens.push({ text: part, word, clauseEnd: clauseEnd && index === parts.length - 1 });
    });
  }
  return { display, words, tokens };
}

/**
 * The display text covering tokens `from`…`to` (inclusive), as the user wrote it, without
 * the clause punctuation that ended the last word (the evidence chip shows "200 log", not
 * "200 log,"; a prefix of the brief is still a substring of it).
 * @example
 * const parsed = tokenise('dhai sau mehmaan, sagai');
 * quoteOf(parsed, 0, 2); // 'dhai sau mehmaan'
 */
export function quoteOf(source: TokenisedText, from: number, to: number): string {
  const first = source.tokens[from];
  const last = source.tokens[to];
  if (first === undefined || last === undefined) return '';
  const start = source.words[first.word]?.start ?? 0;
  const end = source.words[last.word]?.end ?? start;
  return source.display.slice(start, end).replace(TRAILING_CLAUSE_MARKS, '');
}

/**
 * The folded token texts of a phrase, tokenised exactly like a brief.
 * @example
 * phraseTokens('Rs 40,000'); // ['rs', '40000']
 */
export function phraseTokens(phrase: string): string[] {
  return tokenise(phrase).tokens.map((token) => token.text);
}

interface IndexedPhrase<V> {
  readonly tokens: readonly string[];
  readonly value: V;
}

/** Phrases keyed by their first token, longest first. */
export type PhraseIndex<V> = ReadonlyMap<string, readonly IndexedPhrase<V>[]>;

/**
 * Builds a phrase index; every phrase is folded and tokenised once, at module load.
 * @example
 * const index = buildPhraseIndex([['no daaru', false], ['daaru', true]]);
 */
export function buildPhraseIndex<V>(entries: Iterable<readonly [string, V]>): PhraseIndex<V> {
  const index = new Map<string, IndexedPhrase<V>[]>();
  for (const [phrase, value] of entries) {
    const tokens = phraseTokens(phrase);
    const [head] = tokens;
    if (head === undefined) continue;
    const bucket = index.get(head) ?? [];
    bucket.push({ tokens, value });
    index.set(head, bucket);
  }
  for (const bucket of index.values()) bucket.sort((a, b) => b.tokens.length - a.tokens.length);
  return index;
}

export interface PhraseMatch<V> {
  readonly start: number;
  readonly end: number;
  readonly value: V;
}

/**
 * The longest phrase starting at `position`, if any.
 * @example
 * matchAt(tokenise('no daaru').tokens, 0, index)?.value; // false
 */
export function matchAt<V>(
  tokens: readonly Token[],
  position: number,
  index: PhraseIndex<V>,
): PhraseMatch<V> | undefined {
  const head = tokens[position];
  if (head === undefined) return undefined;
  // Efficiency: only phrases sharing the first token are compared.
  const candidate = index
    .get(head.text)
    ?.find((phrase) =>
      phrase.tokens.every((text, offset) => tokens[position + offset]?.text === text),
    );
  return candidate === undefined
    ? undefined
    : { start: position, end: position + candidate.tokens.length - 1, value: candidate.value };
}

/**
 * Every non-overlapping phrase match, left to right, longest first at each position.
 * @example
 * findPhrases(tokenise('veg aur nv dono').tokens, dietIndex).length; // 1 (the whole phrase)
 */
export function findPhrases<V>(tokens: readonly Token[], index: PhraseIndex<V>): PhraseMatch<V>[] {
  const matches: PhraseMatch<V>[] = [];
  let position = 0;
  while (position < tokens.length) {
    const match = matchAt(tokens, position, index);
    if (match === undefined) position += 1;
    else {
      matches.push(match);
      position = match.end + 1;
    }
  }
  return matches;
}

/**
 * A set of folded single tokens for quick membership tests.
 * @example
 * tokenSet(['Log', 'लोग']).has('log'); // true
 */
export function tokenSet(list: Iterable<string>): ReadonlySet<string> {
  return new Set(Array.from(list, (entry) => phraseTokens(entry).join(' ')));
}
