/**
 * Event reader: family, kind, wedding functions and tradition from explicit words
 * (research note 09 §5.2.3–5.2.4).
 *
 * Responsibility: decide what is being celebrated — a 60th (Shashtiabdapurti) first, then a
 * community occasion (a festival word plus a community marker, or a gathering word such as
 * satsang or bhandara), then a wedding, a family function, a birthday (kind from the age),
 * or a get-together; "saalgirah" alone stays ambiguous. Functions are read for weddings in
 * the canonical order; a tradition only from a stated word, never from names or the city.
 * Boundary: each reader returns the value and the token span that proves it.
 */
import type { Premises } from '../domain/context-options.js';
import type { EventFamily, EventKind } from '../domain/events.js';
import { WEDDING_FUNCTION_KINDS, type FunctionKind } from '../domain/functions.js';
import type { Tradition } from '../domain/traditions.js';
import { buildPhraseIndex, findPhrases, type PhraseMatch, type Token } from './tokens.js';
import {
  AMBIGUOUS_ANNIVERSARY_WORDS,
  ANAND_KARAJ_WORDS,
  BIRTHDAY_WORDS,
  COMMUNITY_KIND_WORDS,
  COMMUNITY_WORDS,
  FAMILY_FUNCTION_WORDS,
  FAMILY_OF_FUNCTION,
  FUNCTION_WORDS,
  GET_TOGETHER_WORDS,
  PRIVATE_PREMISES_WORDS,
  PUBLIC_PREMISES_WORDS,
  RESIDENTIAL_WORDS,
  SIXTIETH_WORDS,
  TEEN_BIRTHDAY_PHRASES,
  WEDDING_FUNCTION_FALLBACK_WORDS,
  WEDDING_WORDS,
} from './vocab/events.js';
import { FESTIVAL_ANCHORS, FESTIVAL_KEYS } from './vocab/festivals.js';
import { TRADITION_WORDS } from './vocab/preferences.js';
import { expandGroups } from './vocab/word-list.js';

type CueName =
  | 'wedding'
  | 'birthday'
  | 'teen'
  | 'sixtieth'
  | 'community'
  | 'residential'
  | 'ambiguous'
  | 'gathering'
  | 'family-kind'
  | 'community-kind'
  | 'festival';

interface EventCue {
  readonly cue: CueName;
  readonly kind?: EventKind;
}

function cues(list: readonly string[], cue: CueName): (readonly [string, EventCue])[] {
  return list.map((phrase) => [phrase, { cue }] as const);
}

function kindCues(
  groups: readonly (readonly [EventKind, string])[],
  cue: CueName,
): (readonly [string, EventCue])[] {
  return expandGroups(groups).map(([phrase, kind]) => [phrase, { cue, kind }] as const);
}

// Efficiency: one combined index, folded once at load, so the longest phrase wins across
// tables ("shaadi ki saalgirah" is an anniversary, not a wedding).
const EVENT_CUES = buildPhraseIndex<EventCue>([
  ...cues(WEDDING_WORDS, 'wedding'),
  ...cues(BIRTHDAY_WORDS, 'birthday'),
  ...cues(TEEN_BIRTHDAY_PHRASES, 'teen'),
  ...cues(SIXTIETH_WORDS, 'sixtieth'),
  ...cues(COMMUNITY_WORDS, 'community'),
  ...cues(RESIDENTIAL_WORDS, 'residential'),
  ...cues(AMBIGUOUS_ANNIVERSARY_WORDS, 'ambiguous'),
  ...cues(GET_TOGETHER_WORDS, 'gathering'),
  ...kindCues(FAMILY_FUNCTION_WORDS, 'family-kind'),
  ...kindCues(COMMUNITY_KIND_WORDS, 'community-kind'),
  ...kindCues(
    FESTIVAL_KEYS.map((key) => [FESTIVAL_ANCHORS[key].communityKind, FESTIVAL_ANCHORS[key].names]),
    'festival',
  ),
]);
const FUNCTIONS = buildPhraseIndex(expandGroups(FUNCTION_WORDS));
const WEDDING_FALLBACK = buildPhraseIndex(
  WEDDING_FUNCTION_FALLBACK_WORDS.map((phrase) => [phrase, 'wedding'] as const),
);
const TRADITIONS = buildPhraseIndex(expandGroups(TRADITION_WORDS));
const ANAND_KARAJ = buildPhraseIndex(ANAND_KARAJ_WORDS.map((phrase) => [phrase, true] as const));
// Public land wins when a brief names both ("outside our society, on the main road").
const PREMISES_WORDS = buildPhraseIndex<Premises>([
  ...PUBLIC_PREMISES_WORDS.map((phrase) => [phrase, 'public'] as const),
  ...PRIVATE_PREMISES_WORDS.map((phrase) => [phrase, 'private'] as const),
  ...RESIDENTIAL_WORDS.map((phrase) => [phrase, 'private'] as const),
]);

/** Birthday kinds by age (04 §5.2 bands): 1 first, up to 12 kids, 13–17 teen, then milestone. */
const FIRST_BIRTHDAY_AGE = 1;
const LAST_KIDS_AGE = 12;
const LAST_TEEN_AGE = 17;
const SIXTIETH_AGE = 60;

export interface EventReading {
  readonly family?: EventFamily;
  readonly kind?: EventKind;
  /** Token spans that prove the family and kind (the evidence quotes). */
  readonly spans: readonly PhraseMatch<unknown>[];
}

/**
 * The birthday kind for an age, or undefined without an age (the form asks).
 * @example
 * birthdayKindForAge(7); // 'kids-birthday'
 */
export function birthdayKindForAge(age: number | undefined): EventKind | undefined {
  if (age === undefined) return undefined;
  if (age === SIXTIETH_AGE) return 'sixtieth-birthday';
  if (age <= FIRST_BIRTHDAY_AGE) return 'first-birthday';
  if (age <= LAST_KIDS_AGE) return 'kids-birthday';
  return age <= LAST_TEEN_AGE ? 'teen-birthday' : 'milestone-birthday';
}

function cueOf(
  matches: readonly PhraseMatch<EventCue>[],
  cue: CueName,
): PhraseMatch<EventCue> | undefined {
  return matches.find((match) => match.value.cue === cue);
}

function reading(
  family: EventFamily,
  kind: EventKind | undefined,
  ...spans: (PhraseMatch<EventCue> | undefined)[]
): EventReading {
  const proven = spans.filter((span) => span !== undefined);
  return kind === undefined ? { family, spans: proven } : { family, kind, spans: proven };
}

/**
 * Community: a gathering word, or a festival plus a community marker ("mandal", "RWA"). A
 * festival inside a housing society is a society festival even with a pandal (09 §5.5).
 */
function communityReading(matches: readonly PhraseMatch<EventCue>[]): EventReading | undefined {
  const named = cueOf(matches, 'community-kind');
  const festival = cueOf(matches, 'festival');
  const residential = cueOf(matches, 'residential');
  const marker = residential ?? cueOf(matches, 'community');
  if (festival !== undefined && marker !== undefined) {
    const pandal = named?.value.kind === 'festival-pandal' ? named : undefined;
    const kind = pandal?.value.kind ?? festival.value.kind;
    const inSociety = residential !== undefined && kind === 'festival-pandal';
    return reading('community', inSociety ? 'society-festival' : kind, festival, marker, pandal);
  }
  return named === undefined ? undefined : reading('community', named.value.kind, named);
}

/**
 * Family and kind from explicit event words; `age` (from "7th", "saatvaan") picks the
 * birthday kind.
 * @example
 * readEvent(tokenise('dhai sau mehmaan, sagai').tokens, undefined); // family-function, engagement
 */
export function readEvent(tokens: readonly Token[], age: number | undefined): EventReading {
  const matches = findPhrases(tokens, EVENT_CUES);
  const sixtieth = cueOf(matches, 'sixtieth');
  if (sixtieth !== undefined) return reading('birthday', 'sixtieth-birthday', sixtieth);
  const community = communityReading(matches);
  if (community !== undefined) return community;
  const wedding = cueOf(matches, 'wedding');
  if (wedding !== undefined) return reading('wedding', 'wedding', wedding);
  const familyKind = cueOf(matches, 'family-kind');
  // A puja is a family function only at family scale; in a society it is a gathering (09 §5.2.3).
  const marker = cueOf(matches, 'residential') ?? cueOf(matches, 'community');
  if (familyKind?.value.kind === 'home-puja' && marker !== undefined)
    return reading('community', 'religious-gathering', familyKind, marker);
  if (familyKind !== undefined)
    return reading('family-function', familyKind.value.kind, familyKind);
  const teen = cueOf(matches, 'teen');
  if (teen !== undefined) return reading('birthday', 'teen-birthday', teen);
  const birthday = cueOf(matches, 'birthday');
  if (birthday !== undefined) return reading('birthday', birthdayKindForAge(age), birthday);
  const gathering = cueOf(matches, 'gathering');
  if (gathering !== undefined) return reading('family-function', undefined, gathering);
  // A wedding function alone ("haldi aur mehendi") still names a wedding.
  const [functionWord] = findPhrases(tokens, FUNCTIONS);
  const implied = functionWord === undefined ? undefined : FAMILY_OF_FUNCTION[functionWord.value];
  return implied === undefined || functionWord === undefined
    ? { spans: [] }
    : { family: implied, kind: 'wedding', spans: [functionWord] };
}

/**
 * Wedding functions in canonical order; the bare word "wedding" counts only beside others.
 * @example
 * readFunctions(tokenise('mehendi, sangeet, wedding and reception').tokens).kinds;
 * // ['mehendi', 'sangeet', 'wedding', 'reception']
 */
export function readFunctions(tokens: readonly Token[]): {
  kinds: FunctionKind[];
  spans: PhraseMatch<FunctionKind>[];
} {
  const named = findPhrases(tokens, FUNCTIONS);
  const spans = named.length === 0 ? [] : [...named, ...findPhrases(tokens, WEDDING_FALLBACK)];
  const found = new Set(spans.map((span) => span.value));
  return { kinds: WEDDING_FUNCTION_KINDS.filter((kind) => found.has(kind)), spans };
}

/**
 * A stated wedding tradition, or undefined (never inferred from a surname or the city).
 * @example
 * readTradition(tokenise('Sharma ji ki beti ki shaadi').tokens); // undefined
 */
export function readTradition(tokens: readonly Token[]): PhraseMatch<Tradition> | undefined {
  const [match] = findPhrases(tokens, TRADITIONS);
  return match;
}

/**
 * Where a community event happens, from stated words; public land wins over a compound.
 * @example
 * readPremises(tokenise('pandal in the compound').tokens)?.value; // 'private'
 */
export function readPremises(tokens: readonly Token[]): PhraseMatch<Premises> | undefined {
  const found = findPhrases(tokens, PREMISES_WORDS);
  return found.find((match) => match.value === 'public') ?? found[0];
}

/**
 * The word that makes a Punjabi or Sikh wedding an Anand Karaj ("Sikh", "gurdwara"), if any.
 * @example
 * readAnandKaraj(tokenise('Punjabi shaadi in Ludhiana').tokens); // undefined
 */
export function readAnandKaraj(tokens: readonly Token[]): PhraseMatch<true> | undefined {
  const [match] = findPhrases(tokens, ANAND_KARAJ);
  return match;
}
