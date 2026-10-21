/**
 * Script check for GenAI jobs 2 and 4 (synthesis §5 guardrails "script check against the
 * chosen language"): a Hindi narration or message must be written in Devanagari, a Tamil
 * one in Tamil script, and so on.
 *
 * Responsibility: count the letters of a model text and accept it when at least half are in
 * the chosen language's script. Names, city names and words such as "GST" stay in the Latin
 * script inside an Indic sentence, so the rule is a share, not "every letter".
 * Boundary: pure; it says nothing about grammar or meaning, only the writing system.
 */
import type { LanguageCode } from '../domain/languages.js';

/** The Unicode script each output language is written in (Marathi shares Devanagari with Hindi). */
const LANGUAGE_SCRIPTS: Readonly<Record<LanguageCode, RegExp>> = {
  en: /\p{Script=Latin}/u,
  hi: /\p{Script=Devanagari}/u,
  mr: /\p{Script=Devanagari}/u,
  bn: /\p{Script=Bengali}/u,
  ta: /\p{Script=Tamil}/u,
  te: /\p{Script=Telugu}/u,
  gu: /\p{Script=Gujarati}/u,
  kn: /\p{Script=Kannada}/u,
  or: /\p{Script=Oriya}/u,
  ml: /\p{Script=Malayalam}/u,
  pa: /\p{Script=Gurmukhi}/u,
};

const LETTER = /\p{L}/gu;

/**
 * At least half of the letters must be in the language's script (grade D threshold: a Hindi
 * message naming "Jaipur", "GST" and "Haldi, Mehendi" is still well above it).
 */
export const MIN_SCRIPT_SHARE = 0.5;

/**
 * True when the text is mostly written in the language's script (a text with no letters passes).
 * @example
 * matchesLanguageScript('जयपुर में शादी', 'hi'); // true
 * matchesLanguageScript('Wedding in Jaipur', 'hi'); // false
 */
export function matchesLanguageScript(text: string, language: LanguageCode): boolean {
  const letters = text.match(LETTER) ?? [];
  if (letters.length === 0) return true;
  const script = LANGUAGE_SCRIPTS[language];
  const inScript = letters.filter((letter) => script.test(letter)).length;
  return inScript >= letters.length * MIN_SCRIPT_SHARE;
}
