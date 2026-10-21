/**
 * Which register an English draft is written in.
 *
 * Responsibility: a brief typed as Hindi in Latin script ("shaadi mein 300 log") is read as
 * Hinglish by core; when the family then asks for an English draft, the request says so,
 * and the server writes Hinglish rather than formal English or Devanagari. Boundary: only
 * with English chosen — a draft in Hindi or any other language keeps that language's script.
 */
import type { LanguageCode } from '@intezaam/core/domain';
import type { DraftRequest } from '@intezaam/core/schemas';

/**
 * The `hinglish` part of a draft request: present only for English after a Hinglish brief.
 * @example
 * hinglishPart('en', true); // { hinglish: true }
 * hinglishPart('hi', true); // {}
 */
export function hinglishPart(
  language: LanguageCode,
  hinglish: boolean | undefined,
): Pick<DraftRequest, 'hinglish'> {
  return language === 'en' && hinglish === true ? { hinglish: true } : {};
}
