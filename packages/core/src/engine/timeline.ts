/**
 * Back-scheduled timeline (TL-01…11) — ported from bio-bandish `checklist.plan()`.
 *
 * Responsibility: date every selected task at its lead time before the event (TL-02);
 * squeeze late tasks into the days left, longest lead first, in 1–3-day steps (TL-03);
 * swap tasks that need more time than is left for their fallback (TL-04); keep tasks
 * undated with "choose your date" first when the date is open (TL-05); keep prerequisites
 * first (TL-07); and give a past date only its wrap-up tasks (TL-11). Every task links to a
 * Google Calendar entry. Boundary: dates and statuses; date notes come from dates.ts.
 */
import { daysBetweenIso } from '../domain/calendar.js';
import type { RuleId } from '../domain/rule-ids.js';
import { buildGoogleCalendarUrl } from '../integrations/google-links.js';
import type { DateNote, PlanTask, PlanTimeline } from '../schemas/plan-time.js';
import { selectTemplates } from './task-conditions.js';
import {
  byLeadThenId,
  keepPrerequisitesFirst,
  type Slot,
  slotsFor,
  statusOf,
} from './timeline-schedule.js';
import type { TraceLog } from './trace.js';
import type { ClassifiedContext } from './types.js';

/** Rules every task already cites through the timeline's own items. */
const TIMELINE_RULES: readonly RuleId[] = ['TL-01', 'TL-02'];

interface TimelineIds {
  readonly base: readonly string[];
  readonly compression: string | null;
  readonly fallback: string | null;
}

function present(ids: readonly (string | null)[]): string[] {
  return ids.filter((id): id is string => id !== null);
}

function taskLead(slot: Slot, eventDate: string | null): number {
  if (slot.due === null || eventDate === null) return slot.template.leadDays;
  return daysBetweenIso(slot.due, eventDate) ?? slot.template.leadDays;
}

function toTask(
  slot: Slot,
  ctx: ClassifiedContext,
  ids: TimelineIds,
  trace: TraceLog,
  planned: ReadonlySet<string>,
): PlanTask {
  const { template } = slot;
  const status = statusOf(slot, ctx.todayIso);
  const title = slot.fallback ? (template.fallbackTitle ?? template.title) : template.title;
  const ruleId = TIMELINE_RULES.includes(template.ruleId) ? null : trace.rule(template.ruleId);
  const statusId =
    status === 'urgent' ? ids.compression : status === 'fallback' ? ids.fallback : null;
  const functionKind = template.functions?.find((kind) => ctx.functions.includes(kind));
  const calendar =
    slot.due === null
      ? {}
      : {
          dueIso: slot.due,
          calendarUrl: buildGoogleCalendarUrl({ title, isoDate: slot.due, details: template.why }),
        };
  return {
    id: template.id,
    templateId: template.id,
    phase: template.phase,
    title,
    why: template.why,
    ...calendar,
    leadDays: taskLead(slot, ctx.dateIso),
    status,
    core: template.core,
    ...(template.vendorType === undefined ? {} : { vendorType: template.vendorType }),
    ...(functionKind === undefined ? {} : { functionKind }),
    dependsOn: template.dependsOn.filter((id) => planned.has(id)),
    traceIds: present([...ids.base, statusId, ruleId]),
  };
}

function datingTrace(ctx: ClassifiedContext, trace: TraceLog): string {
  if (ctx.dateIso === null) {
    return trace.add({
      ruleId: 'TL-05',
      inputs: [['date', 'not fixed']],
      effect: 'Tasks stay undated and choosing the date comes first.',
    });
  }
  return trace.add({
    ruleId: 'TL-02',
    inputs: [
      ['event date', ctx.dateIso],
      ['days left', ctx.daysToEvent ?? 0],
    ],
    effect: `Each task is due its lead time before ${ctx.dateIso}.`,
  });
}

/**
 * Builds the timeline for the classified context; `dateNotes` come from the date rules.
 * @example
 * buildTimeline(jaipurCtx, [], trace).mode; // 'dated'
 */
export function buildTimeline(
  ctx: ClassifiedContext,
  dateNotes: readonly DateNote[],
  trace: TraceLog,
): PlanTimeline {
  const slots = slotsFor(ctx, selectTemplates(ctx));
  const moved = keepPrerequisitesFirst(slots);
  if (ctx.dateIso !== null) {
    slots.sort(
      (a, b) => (a.due ?? '').localeCompare(b.due ?? '') || byLeadThenId(a.template, b.template),
    );
  }
  const left = ctx.daysToEvent ?? 0;
  const lateCount = slots.filter((slot) => slot.late).length;
  const fallbacks = slots.filter((slot) => slot.fallback).map((slot) => slot.template.id);
  const templatesId = trace.add({
    ruleId: 'TL-01',
    inputs: [
      ['family', ctx.family],
      ['kind', ctx.kind],
      ['functions', ctx.functions.join(', ')],
    ],
    effect: `${slots.length} checklist tasks apply to this ${ctx.family.replace('-', ' ')}.`,
  });
  const ids: TimelineIds = {
    base: [templatesId, datingTrace(ctx, trace)],
    compression:
      lateCount === 0
        ? null
        : trace.add({
            ruleId: 'TL-03',
            inputs: [
              ['late tasks', lateCount],
              ['days left', left],
            ],
            effect: `${lateCount} tasks are past their usual lead time, so they are packed into the days left, longest lead first.`,
          }),
    fallback:
      fallbacks.length === 0
        ? null
        : trace.add({
            ruleId: 'TL-04',
            inputs: [
              ['tasks', fallbacks.join(', ')],
              ['days left', left],
            ],
            effect: 'Tasks that need more time than is left are swapped for a quicker fallback.',
          }),
  };
  const dependencyId =
    moved === 0
      ? null
      : trace.add({
          ruleId: 'TL-07',
          inputs: [['tasks moved', moved]],
          effect: `${moved} tasks were moved so they never fall due before what they depend on.`,
        });
  const planned = new Set(slots.map((slot) => slot.template.id));
  return {
    mode: ctx.dateMode,
    compressed: lateCount > 0,
    daysToEvent: ctx.daysToEvent,
    tasks: slots.map((slot) => toTask(slot, ctx, ids, trace, planned)),
    dateNotes: [...dateNotes],
    traceIds: present([...ids.base, ids.compression, ids.fallback, dependencyId]),
  };
}
