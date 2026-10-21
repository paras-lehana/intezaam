/**
 * State for the chanda calculator: the committee's typed values and the engine's answer.
 *
 * Responsibility: start from the values the plan was computed with, and on every edit
 * re-plan a copy of the context so the per-household amount, tiers and funding status are
 * core's own (COM-01, COM-02, VER-F). Boundary: a preview; nothing is saved until the
 * committee enters the same values under "Your details".
 */
import { useMemo, useState } from 'react';
import type { CommunityExtras, CommunityPlan, EventContext, Plan } from '@intezaam/core/schemas';
import { previewPlan } from '../what-if/simulate';
import { type ChandaDraft, chandaDraft, withChanda } from './chanda';

export interface ChandaState {
  readonly draft: ChandaDraft;
  readonly setDraft: (draft: ChandaDraft) => void;
  /** The engine's community numbers for the draft (the plan's own when unchanged). */
  readonly community: CommunityPlan;
  readonly funding: Plan['verdict']['funding'];
  /** True when the draft differs from the saved plan. */
  readonly edited: boolean;
  /** True when the draft is out of bounds and the plan's numbers are shown instead. */
  readonly invalid: boolean;
}

/**
 * The calculator's state for a community plan.
 * @example
 * const chanda = useChanda(plan, community, extras, context, todayIso);
 * chanda.community.contribution.perHouseholdInr; // 1000 for the society Ganesh utsav sample
 */
export function useChanda(
  plan: Plan,
  community: CommunityPlan,
  extras: CommunityExtras,
  context: EventContext,
  todayIso: string,
): ChandaState {
  const initial = useMemo(() => chandaDraft(extras), [extras]);
  const [base, setBase] = useState(initial);
  const [draft, setDraft] = useState(initial);
  // Adjusting state while rendering (React's documented pattern): a re-planned event with
  // new community details restarts the calculator from them.
  if (base !== initial) {
    setBase(initial);
    setDraft(initial);
  }
  const edited = draft !== initial;
  // Efficiency: the engine re-runs only when the draft changes (a few milliseconds each).
  const preview = useMemo(
    () => (edited ? previewPlan(withChanda(context, extras, draft), todayIso) : plan),
    [edited, context, extras, draft, todayIso, plan],
  );
  return {
    draft,
    setDraft,
    community: preview?.community ?? community,
    funding: preview?.verdict.funding ?? plan.verdict.funding,
    edited,
    invalid: preview === null,
  };
}
