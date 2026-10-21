/**
 * Engine test contexts — sample contexts and small builders for edge cases.
 *
 * Responsibility: one fixed `todayIso`, the sample contexts dated against it, and helpers
 * that derive variant contexts (another city, no budget, an open date, a community event)
 * so engine tests pin only the inputs they own. Boundary: test support only; every
 * expected number is computed by the tests from the engine's own tables.
 */
import { addDaysIso } from '../../domain/calendar.js';
import { sampleContext, type SampleId } from '../../domain/samples.js';
import { classifyContext, normaliseContext } from '../../engine/context.js';
import { buildCore, type CorePlan } from '../../engine/core.js';
import { buildPlan } from '../../engine/plan.js';
import { createTraceLog } from '../../engine/trace.js';
import type { ClassifiedContext, NormalisedContext } from '../../engine/types.js';
import type { EventContext } from '../../schemas/context.js';
import type { Plan } from '../../schemas/plan.js';

export const TODAY = '2026-10-20';

/** A date `days` after TODAY. */
export function inDays(days: number): string {
  return addDaysIso(TODAY, days) ?? TODAY;
}

export function sample(id: SampleId): EventContext {
  return sampleContext(id, TODAY);
}

/** The Jaipur wedding with some fields replaced. */
export function wedding(overrides: Partial<EventContext> = {}): EventContext {
  return { ...sample('jaipur-wedding'), ...overrides };
}

/** The Bengaluru birthday with some fields replaced. */
export function birthday(overrides: Partial<EventContext> = {}): EventContext {
  return { ...sample('bengaluru-birthday'), ...overrides };
}

/** The society Ganesh utsav with some fields replaced. */
export function community(overrides: Partial<EventContext> = {}): EventContext {
  return { ...sample('society-ganesh'), ...overrides };
}

/** A home puja (family function) in the given city. */
export function homePuja(overrides: Partial<EventContext> = {}): EventContext {
  const { birthday: _party, ...base } = sample('bengaluru-birthday');
  return {
    ...base,
    family: 'family-function',
    kind: 'home-puja',
    title: 'Satyanarayan katha',
    guests: 40,
    budgetInr: 60_000,
    functions: [],
    venueSetting: 'home',
    priorities: [],
    disabledCategories: [],
    ...overrides,
  };
}

/** The context without a budget ("estimate it for me"). */
export function withoutBudget(context: EventContext): EventContext {
  const { budgetInr: _omitted, ...rest } = context;
  return rest;
}

/** The context with its date left open. */
export function undated(context: EventContext): EventContext {
  const { dateIso: _open, ...rest } = context;
  return { ...rest, dateFlexible: true };
}

/** JSON round trip: drops keys a test set to undefined, as a form or the API would. */
export function clean(context: EventContext): EventContext {
  const copy: EventContext = JSON.parse(JSON.stringify(context));
  return copy;
}

export function classified(context: EventContext): ClassifiedContext {
  return classifyContext(clean(context), TODAY);
}

export function normalised(context: EventContext): NormalisedContext {
  return normaliseContext(clean(context), TODAY);
}

/** Builds a plan and fails the test (by throwing) if the engine returned an error. */
export function planOf(context: EventContext): Plan {
  const result = buildPlan(clean(context), TODAY);
  if (!result.ok) throw new Error(`${result.error.message} ${result.error.internalHint ?? ''}`);
  return result.value;
}

/** The money core (context, budget, headcount, funding, verdict, cost check) on a fresh trace. */
export function coreOf(context: EventContext): CorePlan {
  return buildCore(clean(context), TODAY, createTraceLog());
}
