/**
 * GenAI test plans — the four sample personas planned by the real engine, with their facts.
 *
 * Responsibility: one fixed today, each sample's context dated against it, its Plan from
 * `buildPlan` and its numbered facts from `summarisePlanFacts`, so GenAI, offline and export
 * tests derive every expected number from the engine instead of hand-computing it.
 * Boundary: test support only; a planner error fails the calling test by throwing.
 */
import { addDaysIso } from '../../domain/calendar.js';
import { sampleContext, SAMPLE_IDS, type SampleId } from '../../domain/samples.js';
import { summarisePlanFacts } from '../../engine/facts.js';
import { buildPlan } from '../../engine/plan.js';
import type { EventContext } from '../../schemas/context.js';
import type { PlanFact } from '../../schemas/diff.js';
import type { Plan } from '../../schemas/plan.js';

/** Every GenAI test is planned on this day (a Tuesday), like the brief battery. */
export const TODAY = '2026-10-20';

/** A valid 16-hex nonce, as the server passes `randomBytes(8).toString('hex')`. */
export const NONCE = 'a1b2c3d4e5f60718';

export { SAMPLE_IDS };

export interface Planned {
  readonly context: EventContext;
  readonly plan: Plan;
  readonly facts: PlanFact[];
}

/**
 * Plans a context with the real engine (JSON round trip first, as the API would receive it).
 * @example
 * plannedContext(sampleContext('jaipur-wedding', TODAY)).plan.headcount.expected; // engine value
 */
export function plannedContext(context: EventContext): Planned {
  const clean: EventContext = JSON.parse(JSON.stringify(context));
  const result = buildPlan(clean, TODAY);
  if (!result.ok) throw new Error(`${result.error.message} ${result.error.internalHint ?? ''}`);
  return { context: clean, plan: result.value, facts: summarisePlanFacts(result.value) };
}

/**
 * One of the four sample personas, planned.
 * @example
 * planned('bengaluru-birthday').context.family; // 'birthday'
 */
export function planned(id: SampleId, overrides: Partial<EventContext> = {}): Planned {
  return plannedContext({ ...sampleContext(id, TODAY), ...overrides });
}

/** The context with its date left open ("not fixed yet"). */
export function undatedContext(id: SampleId): EventContext {
  const { dateIso: _open, ...rest } = sampleContext(id, TODAY);
  return { ...rest, dateFlexible: true };
}

/** A date `days` after TODAY. */
export function inDays(days: number): string {
  return addDaysIso(TODAY, days) ?? TODAY;
}
