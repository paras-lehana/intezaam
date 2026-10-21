/**
 * Plan contracts, part 2: timeline, date notes, functions and the run sheet.
 *
 * Responsibility: the wire shapes of the back-planned checklist (dated, undated or past
 * mode; compressed when time is short), date intelligence notes, per-function cards and
 * the day-of run sheet. Boundary: shapes only; the timeline and function engines fill them.
 */
import { z } from 'zod';
import { FUNCTION_KINDS } from '../domain/functions.js';
import { RULE_IDS } from '../domain/rule-ids.js';
import { TIMELINE_PHASES } from '../domain/timeline.js';
import { VENDOR_TYPES } from '../domain/vendors.js';
import {
  countSchema,
  hhmmSchema,
  idSchema,
  inrSchema,
  isoDateSchema,
  labelSchema,
  lineSchema,
  traceIdsSchema,
} from './common.js';
import { MAX_DAYS_AHEAD, MAX_DAYS_PAST, MAX_TASKS, MAX_TRACE_SOURCES } from './limits.js';
import { sourceIdSchema } from './trace.js';

/**
 * upcoming = due in the future · do-now = due within the week or squeezed into today ·
 * urgent = past its normal lead, rescheduled (TL-03) · fallback = swapped because it is
 * too late (TL-04) · after-event = wrap-up (TL-11).
 */
export const TASK_STATUSES = ['upcoming', 'do-now', 'urgent', 'fallback', 'after-event'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

/** dated = a fixed future date · undated = "not fixed yet" (TL-05) · past = the date has gone. */
export const TIMELINE_MODES = ['dated', 'undated', 'past'] as const;

export type TimelineMode = (typeof TIMELINE_MODES)[number];

/** Tasks list a handful of prerequisites at most (TL-07). */
const MAX_DEPENDENCIES = 8;

export const planTaskSchema = z.strictObject({
  id: idSchema,
  templateId: idSchema,
  phase: z.enum(TIMELINE_PHASES),
  title: labelSchema,
  why: lineSchema,
  dueIso: isoDateSchema.optional(),
  /** Days before the event (negative = after), as scheduled after compression. */
  leadDays: z.number().int().min(-MAX_DAYS_PAST).max(MAX_DAYS_AHEAD),
  status: z.enum(TASK_STATUSES),
  core: z.boolean(),
  vendorType: z.enum(VENDOR_TYPES).optional(),
  functionKind: z.enum(FUNCTION_KINDS).optional(),
  dependsOn: z.array(idSchema).max(MAX_DEPENDENCIES),
  calendarUrl: z.url().optional(),
  traceIds: traceIdsSchema,
});

export type PlanTask = z.infer<typeof planTaskSchema>;

export const DATE_NOTE_KINDS = [
  'peak-season',
  'off-peak',
  'weekday',
  'muhurat',
  'no-curated-muhurat',
  'calendar-pause',
  'festival-clash',
  'rain-risk',
  'ceremony-window',
  'choose-date',
  'past-date',
] as const;

export type DateNoteKind = (typeof DATE_NOTE_KINDS)[number];

export const dateNoteSchema = z.strictObject({
  kind: z.enum(DATE_NOTE_KINDS),
  ruleId: z.enum(RULE_IDS),
  text: lineSchema,
  sourceIds: z.array(sourceIdSchema).max(MAX_TRACE_SOURCES),
  traceIds: traceIdsSchema,
});

export type DateNote = z.infer<typeof dateNoteSchema>;

export const timelineSchema = z.strictObject({
  mode: z.enum(TIMELINE_MODES),
  compressed: z.boolean(),
  daysToEvent: z.number().int().nullable(),
  tasks: z.array(planTaskSchema).max(MAX_TASKS),
  dateNotes: z.array(dateNoteSchema).max(DATE_NOTE_KINDS.length * 2),
  traceIds: traceIdsSchema,
});

export type PlanTimeline = z.infer<typeof timelineSchema>;

/** The longest tradition sequence in domain/ceremonies.ts has 14 rites. */
const MAX_CEREMONIES = 20;

/** A function card: when it runs, who comes, what it costs, which rites it holds. */
export const planFunctionSchema = z.strictObject({
  functionKind: z.enum(FUNCTION_KINDS),
  /** The tradition's local name when there is one (Nikah, Bou Bhat, Pithi). */
  label: labelSchema,
  dateIso: isoDateSchema.optional(),
  dayOffset: z.number().int(),
  startHhmm: hhmmSchema,
  endHhmm: hhmmSchema,
  guests: countSchema,
  budgetInr: inrSchema,
  ceremonies: z.array(labelSchema).max(MAX_CEREMONIES),
  traceIds: traceIdsSchema,
});

export type PlanFunction = z.infer<typeof planFunctionSchema>;

/** One vendor arrival per slot plus the start: two dozen slots cover any function. */
const MAX_RUN_SHEET_SLOTS = 24;

export const runSheetSchema = z.strictObject({
  functionKind: z.enum(FUNCTION_KINDS),
  label: labelSchema,
  dateIso: isoDateSchema.optional(),
  slots: z
    .array(
      z.strictObject({
        atHhmm: hhmmSchema,
        title: labelSchema,
        owner: labelSchema,
        vendorType: z.enum(VENDOR_TYPES).optional(),
      }),
    )
    .max(MAX_RUN_SHEET_SLOTS),
  traceIds: traceIdsSchema,
});

export type RunSheet = z.infer<typeof runSheetSchema>;
