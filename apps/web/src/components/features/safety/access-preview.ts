/**
 * What ticking an access need adds to the plan (feature #36, ACC-01…06).
 *
 * Responsibility: re-plan a copy of the context with the ticked needs (elderly guests,
 * wheelchair users, young children) through core's engine, and report the accessibility
 * checks that apply plus the timeline tasks the change adds or removes. Boundary: a preview
 * — the typed change list has no access-need op, so the needs are kept from "Your details".
 */
import type { AccessNeed } from '@intezaam/core/domain';
import { diffPlans } from '@intezaam/core/engine';
import type { AccessibilityPlan, EventContext, Plan } from '@intezaam/core/schemas';
import { previewPlan } from '../what-if/simulate';

export interface AccessPreview {
  readonly items: AccessibilityPlan['items'];
  readonly addedTasks: readonly string[];
  readonly removedTasks: readonly string[];
}

/**
 * The context with exactly these needs ticked.
 * @example
 * withNeeds(context, new Set(['elderly'])).accessibility; // { elderly: true, wheelchair: false, kids: false }
 */
export function withNeeds(context: EventContext, needs: ReadonlySet<AccessNeed>): EventContext {
  const accessibility: Record<AccessNeed, boolean> = {
    elderly: needs.has('elderly'),
    wheelchair: needs.has('wheelchair'),
    kids: needs.has('kids'),
  };
  return { ...context, accessibility };
}

/**
 * The checks and task changes for a set of ticked needs; the plan's own when unchanged.
 * @example
 * accessPreview(plan, context, '2026-10-20', new Set(['wheelchair']))?.addedTasks;
 * // ['Confirm a ramp and an accessible toilet with the venue'] when the plan had none
 */
export function accessPreview(
  plan: Plan,
  context: EventContext,
  todayIso: string,
  needs: ReadonlySet<AccessNeed>,
): AccessPreview | null {
  const preview = previewPlan(withNeeds(context, needs), todayIso);
  if (preview === null) return null;
  const changes = diffPlans(plan, preview).taskChanges;
  const titles = (change: 'added' | 'removed'): string[] =>
    changes.filter((entry) => entry.change === change).map((entry) => entry.title);
  return {
    items: preview.accessibility.items,
    addedTasks: titles('added'),
    removedTasks: titles('removed'),
  };
}
