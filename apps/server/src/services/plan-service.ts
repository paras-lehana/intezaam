/**
 * Plan service — the deterministic plan plus GenAI job 2 (plan narrator) behind POST /api/plan
 * (plan and narration, for API clients) and POST /api/plan/narration (narration only, for the
 * browser, which has already built the same plan).
 *
 * Responsibility: build the plan with the core engine (code decides every number), summarise
 * it into numbered facts, serve a narration for the same facts from cache, or make ONE model
 * call; then the faithfulness guard swaps any sentence with a number that is not in the facts
 * for the template, and the idea guard drops ideas that break the diet, alcohol or money
 * limits and attaches cost bands and YouTube links. When no model answers, the offline
 * narrator writes the same shape. Both routes share one pipeline and one cache. Boundary:
 * orchestration only; the engine, prompts and guards live in core.
 */
import {
  IDEAS_LIBRARY,
  MIN_IDEAS,
  type Narration,
  type NarrationModelOutput,
  type NarrationResponse,
  type PlanRequest,
  type PlanResponse,
  type Result,
  buildNarrationPrompt,
  buildPlan,
  checkNarrationFaithfulness,
  constraintLines,
  enforceIdeaConstraints,
  ideaConstraintsFor,
  narrateOffline,
  narrationModelOutputSchema,
  narrationPlanBlock,
  ok,
  summarisePlanFacts,
} from '@intezaam/core';
import { createProvenanceTracker } from './provenance.js';
import {
  type ServiceDeps,
  cacheKey,
  createNonce,
  createResultCache,
  fromCache,
  tryModel,
} from './service-kit.js';

/** Twelve ideas of about 40 words plus the summary; Indic scripts need several times more tokens. */
const NARRATION_MAX_OUTPUT_TOKENS = 8_192;

/** Efficiency: built once — the curated cost band of every library idea, by title. */
const LIBRARY_BANDS = new Map(IDEAS_LIBRARY.map((idea) => [idea.title, idea.costBand]));

type Constraints = ReturnType<typeof ideaConstraintsFor>;

export interface PlanService {
  /** The engine's plan with its narration (POST /api/plan). */
  plan(req: PlanRequest, signal: AbortSignal): Promise<Result<PlanResponse>>;
  /** The narration alone (POST /api/plan/narration): same pipeline, same cache. */
  narrate(req: PlanRequest, signal: AbortSignal): Promise<Result<NarrationResponse>>;
}

/**
 * The narration as returned: model (or template) text plus guarded ideas. When the diet guard
 * leaves fewer than six model ideas, curated ideas that pass the same guard top the board up.
 */
function finishNarration(
  text: NarrationModelOutput,
  fallback: NarrationModelOutput,
  constraints: Constraints,
): Narration {
  const guarded = enforceIdeaConstraints(text.ideas, constraints, LIBRARY_BANDS).ideas;
  const titles = new Set(guarded.map((idea) => idea.title));
  const spare = enforceIdeaConstraints(
    fallback.ideas.filter((idea) => !titles.has(idea.title)),
    constraints,
    LIBRARY_BANDS,
  ).ideas;
  const ideas = [...guarded, ...spare.slice(0, Math.max(0, MIN_IDEAS - guarded.length))];
  return { ...text, ideas };
}

/**
 * Creates the plan service with its narration cache.
 * @example
 * const plans = createPlanService({ genai, now: Date.now, logger });
 */
export function createPlanService(deps: ServiceDeps): PlanService {
  const { now } = deps;
  const cache = createResultCache<Narration>(now);

  /** The whole job: engine first, then the cached or freshly guarded narration. */
  async function planAndNarrate(
    req: PlanRequest,
    signal: AbortSignal,
  ): Promise<Result<PlanResponse>> {
    const tracker = createProvenanceTracker(now);
    const engineStartedAt = now();
    const built = buildPlan(req.context, req.todayIso);
    if (!built.ok) return built;
    const plan = built.value;
    const facts = summarisePlanFacts(plan);
    const constraints = ideaConstraintsFor(plan, req.context);
    const language = req.context.language;
    tracker.rules('plan-engine', engineStartedAt);

    // Efficiency: the narration depends only on what the model is shown, so equal facts,
    // constraints and language reuse it (one model call per distinct plan).
    const key = cacheKey([
      'narration',
      language,
      narrationPlanBlock(plan, facts),
      constraintLines(constraints),
    ]);
    const hit = fromCache(cache.get(key), tracker, now());
    if (hit !== undefined) return ok({ plan, narration: hit.value, provenance: hit.provenance });

    const prompt = buildNarrationPrompt({
      plan,
      facts,
      constraints,
      language,
      nonce: createNonce(),
    });
    const reply = await tryModel(deps, tracker, 'narrate', {
      system: prompt.systemInstruction,
      prompt: prompt.prompt,
      schema: narrationModelOutputSchema,
      maxOutputTokens: NARRATION_MAX_OUTPUT_TOKENS,
      signal,
    });
    const guardStartedAt = now();
    const fallback = narrateOffline(plan, req.context);
    const text =
      reply === undefined
        ? fallback
        : checkNarrationFaithfulness(reply, plan, facts, fallback, language).narration;
    const narration = finishNarration(text, fallback, constraints);
    tracker.rules(
      reply === undefined ? 'narrate-offline' : 'faithfulness-and-idea-guard',
      guardStartedAt,
    );
    const provenance = tracker.build(reply === undefined ? 'offline' : 'gemini');
    if (reply !== undefined) cache.set(key, { value: narration, provenance });
    return ok({ plan, narration, provenance });
  }

  return {
    plan: planAndNarrate,
    async narrate(req, signal) {
      const result = await planAndNarrate(req, signal);
      if (!result.ok) return result;
      // Efficiency: the browser already holds this plan (it ran the same engine on the same
      // context), so only the narration and its provenance go back — a few hundred bytes
      // instead of about 100 kB of plan JSON for a wedding, on every plan version.
      const { narration, provenance } = result.value;
      return ok({ narration, provenance });
    },
  };
}
