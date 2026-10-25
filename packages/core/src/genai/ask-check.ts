/**
 * Reply check for GenAI job 5 (Ask and change): the model's answer passes through the
 * same rules the offline assistant follows (GENAI_ARCHITECTURE.md, job 5 guardrails).
 *
 * Responsibility: a question code must refuse is refused whatever the model said; a
 * proposed patch survives only through applyAskPatch; an answer may state only numbers from
 * the plan facts, the user's own question or the surviving patch, or it is replaced by the
 * rule-based answer (the Apply prompt when a change survives); sources are deduplicated.
 * Boundary: pure; the patch is applied only after the user presses Apply.
 */
import { withoutUndefined } from '../objects.js';
import { askOffline, PATCH_ANSWER, REFUSAL_ANSWERS } from '../offline/ask.js';
import type { EventContext } from '../schemas/context.js';
import type { PlanFact } from '../schemas/diff.js';
import type { AskModelOutput } from '../schemas/model-outputs.js';
import type { ContextPatch } from '../schemas/patch.js';
import type { Plan } from '../schemas/plan.js';
import { applyAskPatch, detectRefusal } from './ask-guard.js';
import { factNumbers, isFaithful, numbersAllowedBy } from './faithfulness.js';

export interface AskCheckInput {
  readonly question: string;
  readonly plan: Plan;
  readonly facts: readonly PlanFact[];
  readonly context: EventContext;
  readonly todayIso: string;
}

export interface AskCheckResult {
  readonly reply: AskModelOutput;
  /** What code changed: "refusal", "answer", "patch". */
  readonly corrected: string[];
}

/**
 * The numbers an answer may state: the plan facts, the user's own question ("guests 250 kar
 * do") and the values of the change that survived the guard (a new date's digits included).
 */
function allowedNumbers(input: AskCheckInput, patch: ContextPatch | undefined): Set<number> {
  const patchText = (patch?.ops ?? []).map((op) => String(op.value)).join(' ');
  return new Set([
    ...factNumbers(input.facts),
    ...numbersAllowedBy(input.question),
    ...numbersAllowedBy(patchText),
  ]);
}

/**
 * Checks a model reply to an Ask question.
 * @example
 * checkAskReply(reply, { question, plan, facts, context, todayIso }).corrected; // [] when clean
 */
export function checkAskReply(reply: AskModelOutput, input: AskCheckInput): AskCheckResult {
  const refusal = detectRefusal(input.question);
  if (refusal !== undefined) {
    const corrected = reply.refusal?.reason === refusal ? [] : ['refusal'];
    return {
      reply: { answer: REFUSAL_ANSWERS[refusal], sources: [], refusal: { reason: refusal } },
      corrected,
    };
  }
  const corrected: string[] = [];
  const patch =
    reply.patch === undefined
      ? undefined
      : applyAskPatch(reply.patch, input.context, input.todayIso);
  const faithful = isFaithful(reply.answer, allowedNumbers(input, patch));
  if (!faithful) corrected.push('answer');
  if (reply.patch !== undefined && patch?.ops.length !== reply.patch.ops.length)
    corrected.push('patch');
  const ruled = (): string =>
    patch === undefined
      ? askOffline(input.question, input.plan, input.context, input.todayIso).answer
      : PATCH_ANSWER;
  const answer = faithful ? reply.answer : ruled();
  return {
    reply: {
      answer,
      sources: [...new Set(reply.sources)],
      ...withoutUndefined({ patch, refusal: reply.refusal }),
    },
    corrected,
  };
}
