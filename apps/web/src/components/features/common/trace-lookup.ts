/**
 * Fast lookups from a plan's trace ids and source ids to the items behind them.
 *
 * Responsibility: turn the `traceIds` every plan item carries into the trace items ("Why
 * this?") and the sources those items cite. Boundary: read-only over a plan; unknown ids
 * are skipped, never invented.
 */
import type { Plan, SourceRef, TraceItem } from '@intezaam/core/schemas';

interface PlanIndex {
  readonly trace: ReadonlyMap<string, TraceItem>;
  readonly sources: ReadonlyMap<string, SourceRef>;
}

// Efficiency: one index per plan object, shared by every "Why this?" on the page; a new
// plan is a new object, so the cache can never serve stale items, and the WeakMap lets
// the old index go with the old plan.
const INDEX_CACHE = new WeakMap<Plan, PlanIndex>();

function planIndex(plan: Plan): PlanIndex {
  const cached = INDEX_CACHE.get(plan);
  if (cached !== undefined) return cached;
  const index: PlanIndex = {
    trace: new Map(plan.trace.map((item) => [item.id, item])),
    sources: new Map(plan.sources.map((source) => [source.id, source])),
  };
  INDEX_CACHE.set(plan, index);
  return index;
}

/**
 * The trace items behind a plan item, in the order cited, without duplicates.
 * @example
 * traceItemsFor(plan, plan.verdict.money.traceIds)[0]?.ruleId; // 'VER-M'
 */
export function traceItemsFor(plan: Plan, traceIds: readonly string[]): readonly TraceItem[] {
  const { trace } = planIndex(plan);
  return [...new Set(traceIds)].flatMap((id) => {
    const item = trace.get(id);
    return item === undefined ? [] : [item];
  });
}

/**
 * The sources for a list of source ids (a trace item's or a date note's), in order.
 * @example
 * sourcesFor(plan, ['S-NDMA-2014'])[0]?.publisher; // 'National Disaster Management Authority'
 */
export function sourcesFor(plan: Plan, sourceIds: readonly string[]): readonly SourceRef[] {
  const { sources } = planIndex(plan);
  return [...new Set(sourceIds)].flatMap((id) => {
    const source = sources.get(id);
    return source === undefined ? [] : [source];
  });
}
