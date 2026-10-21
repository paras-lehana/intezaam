/**
 * Number roles: decide what each number in a brief counts (research note 09 §5.2.1).
 *
 * Responsibility: label every number phrase, first matching rule wins — 1 time ("11:30 pm",
 * "raat 11 baje"), 2 date (next to a month), 3 age ("7th", "saatvaan"), 4 guests (before a
 * people noun; several are summed), 5 households, 6 days, 7 per-plate price, 8 budget (a
 * k/hazaar/lakh/crore multiplier or a money word just before), 9 ignored (phone numbers,
 * flat numbers: never guessed). Ranges plan budgets low and guests high; approximation and
 * cap words are recorded. Boundary: reads tokens only; validation of limits is the caller's.
 */
import { readNumberPhrases, type NumberPhrase } from './number-phrases.js';
import { buildPhraseIndex, matchAt, phraseTokens, tokenSet, type Token } from './tokens.js';
import { MONTH_WORDS } from './vocab/dates.js';
import {
  APPROX_AFTER_WORDS,
  APPROX_WORDS,
  CAP_AFTER_PHRASES,
  CAP_AFTER_WORDS,
  CAP_BEFORE_WORDS,
  CURRENCY_WORDS,
  DAY_NOUNS,
  HOUSEHOLD_NOUNS,
  NIGHT_WORDS,
  ORDINAL_SUFFIXES,
  ORDINAL_WORDS,
  PEOPLE_NOUNS,
  PER_PLATE_PHRASES,
  TIME_SUFFIXES,
} from './vocab/numbers.js';
import { expandWordGroups } from './vocab/word-list.js';

export const NUMBER_ROLES = [
  'time',
  'date',
  'age',
  'guests',
  'households',
  'days',
  'per-plate',
  'budget',
  'ignored',
] as const;

export type NumberRole = (typeof NUMBER_ROLES)[number];

export interface NumberMention {
  readonly role: NumberRole;
  readonly phrase: NumberPhrase;
  /** Token span including the noun or marker that decided the role. */
  readonly start: number;
  readonly end: number;
  readonly approx: boolean;
  readonly cap: boolean;
  /** HH:MM for time mentions. */
  readonly hhmm?: string;
}

// Efficiency: vocabulary folded once at load.
const MONTHS = tokenSet(expandWordGroups(MONTH_WORDS).map(([word]) => word));
const ORDINAL_SUFFIX = tokenSet(ORDINAL_SUFFIXES);
const PEOPLE = tokenSet(PEOPLE_NOUNS);
const HOUSEHOLDS = tokenSet(HOUSEHOLD_NOUNS);
const DAYS = tokenSet(DAY_NOUNS);
const CURRENCY = tokenSet(CURRENCY_WORDS);
const APPROX = tokenSet(APPROX_WORDS);
const APPROX_AFTER = tokenSet(APPROX_AFTER_WORDS);
const CAP_BEFORE = tokenSet(CAP_BEFORE_WORDS);
const CAP_AFTER = tokenSet(CAP_AFTER_WORDS);
const TIME_AFTER = tokenSet(TIME_SUFFIXES);
const NIGHT = tokenSet(NIGHT_WORDS);
const PM = 'pm';
const CAP_PHRASES = buildPhraseIndex(CAP_AFTER_PHRASES.map((phrase) => [phrase, true] as const));
const PER_PLATE = buildPhraseIndex(PER_PLATE_PHRASES.map((phrase) => [phrase, true] as const));
const ORDINALS = new Map(
  expandWordGroups(ORDINAL_WORDS).map(([word, value]) => [phraseTokens(word).join(' '), value]),
);

const CLOCK = /^(\d{1,2}):(\d{2})$/;
const HOURS_PER_HALF_DAY = 12;
/** "raat 7–11 baje" is evening; "raat 1 baje" is after midnight (09 §5.2.1 rule 1). */
const NIGHT_FIRST_HOUR = 7;
const LAST_CLOCK_HOUR = 23;
const LAST_MINUTE = 59;
const PAD = 2;
/** Money words up to two tokens before a number make it money (rule 8). */
const MONEY_LOOKBACK = 2;

function textAt(tokens: readonly Token[], index: number): string {
  return tokens[index]?.text ?? '';
}

/** HH:MM for an hour and minute at `start`, with "pm" after or "raat" before making it evening. */
function toHhmm(
  tokens: readonly Token[],
  start: number,
  hour: number,
  minute: number,
): string | undefined {
  const after = textAt(tokens, start + 1);
  const night = NIGHT.has(textAt(tokens, start - 1)) && hour >= NIGHT_FIRST_HOUR;
  const hour24 =
    (after === PM || night) && hour < HOURS_PER_HALF_DAY ? hour + HOURS_PER_HALF_DAY : hour;
  if (!Number.isInteger(hour24) || hour24 > LAST_CLOCK_HOUR || minute > LAST_MINUTE)
    return undefined;
  return `${String(hour24).padStart(PAD, '0')}:${String(minute).padStart(PAD, '0')}`;
}

/** A number followed by baje, am or pm is a clock time ("raat 11 baje" = 23:00). */
function clockOf(tokens: readonly Token[], phrase: NumberPhrase): string | undefined {
  if (!TIME_AFTER.has(textAt(tokens, phrase.end + 1))) return undefined;
  return toHhmm(tokens, phrase.end, phrase.low, 0);
}

/** "11:30 pm" arrives as one clock token. */
function clockMentions(tokens: readonly Token[]): NumberMention[] {
  return tokens.flatMap((token, index) => {
    const clock = CLOCK.exec(token.text);
    const hhmm =
      clock === null ? undefined : toHhmm(tokens, index, Number(clock[1]), Number(clock[2]));
    if (hhmm === undefined) return [];
    const phrase = singleTokenPhrase(index, 0);
    return [{ role: 'time', phrase, start: index, end: index, approx: false, cap: false, hhmm }];
  });
}

function singleTokenPhrase(index: number, value: number): NumberPhrase {
  return {
    start: index,
    end: index,
    low: value,
    high: value,
    wordOnly: true,
    multiplier: 1,
    money: false,
  };
}

/**
 * A month word beside the number makes it a day or a year, but only within one clause:
 * in "25 December, 120 residents" the 120 is a guest count, not a date (battery B06).
 */
function isDateNumber(tokens: readonly Token[], phrase: NumberPhrase): boolean {
  const after = textAt(tokens, phrase.end + 1);
  const monthAt = ORDINAL_SUFFIX.has(after) ? phrase.end + 2 : phrase.end + 1;
  const monthAfter = tokens[phrase.end]?.clauseEnd === false && MONTHS.has(textAt(tokens, monthAt));
  const before = tokens[phrase.start - 1];
  const monthBefore = before?.clauseEnd === false && MONTHS.has(before.text);
  return monthAfter || monthBefore;
}

/** Index of a money word up to two tokens before `start` ("budget Rs 40,000"), if any. */
function moneyWordAt(tokens: readonly Token[], start: number): number | undefined {
  for (let back = 1; back <= MONEY_LOOKBACK; back += 1) {
    if (CURRENCY.has(textAt(tokens, start - back))) return start - back;
  }
  return undefined;
}

/** What a role rule may look at: the tokens, the phrase, the token after it and any money word. */
interface RoleProbe {
  readonly tokens: readonly Token[];
  readonly phrase: NumberPhrase;
  /** The first token after the number (and any "+"). */
  readonly after: number;
  readonly moneyAt: number | undefined;
}

interface RoleRule {
  readonly role: Exclude<NumberRole, 'time' | 'date' | 'ignored'>;
  readonly test: (probe: RoleProbe) => boolean;
  /** Rules 3–6 consume a unit noun, which also lets a word number ("do sau") count. */
  readonly unit: boolean;
}

/** "per plate 1200": the per-plate phrase may end one to three tokens before the number. */
const PER_PLATE_LOOKBACK = [1, 2, 3];

/** Rules 3–8 in order; the first that applies decides the role. */
const ROLE_RULES: readonly RoleRule[] = [
  {
    role: 'age',
    unit: true,
    test: ({ tokens, after }) => ORDINAL_SUFFIX.has(textAt(tokens, after)),
  },
  { role: 'guests', unit: true, test: ({ tokens, after }) => PEOPLE.has(textAt(tokens, after)) },
  {
    role: 'households',
    unit: true,
    test: ({ tokens, after }) => HOUSEHOLDS.has(textAt(tokens, after)),
  },
  { role: 'days', unit: true, test: ({ tokens, after }) => DAYS.has(textAt(tokens, after)) },
  {
    role: 'per-plate',
    unit: false,
    test: ({ tokens, phrase, after }) =>
      PER_PLATE_LOOKBACK.some(
        (back) => matchAt(tokens, phrase.start - back, PER_PLATE)?.end === phrase.start - 1,
      ) || matchAt(tokens, after, PER_PLATE) !== undefined,
  },
  {
    role: 'budget',
    unit: false,
    test: ({ phrase, moneyAt }) => phrase.money || moneyAt !== undefined,
  },
];

function decide(tokens: readonly Token[], phrase: NumberPhrase): NumberMention {
  const plusAfter = APPROX_AFTER.has(textAt(tokens, phrase.end + 1));
  const after = phrase.end + (plusAfter ? 2 : 1);
  const approx =
    plusAfter ||
    APPROX.has(textAt(tokens, phrase.start - 1)) ||
    APPROX.has(textAt(tokens, phrase.start - 2));
  const capPhrase = matchAt(tokens, after, CAP_PHRASES);
  const cap =
    CAP_BEFORE.has(textAt(tokens, phrase.start - 1)) ||
    CAP_AFTER.has(textAt(tokens, after)) ||
    capPhrase !== undefined;
  const base = { phrase, start: phrase.start, end: phrase.end, approx, cap };
  const hhmm = clockOf(tokens, phrase);
  if (hhmm !== undefined) return { ...base, role: 'time', end: phrase.end + 1, hhmm };
  if (isDateNumber(tokens, phrase)) return { ...base, role: 'date' };
  const moneyAt = moneyWordAt(tokens, phrase.start);
  const rule = ROLE_RULES.find((candidate) => candidate.test({ tokens, phrase, after, moneyAt }));
  const usable = rule !== undefined && (!phrase.wordOnly || rule.unit || phrase.multiplier > 1);
  if (!usable) return { ...base, role: 'ignored' };
  // A budget proved only by its money word quotes that word too, so the evidence re-reads as money.
  const start =
    rule.role === 'budget' && !phrase.money && moneyAt !== undefined ? moneyAt : phrase.start;
  return { ...base, role: rule.role, start, end: rule.unit ? after : phrase.end };
}

/**
 * Every number in the tokens with its role, plus Hindi ordinal words read as ages.
 * @example
 * readNumberMentions(tokenise('2 lakh mein 200 log').tokens).map((m) => m.role); // ['budget', 'guests']
 */
export function readNumberMentions(tokens: readonly Token[]): NumberMention[] {
  const mentions = readNumberPhrases(tokens).map((phrase) => decide(tokens, phrase));
  const ordinals = tokens.flatMap((token, index): NumberMention[] => {
    const ordinal = ORDINALS.get(token.text);
    if (ordinal === undefined) return [];
    const phrase = singleTokenPhrase(index, ordinal);
    return [{ role: 'age', phrase, start: index, end: index, approx: false, cap: false }];
  });
  return [...mentions, ...clockMentions(tokens), ...ordinals].sort((a, b) => a.start - b.start);
}
