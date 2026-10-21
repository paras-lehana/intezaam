/**
 * Compact word-list helpers for the brief vocabulary tables.
 *
 * Responsibility: let each vocabulary table list its spellings on one line ("log logon लोग")
 * and group spellings by the value they mean, so the tables stay short and reviewable.
 * Boundary: string splitting only; folding and indexing happen in offline/tokens.ts.
 */

/** Spellings grouped by the value they mean: `[value, 'spelling spelling …']`. */
export type WordGroups<V> = readonly (readonly [V, string])[];

/** Multi-word phrases grouped by value: `[value, 'phrase one | phrase two']`. */
export type PhraseGroups<V> = readonly (readonly [V, string])[];

const WHITESPACE = /\s+/;
const PHRASE_SEPARATOR = '|';

/**
 * Splits a space-separated list of single-word spellings.
 * @example
 * words('log logon लोग'); // ['log', 'logon', 'लोग']
 */
export function words(list: string): readonly string[] {
  return list.split(WHITESPACE).filter((entry) => entry !== '');
}

/**
 * Splits a "|"-separated list of phrases (each may hold several words).
 * @example
 * phrases('per plate | per head'); // ['per plate', 'per head']
 */
export function phrases(list: string): readonly string[] {
  return list
    .split(PHRASE_SEPARATOR)
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
}

/**
 * Expands value groups into `[phrase, value]` pairs (phrases split on "|").
 * @example
 * expandGroups([[2, 'do | two']]); // [['do', 2], ['two', 2]]
 */
export function expandGroups<V>(groups: PhraseGroups<V>): (readonly [string, V])[] {
  return groups.flatMap(([value, list]) => phrases(list).map((phrase) => [phrase, value] as const));
}

/**
 * Expands value groups of single words (split on spaces).
 * @example
 * expandWordGroups([[2, 'do दो two']]); // [['do', 2], ['दो', 2], ['two', 2]]
 */
export function expandWordGroups<V>(groups: WordGroups<V>): (readonly [string, V])[] {
  return groups.flatMap(([value, list]) => words(list).map((word) => [word, value] as const));
}
