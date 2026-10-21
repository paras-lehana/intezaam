/**
 * Draft check for GenAI job 4: a model-written message may only use the draft facts and
 * must be in the language the user chose (synthesis §5 job 4 guardrails).
 *
 * Responsibility: every number and date in the subject and body must come from the facts
 * (or the host's own typed name); no links, emails or phone numbers may appear; the body
 * must be written in the chosen language's script (fact values copied as they are, such as
 * English vendor questions, do not count). Otherwise the offline template for the
 * same kind replaces the draft. The language and the facts-used list are set by code,
 * never taken from the model. Boundary: pure.
 */
import type { LanguageCode } from '../domain/languages.js';
import { factsUsedIn, withoutFactValues } from '../offline/drafts.js';
import type { DraftModelOutput } from '../schemas/model-outputs.js';
import { draftFactLines, type DraftFacts } from './draft-facts.js';
import { isFaithful, numbersAllowedBy } from './faithfulness.js';
import { hasLinkOrContact } from './idea-guard.js';
import { matchesLanguageScript } from './script-check.js';

export const DRAFT_REPLACEMENT_REASONS = [
  'link-or-contact',
  'unfaithful-number',
  'wrong-script',
] as const;

export type DraftReplacementReason = (typeof DRAFT_REPLACEMENT_REASONS)[number];

export interface DraftCheckResult {
  readonly draft: DraftModelOutput;
  /** Why the model's draft was replaced by the template, if it was. */
  readonly replacedBecause?: DraftReplacementReason;
}

/**
 * Checks a draft against its facts and language; a failing draft becomes `fallback` (the template).
 * @example
 * checkDraftFaithfulness(reply, facts, draftOffline(input, facts), 'hi').replacedBecause; // undefined when clean
 */
export function checkDraftFaithfulness(
  draft: DraftModelOutput,
  facts: DraftFacts,
  fallback: DraftModelOutput,
  language: LanguageCode,
): DraftCheckResult {
  const text = `${draft.subject ?? ''}\n${draft.body}`;
  const allowed = numbersAllowedBy(`${draftFactLines(facts)}\n${facts.hostName ?? ''}`);
  if (hasLinkOrContact(text)) return { draft: fallback, replacedBecause: 'link-or-contact' };
  if (!isFaithful(text, allowed)) return { draft: fallback, replacedBecause: 'unfaithful-number' };
  if (!matchesLanguageScript(withoutFactValues(draft.body, facts), language)) {
    return { draft: fallback, replacedBecause: 'wrong-script' };
  }
  return { draft: { ...draft, language, factsUsed: factsUsedIn(text, facts) } };
}
