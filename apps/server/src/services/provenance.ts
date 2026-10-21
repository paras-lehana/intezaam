/**
 * Provenance tracking for one request.
 *
 * Responsibility: record which engine handled each pipeline step (a named model, the rules,
 * or the cache) and how long it took, plus why the offline twin answered when it did (the
 * core `reason` field), so every AI response can show exactly how it was produced.
 * Boundary: timing and engine names only — no request content is recorded.
 */
import { CACHE_ENGINE, type EngineMode, type OfflineReason, type Provenance } from '@intezaam/core';

/** Engine label for deterministic, rule-based steps. */
export const RULES_ENGINE = 'rules';

/** Engine label for a result served from the LRU cache (shared with the web badge). */
export { CACHE_ENGINE };

export interface ProvenanceTracker {
  /** Records a step handled by a named model (its name is also listed under `models`). */
  model(name: string, model: string, ms: number): void;
  /** Records a deterministic step, timing it from `startedAt`. */
  rules(name: string, startedAt: number): void;
  /** Records a cache hit: the cached result's models, plus the lookup as a step. */
  cacheHit(cached: Provenance, startedAt: number): void;
  /** Records why no model answered (daily quota, upstream error or not configured). */
  fallback(reason: OfflineReason): void;
  /** The provenance; `reason` is set only on an offline answer after a recorded fallback. */
  build(mode: EngineMode): Provenance;
}

/**
 * Creates a tracker whose total latency is measured from creation.
 * @example
 * const tracker = createProvenanceTracker(Date.now); tracker.build('offline');
 */
export function createProvenanceTracker(now: () => number): ProvenanceTracker {
  const startedAt = now();
  const steps: { name: string; engine: string; ms: number }[] = [];
  const models: string[] = [];
  let reason: OfflineReason | undefined;
  const elapsed = (from: number): number => Math.max(0, Math.round(now() - from));
  const addModel = (model: string): void => {
    if (!models.includes(model)) models.push(model);
  };

  return {
    model(name, model, ms) {
      steps.push({ name, engine: model, ms: Math.max(0, Math.round(ms)) });
      addModel(model);
    },
    rules(name, stepStartedAt) {
      steps.push({ name, engine: RULES_ENGINE, ms: elapsed(stepStartedAt) });
    },
    cacheHit(cached, stepStartedAt) {
      cached.models.forEach(addModel);
      steps.push({ name: 'cache-hit', engine: CACHE_ENGINE, ms: elapsed(stepStartedAt) });
    },
    fallback(why) {
      reason = why;
    },
    build(mode) {
      // A model answer never carries a reason, even if an earlier attempt in the request fell back.
      const why = mode === 'offline' && reason !== undefined ? { reason } : {};
      return {
        mode,
        ...why,
        models: [...models],
        latencyMs: elapsed(startedAt),
        steps: [...steps],
      };
    },
  };
}
