/**
 * Preference reader: city, diet, halal, alcohol, setting, access needs, style, priorities
 * and cut, each from explicit words.
 *
 * Responsibility: turn the folded tokens into the values the form needs, each with the
 * token span that proves it. Jain only from the word Jain (it fires the sunset rule);
 * non-veg words make the menu mixed; "no daaru" beats "daaru"; an elder relative counts as
 * an access need only beside a stated need; the venue city wins over an origin city.
 * Boundary: pure readers; the brief assembler decides which spans become evidence.
 */
import { ACCESS_NEEDS, type AccessNeed } from '../domain/accessibility.js';
import type { RankableCategory } from '../domain/budget-categories.js';
import { CITY_TABLE, type CityInfo } from '../domain/city-table.js';
import type { VenueSetting } from '../domain/context-options.js';
import type { DietProfile } from '../domain/diet.js';
import type { StyleTag } from '../domain/style.js';
import { buildPhraseIndex, findPhrases, type PhraseMatch, type Token } from './tokens.js';
import { CITY_EXTRA_SPELLINGS, ORIGIN_AFTER_WORDS, ORIGIN_BEFORE_WORDS } from './vocab/cities.js';
import {
  HINGLISH_WORDS,
  ACCESS_WORDS,
  ALCOHOL_NO_WORDS,
  ALCOHOL_YES_WORDS,
  CATEGORY_WORDS,
  CUT_WORDS,
  DIET_WORDS,
  ELDER_RELATIVE_WORDS,
  HALAL_WORDS,
  PRIORITY_WORDS,
  SETTING_WORDS,
  STYLE_WORDS,
} from './vocab/preferences.js';
import { expandGroups } from './vocab/word-list.js';

const CITY_BY_ID: ReadonlyMap<string, CityInfo> = new Map(
  CITY_TABLE.map((city) => [city.id, city]),
);

// Efficiency: every table is folded and indexed once at load.
const CITIES = buildPhraseIndex<CityInfo>([
  ...CITY_TABLE.flatMap((city) =>
    [city.id, city.name, ...city.aliases].map((name) => [name, city] as const),
  ),
  ...expandGroups(CITY_EXTRA_SPELLINGS).flatMap(([spelling, id]) => {
    const city = CITY_BY_ID.get(id);
    return city === undefined ? [] : [[spelling, city] as const];
  }),
]);
const ORIGIN_AFTER = buildPhraseIndex(ORIGIN_AFTER_WORDS.map((word) => [word, true] as const));
const ORIGIN_BEFORE = buildPhraseIndex(ORIGIN_BEFORE_WORDS.map((word) => [word, true] as const));
const DIETS = buildPhraseIndex(expandGroups(DIET_WORDS));
const HALAL = buildPhraseIndex(HALAL_WORDS.map((word) => [word, true] as const));
const ALCOHOL = buildPhraseIndex<boolean>([
  ...ALCOHOL_NO_WORDS.map((word) => [word, false] as const),
  ...ALCOHOL_YES_WORDS.map((word) => [word, true] as const),
]);
const SETTINGS = buildPhraseIndex(expandGroups(SETTING_WORDS));
const ACCESS = buildPhraseIndex(expandGroups(ACCESS_WORDS));
const ELDER_RELATIVES = buildPhraseIndex(ELDER_RELATIVE_WORDS.map((word) => [word, true] as const));
const STYLES = buildPhraseIndex(expandGroups(STYLE_WORDS));
const CATEGORIES = buildPhraseIndex(expandGroups(CATEGORY_WORDS));
const PRIORITY = buildPhraseIndex(PRIORITY_WORDS.map((word) => [word, true] as const));
const CUT = buildPhraseIndex(CUT_WORDS.map((word) => [word, true] as const));
const HINGLISH = buildPhraseIndex(HINGLISH_WORDS.map((word) => [word, word] as const));
/** Two different Hindi function words, so one stray "ki" or a name does not decide it. */
const MIN_HINGLISH_WORDS = 2;

const MAX_PRIORITIES = 3;
const MAX_STYLE_TAGS = 5;

/** A value with the spans that prove it. */
export interface Proven<V> {
  readonly value: V;
  readonly spans: readonly PhraseMatch<unknown>[];
}

/**
 * The venue city: the first gazetteer city that is not an origin ("Jaipur se", "from Pune").
 * @example
 * readCity(tokenise('Udaipur destination wedding, family Jaipur se aa rahi hai').tokens)?.value.name; // 'Udaipur'
 */
export function readCity(tokens: readonly Token[]): Proven<CityInfo> | undefined {
  const isOrigin = (match: PhraseMatch<CityInfo>): boolean =>
    findPhrases(tokens.slice(match.end + 1, match.end + 2), ORIGIN_AFTER).length > 0 ||
    findPhrases(tokens.slice(Math.max(0, match.start - 1), match.start), ORIGIN_BEFORE).length > 0;
  const venue = findPhrases(tokens, CITIES).find((match) => !isOrigin(match));
  return venue === undefined ? undefined : { value: venue.value, spans: [venue] };
}

export interface DietReading {
  readonly menu?: DietProfile;
  readonly halal: boolean;
  readonly spans: readonly PhraseMatch<unknown>[];
}

/** The menu precedence is a Jain word first, else a non-veg word (mixed), else veg. */
const MENU_PRECEDENCE: readonly DietProfile[] = ['jain', 'mixed', 'veg'];

/**
 * Menu and halal flag; "no onion garlic" is vegetarian, never Jain (battery B12).
 * @example
 * readDiet(tokenise('mostly veg with some non-veg').tokens).menu; // 'mixed'
 */
export function readDiet(tokens: readonly Token[]): DietReading {
  const diets = findPhrases(tokens, DIETS);
  const halal = findPhrases(tokens, HALAL);
  const menu = MENU_PRECEDENCE.find((profile) => diets.some((match) => match.value === profile));
  const spans = [...diets.filter((match) => match.value === menu), ...halal];
  return menu === undefined
    ? { halal: halal.length > 0, spans }
    : { menu, halal: halal.length > 0, spans };
}

/**
 * Alcohol: a negation anywhere wins over a plain mention.
 * @example
 * readAlcohol(tokenise('sirf veg, no daaru').tokens)?.value; // false
 */
export function readAlcohol(tokens: readonly Token[]): Proven<boolean> | undefined {
  const matches = findPhrases(tokens, ALCOHOL);
  const decisive = matches.find((match) => !match.value) ?? matches[0];
  return decisive === undefined ? undefined : { value: decisive.value, spans: [decisive] };
}

/**
 * Venue setting; both indoor and outdoor words make it mixed.
 * @example
 * readSetting(tokenise('ground floor hall chahiye').tokens)?.value; // 'indoor'
 */
export function readSetting(tokens: readonly Token[]): Proven<VenueSetting> | undefined {
  const matches = findPhrases(tokens, SETTINGS);
  const [firstMatch] = matches;
  if (firstMatch === undefined) return undefined;
  const values = new Set(matches.map((match) => match.value));
  const both = values.has('indoor') && values.has('outdoor');
  return { value: both ? 'mixed' : firstMatch.value, spans: matches };
}

/**
 * Access needs; grandparents count as "elderly" only beside a stated need.
 * @example
 * readAccess(tokenise('Nani wheelchair pe hain').tokens).value; // ['elderly', 'wheelchair']
 */
export function readAccess(tokens: readonly Token[]): Proven<AccessNeed[]> {
  const matches = findPhrases(tokens, ACCESS);
  const relatives = matches.length === 0 ? [] : findPhrases(tokens, ELDER_RELATIVES);
  const needs = new Set<AccessNeed>(matches.map((match) => match.value));
  if (relatives.length > 0) needs.add('elderly');
  const ordered = ACCESS_NEEDS.filter((need) => needs.has(need));
  return { value: ordered, spans: [...matches, ...relatives] };
}

/**
 * Style chips named in the brief, in order, at most five.
 * @example
 * readStyles(tokenise('royal and floral').tokens).value; // ['royal', 'floral']
 */
export function readStyles(tokens: readonly Token[]): Proven<StyleTag[]> {
  const matches = findPhrases(tokens, STYLES);
  const tags = [...new Set(matches.map((match) => match.value))].slice(0, MAX_STYLE_TAGS);
  return { value: tags, spans: matches };
}

interface Clause {
  readonly start: number;
  readonly tokens: readonly Token[];
}

/** Splits tokens into clauses at commas and full stops, so "food is a priority" stays local. */
function clauses(tokens: readonly Token[]): Clause[] {
  const found: Clause[] = [];
  let start = 0;
  tokens.forEach((token, index) => {
    if (token.clauseEnd || index === tokens.length - 1) {
      found.push({ start, tokens: tokens.slice(start, index + 1) });
      start = index + 1;
    }
  });
  return found;
}

export interface PriorityReading {
  readonly priorities: RankableCategory[];
  readonly cut?: RankableCategory;
  /** Token spans of the clauses that named the priorities and the cut. */
  readonly prioritySpans: readonly { readonly start: number; readonly end: number }[];
  readonly cutSpans: readonly { readonly start: number; readonly end: number }[];
}

/**
 * Top priorities ("food and decor are most important") and one cut ("kam decor").
 * @example
 * readPriorities(tokenise('food is most important, skip dj').tokens).cut; // 'entertainment'
 */
export function readPriorities(tokens: readonly Token[]): PriorityReading {
  const priorities: RankableCategory[] = [];
  const prioritySpans: { start: number; end: number }[] = [];
  const cutSpans: { start: number; end: number }[] = [];
  let cut: RankableCategory | undefined;
  for (const clause of clauses(tokens)) {
    const [firstCategory, ...others] = findPhrases(clause.tokens, CATEGORIES).map(
      (match) => match.value,
    );
    if (firstCategory === undefined) continue;
    const span = { start: clause.start, end: clause.start + clause.tokens.length - 1 };
    if (cut === undefined && findPhrases(clause.tokens, CUT).length > 0) {
      cut = firstCategory;
      cutSpans.push(span);
    } else if (findPhrases(clause.tokens, PRIORITY).length > 0) {
      for (const category of [firstCategory, ...others]) {
        if (!priorities.includes(category)) priorities.push(category);
      }
      prioritySpans.push(span);
    }
  }
  const top = priorities.filter((category) => category !== cut).slice(0, MAX_PRIORITIES);
  return cut === undefined
    ? { priorities: top, prioritySpans, cutSpans }
    : { priorities: top, cut, prioritySpans, cutSpans };
}

/**
 * True when Latin-script text uses at least two different Hindi function words (Hinglish).
 * @example
 * isHinglish(tokenise('Beti ki shaadi Jaipur mein').tokens); // true
 */
export function isHinglish(tokens: readonly Token[]): boolean {
  const words = new Set(findPhrases(tokens, HINGLISH).map((match) => match.value));
  return words.size >= MIN_HINGLISH_WORDS;
}
