/**
 * Ask service — GenAI job 5 (Ask and change) behind POST /api/ask.
 *
 * Responsibility: recompute the plan from the posted context (never trusting client totals),
 * answer by rule first — refusals (booking, payment, legal advice), change commands ("add 50
 * guests") and common intents need no model call — and only otherwise ask the model with the
 * numbered plan facts. Core's `checkAskReply` then enforces the refusal, replaces an answer
 * whose numbers are not in the facts and validates any proposed patch, which the web applies
 * only after the user presses Apply. Boundary: orchestration only.
 */
import {
  type AskModelOutput,
  type AskRequest,
  type AskResponse,
  MAX_ANSWER_CHARS,
  MAX_QUESTION_CHARS,
  type Result,
  askByRules,
  askModelOutputSchema,
  askOffline,
  buildAskPrompt,
  buildPlan,
  checkAskReply,
  ok,
  summarisePlanFacts,
} from '@intezaam/core';
import { createProvenanceTracker } from './provenance.js';
import {
  type ServiceDeps,
  cacheKey,
  cleanUserText,
  createNonce,
  createResultCache,
  fromCache,
  tryModel,
} from './service-kit.js';

/** An answer is about 120 words plus a small patch. */
const ASK_MAX_OUTPUT_TOKENS = 2_048;

export interface AskService {
  ask(req: AskRequest, signal: AbortSignal): Promise<Result<AskResponse>>;
}

/** The wire shape of a reply (optional fields only when present). */
function toBody(reply: AskModelOutput): Omit<AskResponse, 'provenance'> {
  return {
    answer: reply.answer,
    sources: reply.sources,
    ...(reply.patch === undefined ? {} : { patch: reply.patch }),
    ...(reply.refusal === undefined ? {} : { refusal: reply.refusal }),
  };
}

/**
 * Creates the Ask service with its own cache.
 * @example
 * const asks = createAskService({ genai, now: Date.now, logger });
 */
export function createAskService(deps: ServiceDeps): AskService {
  const { now } = deps;
  const cache = createResultCache<AskModelOutput>(now);

  return {
    async ask(req, signal) {
      const tracker = createProvenanceTracker(now);
      const startedAt = now();
      const built = buildPlan(req.context, req.todayIso);
      if (!built.ok) return built;
      const plan = built.value;
      const question = cleanUserText(req.question, MAX_QUESTION_CHARS).text;
      // Efficiency: refusals, change commands and common intents are answered by code.
      const byRules = askByRules(question, plan, req.context, req.todayIso);
      tracker.rules('plan-and-rules', startedAt);
      if (byRules !== undefined)
        return ok({ ...toBody(byRules), provenance: tracker.build('offline') });

      const facts = summarisePlanFacts(plan);
      const history = req.history.map((turn) => ({
        question: cleanUserText(turn.question, MAX_QUESTION_CHARS).text,
        answer: cleanUserText(turn.answer, MAX_ANSWER_CHARS).text,
      }));
      const language = req.context.language;
      // The context and today fully determine the plan, its facts and which patches are valid.
      const key = cacheKey([
        'ask',
        req.todayIso,
        JSON.stringify(req.context),
        question,
        JSON.stringify(history),
      ]);
      const hit = fromCache(cache.get(key), tracker, now());
      if (hit !== undefined) return ok({ ...toBody(hit.value), provenance: hit.provenance });

      const prompt = buildAskPrompt({
        question,
        history,
        facts,
        todayIso: req.todayIso,
        language,
        nonce: createNonce(),
      });
      const reply = await tryModel(deps, tracker, 'answer', {
        system: prompt.systemInstruction,
        prompt: prompt.prompt,
        schema: askModelOutputSchema,
        maxOutputTokens: ASK_MAX_OUTPUT_TOKENS,
        signal,
      });
      const checkStartedAt = now();
      const checked =
        reply === undefined
          ? askOffline(question, plan, req.context, req.todayIso)
          : checkAskReply(reply, {
              question,
              plan,
              facts,
              context: req.context,
              todayIso: req.todayIso,
            }).reply;
      tracker.rules(reply === undefined ? 'answer-offline' : 'answer-check', checkStartedAt);
      const provenance = tracker.build(reply === undefined ? 'offline' : 'gemini');
      if (reply !== undefined) cache.set(key, { value: checked, provenance });
      return ok({ ...toBody(checked), provenance });
    },
  };
}
