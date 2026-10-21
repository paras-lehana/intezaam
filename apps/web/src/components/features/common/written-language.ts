/**
 * Which language a generated text is written in, for its `lang` attribute (WCAG 3.1.2).
 *
 * Responsibility: every model prompt carries core's language rule ("Write every sentence in
 * Tamil"), and the server hands a reply in the wrong script to the offline planner instead,
 * so a Gemini answer is in the plan's chosen language. The offline planner writes English,
 * and its message templates also write Hindi. One closed table says which languages each
 * offline job writes, so a screen reader voices each answer in its own language and the
 * `:lang()` font rules apply. Boundary: one tag per response — the server does not mark the
 * odd template sentence it swaps into a Gemini narration, so that sentence keeps the
 * response's tag.
 */
import { DEFAULT_LANGUAGE, LANGUAGES, type LanguageCode } from '@intezaam/core/domain';
import type { Provenance } from '@intezaam/core/schemas';

/** Plain answers (narration, ideas, Ask, quote notes) or a drafted message. */
export type WrittenKind = 'answer' | 'draft';

/**
 * What the offline planner can write per kind: core's narrator, Ask rules and quote reader
 * write English; its message templates (offline `draftRegister`) write Hindi or English.
 */
const OFFLINE_LANGUAGES: Readonly<Record<WrittenKind, readonly LanguageCode[]>> = {
  answer: [DEFAULT_LANGUAGE],
  draft: [DEFAULT_LANGUAGE, 'hi'],
};

/**
 * The language a response is written in: the chosen one from Gemini, or what the offline
 * planner can write (English otherwise).
 * @example
 * writtenLanguage(geminiProvenance, 'ta'); // 'ta'
 * writtenLanguage(offlineProvenance, 'ta'); // 'en'
 * writtenLanguage(offlineProvenance, 'hi', 'draft'); // 'hi'
 */
export function writtenLanguage(
  provenance: Provenance | undefined,
  chosen: LanguageCode,
  kind: WrittenKind = 'answer',
): LanguageCode {
  if (provenance?.mode === 'gemini' || OFFLINE_LANGUAGES[kind].includes(chosen)) return chosen;
  return DEFAULT_LANGUAGE;
}

/**
 * The BCP-47 tag for a response's `lang` attribute.
 * @example
 * writtenLang(geminiProvenance, 'hi'); // 'hi-IN'
 * writtenLang(undefined, 'hi'); // 'en-IN' — nothing from the model yet
 */
export function writtenLang(
  provenance: Provenance | undefined,
  chosen: LanguageCode,
  kind: WrittenKind = 'answer',
): string {
  return LANGUAGES[writtenLanguage(provenance, chosen, kind)].bcp47;
}
