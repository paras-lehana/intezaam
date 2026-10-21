/**
 * Task urgency order shared by the narrator, the Ask answers and the share text.
 *
 * Responsibility: one ranking of task statuses — do now, urgent, fallback, upcoming, after
 * the event — so every place that says "do these first" agrees. Boundary: pure and tiny on
 * purpose: the browser-safe export module imports it without pulling in the offline library.
 */
import type { PlanTask, TaskStatus } from '../schemas/plan-time.js';
import type { Plan } from '../schemas/plan.js';

/** The family acts on tasks in this order (a closed union: a new status is a compile error). */
const STATUS_RANK: Readonly<Record<TaskStatus, number>> = {
  'do-now': 0,
  urgent: 1,
  fallback: 2,
  upcoming: 3,
  'after-event': 4,
};

/**
 * The plan's tasks, most urgent first (a stable sort keeps the planner's order within a status).
 * @example
 * nextTasks(plan)[0]?.status; // 'do-now' when anything is due now
 */
export function nextTasks(plan: Plan): PlanTask[] {
  return [...plan.timeline.tasks].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);
}
