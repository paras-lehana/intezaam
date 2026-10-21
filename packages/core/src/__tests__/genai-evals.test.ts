/**
 * AI evaluation harness (GENAI_ARCHITECTURE.md): the labelled battery run through the code guards
 * with scripted model outputs, offline and deterministic.
 *
 * Responsibility: score each guard against the reviewer's labels — faithfulness (every
 * invented number caught, no faithful sentence replaced), id validity, diet and alcohol
 * compliance, refusal recall and precision, language match and evidence grounding — and
 * require a perfect score, listing every miss by name. Boundary: scripted outputs only;
 * live runs against the model use the same battery through the server.
 */
import { describe, expect, it } from 'vitest';
import { validateBriefDraft } from '../genai/brief-guard.js';
import { detectRefusal } from '../genai/ask-guard.js';
import { checkNarrationFaithfulness } from '../genai/faithfulness.js';
import { ideaConstraintsFor } from '../genai/idea-constraints.js';
import { enforceIdeaConstraints } from '../genai/idea-guard.js';
import { matchesLanguageScript } from '../genai/script-check.js';
import { narrateOffline } from '../offline/narrate.js';
import type { NarrationModelOutput } from '../schemas/model-outputs.js';
import {
  DIET_CASES,
  EVIDENCE_CASES,
  FAITHFULNESS_CASES,
  ID_CASES,
  LANGUAGE_CASES,
  REFUSAL_CASES,
} from './fixtures/eval-battery.js';
import { planned, TODAY } from './fixtures/genai-plans.js';

/** Labels where the guard disagreed with the reviewer. */
function misses<T>(
  cases: readonly T[],
  agrees: (item: T) => boolean,
  name: (item: T) => string,
): string[] {
  return cases.filter((item) => !agrees(item)).map(name);
}

describe('AI evaluation battery', () => {
  const { plan, context, facts } = planned('jaipur-wedding');
  const fallback = narrateOffline(plan, context);
  const narrate = (reply: NarrationModelOutput): ReturnType<typeof checkNarrationFaithfulness> =>
    checkNarrationFaithfulness(reply, plan, facts, fallback, 'en');

  it('faithfulness: catches every invented number and keeps every faithful sentence', () => {
    const missed = misses(
      FAITHFULNESS_CASES,
      (item) =>
        narrate({ ...fallback, summary: item.text(plan) }).replaced.includes('summary') ===
        !item.faithful,
      (item) => item.text(plan),
    );
    expect(missed).toEqual([]);
    expect(FAITHFULNESS_CASES.filter((item) => !item.faithful).length).toBeGreaterThanOrEqual(5);
  });

  it('id validity: keeps cited trace ids that exist and drops invented ones', () => {
    const missed = misses(
      ID_CASES,
      (item) => {
        const id = item.id(plan);
        const kept = narrate({
          ...fallback,
          reasons: [{ traceId: id, text: 'Because of the plan.' }],
        }).narration.reasons;
        return (kept.length === 1) === item.valid;
      },
      (item) => item.id(plan),
    );
    expect(missed).toEqual([]);
  });

  it('diet compliance: every labelled idea is kept or refused as the reviewer says', () => {
    const base = ideaConstraintsFor(plan, context);
    const missed = misses(
      DIET_CASES,
      (item) => {
        const idea = {
          category: 'menu' as const,
          title: item.title,
          description: item.title,
          whyItFits: { signal: 'diet' as const, text: 'Fits the menu.' },
          effort: 'low' as const,
          eco: false,
          youtubeQuery: 'party food ideas',
        };
        const constraints = {
          ...base,
          menu: item.menu,
          satvik: false,
          tight: false,
          alcoholAllowed: item.alcoholAllowed,
        };
        return (enforceIdeaConstraints([idea], constraints).ideas.length === 1) === item.allowed;
      },
      (item) => `${item.title} (${item.menu}, alcohol ${String(item.alcoholAllowed)})`,
    );
    expect(missed).toEqual([]);
  });

  it('refusal recall and precision: refuses with the right reason and answers the rest', () => {
    const missed = misses(
      REFUSAL_CASES,
      (item) => detectRefusal(item.question) === item.refusal,
      (item) => item.question,
    );
    expect(missed).toEqual([]);
    const refusals = REFUSAL_CASES.filter((item) => item.refusal !== undefined).length;
    expect(refusals).toBeGreaterThan(0);
    expect(REFUSAL_CASES.length - refusals).toBeGreaterThan(0);
  });

  it('language match: the script check agrees with the reviewer', () => {
    const missed = misses(
      LANGUAGE_CASES,
      (item) => matchesLanguageScript(item.text, item.language) === item.matches,
      (item) => `${item.language}: ${item.text}`,
    );
    expect(missed).toEqual([]);
  });

  it('evidence: grounded claims survive with code-parsed numbers; the rest are refused', () => {
    const missed = misses(
      EVIDENCE_CASES,
      (item) => {
        const { draft } = validateBriefDraft(
          { evidence: [], missing: [], understood: '', ...item.reply },
          item.brief,
          TODAY,
        );
        const held = new Map(Object.entries(draft));
        const keptAll = Object.entries(item.kept).every(
          ([key, value]) => JSON.stringify(held.get(key)) === JSON.stringify(value),
        );
        return keptAll && item.refused.every((key) => draft[key] === undefined);
      },
      (item) => item.name,
    );
    expect(missed).toEqual([]);
  });
});
