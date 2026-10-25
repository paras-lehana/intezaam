/**
 * Timeline scheduling (TL-02…05, TL-07, TL-11) — ported from the owner's earlier planner.
 *
 * Responsibility: date each selected template at its lead time before the event; squeeze
 * late tasks into the days left, longest lead first, in 1–3-day steps; swap tasks that
 * need more time than is left for their fallback; leave tasks undated (choose-the-date
 * first) when the date is open; give a past date only its wrap-up tasks; and never let a
 * task fall due before its prerequisites. Boundary: slots and statuses; timeline.ts turns
 * them into plan tasks with trace ids.
 */
import { addDaysIso, daysBetweenIso } from '../domain/calendar.js';
import type { TaskTemplate } from '../domain/task-types.js';
import { COMPRESSION_STEP_DAYS, DAYS_PER_WEEK } from '../domain/timeline.js';
import type { TaskStatus } from '../schemas/plan-time.js';
import type { ClassifiedContext } from './types.js';

/** A task due within a week is "do now" (S-OWNER-DEFAULTS). */
const DO_NOW_WINDOW_DAYS = DAYS_PER_WEEK;

/** One scheduled template: its due date (null when undated) and how it was placed. */
export interface Slot {
  readonly template: TaskTemplate;
  due: string | null;
  readonly late: boolean;
  readonly fallback: boolean;
}

/**
 * Longest lead first, then template id, so schedules are deterministic.
 * @example
 * [short, long].sort(byLeadThenId)[0] === long; // true
 */
export function byLeadThenId(a: TaskTemplate, b: TaskTemplate): number {
  return b.leadDays - a.leadDays || a.id.localeCompare(b.id);
}

function undatedSlots(templates: readonly TaskTemplate[]): Slot[] {
  // TL-05: "choose your date" outranks every other task while the date is open.
  const first = (t: TaskTemplate): number => (t.condition === 'date-undecided' ? 0 : 1);
  return [...templates]
    .sort((a, b) => first(a) - first(b) || byLeadThenId(a, b))
    .map((template) => ({ template, due: null, late: false, fallback: false }));
}

function pastSlots(templates: readonly TaskTemplate[], dateIso: string): Slot[] {
  return templates
    .filter((template) => template.phase === 'after')
    .map((template) => ({
      template,
      due: addDaysIso(dateIso, -template.leadDays) ?? dateIso,
      late: false,
      fallback: false,
    }));
}

/** TL-02 + TL-03 + TL-04 for a fixed future date. */
function datedSlots(
  templates: readonly TaskTemplate[],
  ctx: ClassifiedContext,
  dateIso: string,
  left: number,
): Slot[] {
  const today = ctx.todayIso;
  const slots: Slot[] = [];
  const late: { template: TaskTemplate; fallback: boolean }[] = [];
  for (const template of templates) {
    const tooLate = template.minLeftDays !== undefined && left < template.minLeftDays;
    if (tooLate && template.fallbackTitle === undefined) continue;
    const due = addDaysIso(dateIso, -template.leadDays) ?? dateIso;
    if (tooLate || (template.leadDays >= 0 && due < today)) {
      late.push({ template, fallback: tooLate });
    } else {
      slots.push({ template, due, late: false, fallback: false });
    }
  }
  late.sort((a, b) => byLeadThenId(a.template, b.template));
  const window = Math.max(1, left - 1);
  const step = Math.max(
    COMPRESSION_STEP_DAYS.min,
    Math.min(COMPRESSION_STEP_DAYS.max, Math.floor(window / (late.length + 1))),
  );
  late.forEach(({ template, fallback }, index) => {
    const squeezed = addDaysIso(today, Math.min(window, step * (index + 1))) ?? today;
    slots.push({ template, due: squeezed > dateIso ? dateIso : squeezed, late: true, fallback });
  });
  return slots;
}

/**
 * TL-07: a task is never due before its prerequisites; returns how many moved.
 * @example
 * keepPrerequisitesFirst(slots); // 0 when every dependency is already earlier
 */
export function keepPrerequisitesFirst(slots: Slot[]): number {
  const byId = new Map(slots.map((slot) => [slot.template.id, slot] as const));
  const moved = new Set<string>();
  // Repeat until nothing moves: a task that moved can push its own dependants later.
  for (let pass = 0; pass < slots.length; pass += 1) {
    const changed = slots.filter((slot) => followPrerequisites(slot, byId));
    for (const slot of changed) moved.add(slot.template.id);
    if (changed.length === 0) break;
  }
  return moved.size;
}

/** Moves a slot to the latest due date among its prerequisites; true when it moved. */
function followPrerequisites(slot: Slot, byId: ReadonlyMap<string, Slot>): boolean {
  let moved = false;
  for (const dependency of slot.template.dependsOn) {
    const before = byId.get(dependency)?.due;
    if (slot.due !== null && before !== undefined && before !== null && slot.due < before) {
      slot.due = before;
      moved = true;
    }
  }
  return moved;
}

/**
 * A slot's status: fallback, urgent (squeezed), after-event, do-now (within a week) or upcoming.
 * @example
 * statusOf(slotDueTomorrow, today); // 'do-now'
 */
export function statusOf(slot: Slot, todayIso: string): TaskStatus {
  if (slot.fallback) return 'fallback';
  if (slot.late) return 'urgent';
  if (slot.template.leadDays < 0) return 'after-event';
  if (slot.due === null) return 'upcoming';
  const daysAway = daysBetweenIso(todayIso, slot.due) ?? 0;
  return daysAway <= DO_NOW_WINDOW_DAYS ? 'do-now' : 'upcoming';
}

/**
 * Schedules templates for the context's date mode (undated, past or dated).
 * @example
 * slotsFor(undatedCtx, templates).every((slot) => slot.due === null); // true
 */
export function slotsFor(ctx: ClassifiedContext, templates: readonly TaskTemplate[]): Slot[] {
  const date = ctx.dateIso;
  if (date === null) return undatedSlots(templates);
  if (ctx.dateMode === 'past') return pastSlots(templates, date);
  return datedSlots(templates, ctx, date, ctx.daysToEvent ?? 0);
}
