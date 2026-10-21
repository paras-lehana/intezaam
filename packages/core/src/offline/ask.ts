/**
 * Offline twin of GenAI job 5 (Ask and change): the same `AskModelOutput` the model
 * returns, from code rules only (GENAI_ARCHITECTURE.md, job 5).
 *
 * Responsibility: in order — refuse booking, payment, legal and off-scope questions; turn a
 * change request into a validated patch the user can apply; answer common intents from the
 * plan; otherwise point to the What-if panel. `askByRules` covers only the first two steps,
 * the ones a model must never override, so a configured model still answers every planning
 * question (with `answerByIntent` available as a code-computed hint) and `askOffline` is
 * the full no-model twin. Boundary: pure.
 */
import { applyAskPatch, detectRefusal, type RefusalReason } from '../genai/ask-guard.js';
import type { EventContext } from '../schemas/context.js';
import type { AskModelOutput } from '../schemas/model-outputs.js';
import type { Plan } from '../schemas/plan.js';
import { parseAskCommand } from './ask-commands.js';
import { answerByIntent } from './ask-intents.js';

/** What a refusal says instead: kind, and pointing to what the user can do themselves. */
export const REFUSAL_ANSWERS: Readonly<Record<RefusalReason, string>> = {
  'booking-or-payment':
    "I can't book, pay or contact vendors for you. The Vendors tab lists what to ask and when to book, and the Share tab drafts an enquiry you can send yourself.",
  'legal-advice':
    "I can't give legal advice. The Safety tab lists the permissions and rules that usually apply; please verify them with your local police or municipal office.",
  'off-scope':
    'I can only help with planning this celebration: budget, dates, vendors, guests, food, permissions and safety.',
};

const PATCH_ANSWER =
  'I can make this change for you. Press Apply to see the new plan and what changed before you keep it.';

const FALLBACK_ANSWER =
  'I can answer questions about your budget, timeline, vendors, guests, food, permissions and risks. To test a change, use the What-if panel or ask, for example, "add 50 guests".';

/**
 * Answers by rule only when code must decide (a refusal or a valid change request);
 * undefined when the question is for the model, or offline for the intents. It takes the
 * same arguments as `askOffline`, but these two rules never depend on the plan.
 * @example
 * askByRules('pay the caterer advance', plan, context, '2026-10-20')?.refusal?.reason; // 'booking-or-payment'
 */
export function askByRules(
  question: string,
  _plan: Plan,
  context: EventContext,
  todayIso: string,
): AskModelOutput | undefined {
  const refusal = detectRefusal(question);
  if (refusal !== undefined) {
    return { answer: REFUSAL_ANSWERS[refusal], sources: [], refusal: { reason: refusal } };
  }
  const patch = applyAskPatch(
    { ops: parseAskCommand(question, context, todayIso) },
    context,
    todayIso,
  );
  return patch === undefined ? undefined : { answer: PATCH_ANSWER, sources: ['verdict'], patch };
}

/**
 * Answers with no model: the rules, the intent answer, then a pointer to the What-if panel.
 * @example
 * askOffline('add 50 guests', plan, context, '2026-10-20').patch?.ops[0]?.op; // 'setGuests'
 */
export function askOffline(
  question: string,
  plan: Plan,
  context: EventContext,
  todayIso: string,
): AskModelOutput {
  const ruled = askByRules(question, plan, context, todayIso);
  if (ruled !== undefined) return ruled;
  const intent = answerByIntent(question, plan);
  return intent === undefined
    ? { answer: FALLBACK_ANSWER, sources: [] }
    : { answer: intent.answer, sources: intent.sources };
}
