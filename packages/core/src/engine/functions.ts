/**
 * Functions and days (FN-01, FN-02, FN-04) — the Indian unit of planning.
 *
 * Responsibility: lay out each planned function — its local name, day offset from the main
 * day (tradition overrides; visarjan on the last day of a multi-day programme), start and
 * end time (Telugu near midnight, Tamil in the morning, church weddings inside 6 am–7 pm),
 * guests, budget slice and the rites it holds (the tradition's for weddings, the occasion's
 * own otherwise, e.g. the 60th) — and check for a rest day between a late sangeet and an
 * early-morning muhurat. Boundary: layout only; run-sheet.ts adds vendor slots.
 */
import { addDaysIso } from '../domain/calendar.js';
import { CEREMONY_SEQUENCES } from '../domain/ceremonies.js';
import type { EventKind } from '../domain/events.js';
import { FUNCTION_PROFILES, type FunctionKind } from '../domain/functions.js';
import type { SourceId } from '../domain/sources.js';
import type { PlanBudget } from '../schemas/plan-money.js';
import type { PlanFunction } from '../schemas/plan-time.js';
import { addMinutes, toMinutes } from './clock.js';
import { invitedAt } from './headcount.js';
import type { TraceLog } from './trace.js';
import type { ClassifiedContext, FunctionsSource } from './types.js';

const MINUTES_PER_HOUR = 60;

/** FN-04 (grade D): a sangeet ending after 10 pm is "late"; a muhurat before 9 am is "early". */
export const LATE_END_HHMM = '22:00';
const EARLY_START_HHMM = '09:00';

/** How FN-01 describes where the function list came from. */
const SOURCE_TEXT: Readonly<Record<FunctionsSource, string>> = {
  user: 'the list you gave',
  tradition: 'the tradition’s usual sequence',
  kind: 'the usual functions for this event',
};

/** When and where one function sits in the event. */
export interface FunctionTiming {
  readonly kind: FunctionKind;
  readonly label: string;
  readonly dayOffset: number;
  readonly dateIso: string | null;
  readonly startHhmm: string;
  readonly endHhmm: string;
  readonly durationHours: number;
}

/**
 * The tradition's day for a function: its explicit override, else the first rite the
 * tradition holds in that function (e.g. the Gujarati Mehndi and Garba night the day before).
 */
function traditionOffset(ctx: ClassifiedContext, kind: FunctionKind): number | undefined {
  const override = ctx.traditionProfile?.dayOffsets[kind];
  if (override !== undefined || ctx.tradition === null || ctx.family !== 'wedding') return override;
  return CEREMONY_SEQUENCES[ctx.tradition].find((step) => step.functionKind === kind)?.dayOffset;
}

/**
 * FN-01: day offset, start and end for every planned function, in planned order.
 * @example
 * functionTimings(teluguCtx).find((f) => f.kind === 'wedding')?.startHhmm; // '23:30'
 */
export function functionTimings(ctx: ClassifiedContext): FunctionTiming[] {
  const days = ctx.input.community?.days ?? 1;
  return ctx.functions.map((kind) => {
    const profile = FUNCTION_PROFILES[kind];
    const dayOffset =
      traditionOffset(ctx, kind) ?? (profile.onLastDay ? days - 1 : profile.dayOffset);
    const ceremonyStart = kind === 'wedding' ? ctx.traditionProfile?.ceremonyStartHhmm : null;
    const startHhmm = ceremonyStart ?? profile.defaultStartHhmm;
    return {
      kind,
      label: ctx.traditionProfile?.functionNames[kind] ?? profile.label,
      dayOffset,
      dateIso: ctx.dateIso === null ? null : (addDaysIso(ctx.dateIso, dayOffset) ?? null),
      startHhmm,
      endHhmm: addMinutes(startHhmm, profile.durationHours * MINUTES_PER_HOUR),
      durationHours: profile.durationHours,
    };
  });
}

/** Rites an occasion holds inside one function, with the source that lists them. */
interface KindRites {
  readonly sourceId: SourceId;
  readonly byFunction: Readonly<Partial<Record<FunctionKind, readonly string[]>>>;
}

/**
 * Non-wedding occasions with published rites. The 60th is a two-day rite
 * (S-WIKI-SHASHTHIPURTI, grade B); regional order of days is unverified, so the puja card
 * lists the rites and the priest task fixes which day holds which.
 */
const KIND_RITES: Readonly<Partial<Record<EventKind, KindRites>>> = {
  'sixtieth-birthday': {
    sourceId: 'S-WIKI-SHASHTHIPURTI',
    byFunction: {
      puja: [
        'Ugraratha Shanti',
        'Ganapati homam',
        'Navagraha rites',
        'Kalasha puja (deities installed in kalashas)',
        'Kalyanam, the ceremonial re-wedding',
      ],
    },
  },
};

/** The rites held inside one function: the tradition's for weddings, else the occasion's. */
function ceremoniesOf(ctx: ClassifiedContext, kind: FunctionKind): string[] {
  if (ctx.family !== 'wedding') return [...(KIND_RITES[ctx.kind]?.byFunction[kind] ?? [])];
  if (ctx.tradition === null) return [];
  return CEREMONY_SEQUENCES[ctx.tradition]
    .filter((step) => step.functionKind === kind)
    .map((step) => step.name);
}

function endsLate(timing: FunctionTiming): boolean {
  const start = toMinutes(timing.startHhmm);
  return start + timing.durationHours * MINUTES_PER_HOUR > toMinutes(LATE_END_HHMM);
}

/**
 * FN-04: true when a late sangeet sits within a day of an early-morning wedding ceremony.
 * @example
 * needsRestDay(timings); // false for the default North Indian timings
 */
export function needsRestDay(timings: readonly FunctionTiming[]): boolean {
  const sangeet = timings.find((timing) => timing.kind === 'sangeet');
  const wedding = timings.find((timing) => timing.kind === 'wedding');
  if (sangeet === undefined || wedding === undefined) return false;
  const gapDays = wedding.dayOffset - sangeet.dayOffset;
  const early = toMinutes(wedding.startHhmm) < toMinutes(EARLY_START_HHMM);
  return endsLate(sangeet) && early && gapDays <= 1;
}

/**
 * FN-04: records the missing rest day when there is one; returns its trace id or null.
 * @example
 * traceRestDay(timings, trace); // null for the default North Indian timings
 */
export function traceRestDay(timings: readonly FunctionTiming[], trace: TraceLog): string | null {
  if (!needsRestDay(timings)) return null;
  return trace.add({
    ruleId: 'FN-04',
    inputs: [['functions', 'sangeet, wedding']],
    effect:
      'A late sangeet sits within a day of an early-morning muhurat; keep a rest day between them.',
  });
}

export interface FunctionsResult {
  readonly functions: PlanFunction[];
  readonly timings: FunctionTiming[];
  /** The FN-04 trace id when a rest day is missing, else null. */
  readonly restDayTraceId: string | null;
}

/**
 * Builds the function cards with their budget slices.
 * @example
 * buildFunctions(jaipurCtx, budget, trace).functions.map((f) => f.functionKind); // ['mehendi', 'sangeet', 'wedding', 'reception']
 */
export function buildFunctions(
  ctx: ClassifiedContext,
  budget: PlanBudget,
  trace: TraceLog,
): FunctionsResult {
  const timings = functionTimings(ctx);
  const rites = KIND_RITES[ctx.kind];
  const sequenceId = trace.add({
    ruleId: 'FN-01',
    inputs: [
      ['tradition', ctx.tradition ?? 'none'],
      ['functions', ctx.functions.join(', ')],
      ['chosen by', ctx.functionsSource],
    ],
    effect: `${timings.length} functions laid out from ${SOURCE_TEXT[ctx.functionsSource]}, with day offsets and start times.`,
    sourceIds: [
      ...(ctx.traditionProfile?.sourceIds ?? []),
      ...(rites === undefined ? [] : [rites.sourceId]),
      'S-OWNER-DEFAULTS',
    ],
  });
  const functions = timings.map((timing): PlanFunction => {
    const slice = budget.byFunction.find((entry) => entry.functionKind === timing.kind);
    return {
      functionKind: timing.kind,
      label: timing.label,
      ...(timing.dateIso === null ? {} : { dateIso: timing.dateIso }),
      dayOffset: timing.dayOffset,
      startHhmm: timing.startHhmm,
      endHhmm: timing.endHhmm,
      guests: invitedAt(ctx, timing.kind),
      budgetInr: slice?.amountInr ?? 0,
      ceremonies: ceremoniesOf(ctx, timing.kind),
      traceIds: [sequenceId, ...(slice?.traceIds ?? [])],
    };
  });
  return { functions, timings, restDayTraceId: traceRestDay(timings, trace) };
}
