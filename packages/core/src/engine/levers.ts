/**
 * Costed levers (LEV-01…07) — the three changes that save the most when money is short.
 *
 * Responsibility: when the money axis reads below the typical range (Needs changes,
 * Simple & home-style or Lean), a community event has a funding gap, or the food or
 * guest-rooms line is short, price every applicable lever, keep the three that save the most (ties go to
 * the lever listed first, which has fewer side effects), and re-run the same engine on each
 * lever's changed context to report the money status it would reach. Boundary: levers only;
 * "Apply" sends a lever's patch through the what-if engine.
 */
import { LEVER_IDS, LEVERS, LEVERS_SHOWN } from '../domain/levers.js';
import { formatInr } from '../format.js';
import type { EventContext } from '../schemas/context.js';
import type { Lever } from '../schemas/plan-money.js';
import type { CorePlan } from './core.js';
import { type Candidate, type LeverDraft, MONEY_CANDIDATES, rerun } from './lever-candidates.js';
import { PARTY_CANDIDATES } from './lever-candidates-party.js';
import type { TraceLog } from './trace.js';
import { TIGHT_MONEY_STATUSES } from './verdict-labels.js';

/** Every lever candidate, in LEVER_IDS order (the tie-break when savings are equal). */
const LEVER_CANDIDATES: readonly Candidate[] = [...MONEY_CANDIDATES, ...PARTY_CANDIDATES];

/**
 * Levers show when any money signal is short: a band below the typical range, a funding
 * gap, or a food or guest-rooms line the bottom-up check finds short (so a Balanced plan
 * with too little for food or rooms still gets ways to close it).
 */
function needsLevers(core: CorePlan): boolean {
  return (
    TIGHT_MONEY_STATUSES.includes(core.money.status) ||
    core.funding?.funding.status === 'gap' ||
    core.costCheck.status === 'short'
  );
}

function byValue(a: LeverDraft, b: LeverDraft): number {
  return b.savingInr - a.savingInr || LEVER_IDS.indexOf(a.id) - LEVER_IDS.indexOf(b.id);
}

/**
 * The top costed levers for a plan's money core (empty when money is not short).
 * @example
 * buildLevers(context, core, today, trace).map((lever) => lever.id); // e.g. ['drop-function', 'off-peak-date']
 */
export function buildLevers(
  context: EventContext,
  core: CorePlan,
  todayIso: string,
  trace: TraceLog,
): Lever[] {
  if (!needsLevers(core)) return [];
  const ranked = LEVER_CANDIDATES.map((candidate) => candidate({ context, core, todayIso }))
    .filter((draft): draft is LeverDraft => draft !== null && draft.savingInr > 0)
    .sort(byValue)
    .slice(0, LEVERS_SHOWN);
  return ranked.map((draft) => {
    const info = LEVERS[draft.id];
    const status = rerun(draft.judge, todayIso).money.status;
    const id = trace.add({
      ruleId: info.ruleId,
      inputs: [
        ['saves', formatInr(draft.savingInr)],
        ['money status after', status],
      ],
      effect: draft.detail,
    });
    return {
      id: draft.id,
      ruleId: info.ruleId,
      title: draft.title ?? info.label,
      detail: draft.detail,
      savingInr: Math.round(draft.savingInr),
      newMoneyStatus: status,
      ...(draft.patch === undefined ? {} : { patch: draft.patch }),
      traceIds: [id, ...core.money.traceIds],
    };
  });
}
