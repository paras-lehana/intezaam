/**
 * Couple hashtags (feature #31): "#Rahuti"-style blends of two first names, ported from
 * the owner's earlier planner (bio-bandish `invite_page.py` `hashtag_blends`, 01 §2).
 *
 * Responsibility: from two names typed by the user, build up to six hashtags — two name
 * blends ("Rahu" + "ti" → Rahuti, "Pre" + "hul" → Prehul), "AWedsB", "BWedsA", "AKiB" and
 * "ABForever" — each 3–30 letters, deduplicated, with a leading "#". A personalised idea
 * that costs no model call. Boundary: Latin letters only (as in the original); names in
 * other scripts give no blends rather than broken ones.
 */

const NON_LATIN_LETTER = /[^A-Za-z]/g;
/** Blends keep at least two letters of the first name (original rule). */
const MIN_HEAD_LETTERS = 2;
const TAIL_LETTERS = 2;
const MIN_TAG_LETTERS = 3;
/** Hashtags longer than 30 letters are unreadable on an invitation card. */
const MAX_TAG_LETTERS = 30;

function titleCase(name: string): string {
  const letters = name.replace(NON_LATIN_LETTER, '');
  return letters.length === 0
    ? ''
    : `${letters.charAt(0).toUpperCase()}${letters.slice(1).toLowerCase()}`;
}

/**
 * Hashtag suggestions for a couple.
 * @example
 * hashtagBlends('Rahul', 'Preeti');
 * // ['#Rahuti', '#Prehul', '#RahulWedsPreeti', '#PreetiWedsRahul', '#RahulKiPreeti', '#RahulPreetiForever']
 */
export function hashtagBlends(first: string, second: string): string[] {
  const a = titleCase(first);
  const b = titleCase(second);
  if (a === '' || b === '') return [];
  const blends = [
    a.slice(0, Math.max(MIN_HEAD_LETTERS, a.length - 1)) + b.slice(-TAIL_LETTERS).toLowerCase(),
    b.slice(0, Math.floor((b.length + 1) / 2)) +
      a.slice(-(Math.floor(a.length / 2) + 1)).toLowerCase(),
  ];
  const tags = [...blends, `${a}Weds${b}`, `${b}Weds${a}`, `${a}Ki${b}`, `${a}${b}Forever`].filter(
    (tag) => tag.length >= MIN_TAG_LETTERS && tag.length <= MAX_TAG_LETTERS,
  );
  return [...new Set(tags)].map((tag) => `#${tag}`);
}
