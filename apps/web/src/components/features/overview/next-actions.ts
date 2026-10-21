/**
 * The three best next actions for the Overview.
 *
 * Responsibility: use the AI narration's three actions when they arrived (each cites a task
 * id, which the server has checked exists), otherwise pick from the plan's own checklist —
 * "Do now" first, then urgent, then whatever is due soonest. Due dates always come from the
 * plan, never from the model. Each action says where its words came from, so the model's
 * can carry the narration's language. Boundary: pure.
 */
import type { Narration, Plan, TaskStatus } from '@intezaam/core/schemas';

export interface NextAction {
  readonly id: string;
  readonly text: string;
  readonly dueIso?: string | undefined;
  /** True when the words are the narration's (written in its language), not a task title. */
  readonly fromNarration: boolean;
}

/** Synthesis feature #8: the narrative ends with the three best next actions. */
export const NEXT_ACTION_COUNT = 3;

/** Which tasks come first when the planner picks; after-event wrap-up is never "next". */
const STATUS_RANK: Readonly<Record<TaskStatus, number>> = {
  'do-now': 0,
  urgent: 1,
  fallback: 2,
  upcoming: 3,
  'after-event': 4,
};

/**
 * The next actions, from the narration when present, else from the checklist.
 * @example
 * nextActions(plan).length; // 3 for any plan with three open tasks
 */
export function nextActions(plan: Plan, narration?: Narration): readonly NextAction[] {
  const tasks = new Map(plan.timeline.tasks.map((task) => [task.id, task]));
  if (narration !== undefined && narration.actions.length > 0) {
    return narration.actions.slice(0, NEXT_ACTION_COUNT).map((action) => ({
      id: action.taskId,
      text: action.text,
      dueIso: tasks.get(action.taskId)?.dueIso,
      fromNarration: true,
    }));
  }
  return plan.timeline.tasks
    .filter((task) => task.status !== 'after-event')
    .sort(
      (a, b) =>
        STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
        (a.dueIso ?? '').localeCompare(b.dueIso ?? ''),
    )
    .slice(0, NEXT_ACTION_COUNT)
    .map((task) => ({ id: task.id, text: task.title, dueIso: task.dueIso, fromNarration: false }));
}
