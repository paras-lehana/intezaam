/**
 * Reply check for GenAI job 5 (Ask and change): the model's answer passes through the
 * same rules the offline assistant follows (GENAI_ARCHITECTURE.md, job 5 guardrails).
 *
 * Responsibility: a question code must refuse is refused whatever the model said; an
 * answer with a number that is not in the plan facts is replaced by the rule-based answer;
 * a proposed patch survives only through applyAskPatch; sources are deduplicated.
 * Boundary: pure; the patch is applied only after the user presses Apply.
 */
import { askOffline, REFUSAL_ANSWERS } from '../offline/ask.js';
import type { EventContext } from '../schemas/context.js';
import type { PlanFact } from '../schemas/diff.js';
import type { AskModelOutput } from '../schemas/model-outputs.js';
import type { Plan } from '../schemas/plan.js';
import { applyAskPatch, detectRefusal } from './ask-guard.js';
import { factNumbers, isFaithful } from './faithfulness.js';

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
  const faithful = isFaithful(reply.answer, factNumbers(input.facts));
  if (!faithful) corrected.push('answer');
  const answer = faithful
    ? reply.answer
    : askOffline(input.question, input.plan, input.context, input.todayIso).answer;
  const patch =
    reply.patch === undefined
      ? undefined
      : applyAskPatch(reply.patch, input.context, input.todayIso);
  if (reply.patch !== undefined && patch?.ops.length !== reply.patch.ops.length)
    corrected.push('patch');
  return {
    reply: {
      answer,
      sources: [...new Set(reply.sources)],
      ...(patch === undefined ? {} : { patch }),
      ...(reply.refusal === undefined ? {} : { refusal: reply.refusal }),
    },
    corrected,
  };
}
