/**
 * Task selection (TL-01) — which checklist templates apply to this event.
 *
 * Responsibility: evaluate every template condition against the classified context (one
 * predicate per condition, keyed by the closed TaskCondition union) and filter the
 * family's templates by kind, planned functions and condition. Boundary: selection only;
 * timeline.ts dates and compresses the selected tasks.
 */
import { CROWD_CLASS_MAX } from '../domain/crowd.js';
import type { TaskCondition, TaskTemplate } from '../domain/task-types.js';
import { templatesForFamily } from '../domain/tasks.js';
import type { ClassifiedContext } from './types.js';

type ConditionCheck = (ctx: ClassifiedContext) => boolean;

/** One predicate per condition: a new condition without a check is a compile error. */
export const TASK_CONDITION_CHECKS: Readonly<Record<TaskCondition, ConditionCheck>> = {
  'date-undecided': (ctx) => ctx.dateMode === 'undated',
  'hindu-muhurat': (ctx) => ctx.hinduCalendar,
  nikah: (ctx) => ctx.tradition === 'muslim',
  church: (ctx) => ctx.tradition === 'christian',
  // An Anand Karaj, or not said; never when the brief said "Punjabi" alone (anandKaraj false).
  gurdwara: (ctx) => ctx.tradition === 'punjabi-sikh' && ctx.input.anandKaraj !== false,
  'planner-hired': (ctx) => ctx.plannerHired,
  jewellery: (ctx) => ctx.input.toggles.jewellery,
  'outstation-guests': (ctx) => ctx.input.destination || ctx.input.outstationShare > 0,
  'rain-risk': (ctx) => ctx.rainRisk,
  // Ramps and accessible toilets are for elderly guests and wheelchair users (ACC-01…03).
  'accessibility-needs': (ctx) => ctx.accessNeeds.some((need) => need !== 'kids'),
  'amplified-sound': (ctx) => ctx.amplifiedSound,
  'public-premises': (ctx) => ctx.input.community?.premises === 'public',
  'private-premises': (ctx) => ctx.input.community?.premises === 'private',
  procession: (ctx) => ctx.functions.includes('visarjan'),
  // A pandal, stage or tent: every community event, and any open-air event away from home.
  'temporary-structure': (ctx) => ctx.family === 'community' || ctx.openAir,
  'food-stalls': (ctx) => ctx.functions.includes('mela'),
  'crowd-over-1000': (ctx) => ctx.footfall > CROWD_CLASS_MAX.large,
  alcohol: (ctx) => ctx.input.alcohol,
  'away-from-home': (ctx) => ctx.setting !== 'home',
};

/**
 * True when a template applies: right kind, at least one of its functions planned, and
 * its condition (if any) holds.
 * @example
 * templateApplies(jaipurCtx, findTaskTemplate('w-muhurat-dates')); // true (Hindu tradition)
 */
export function templateApplies(ctx: ClassifiedContext, template: TaskTemplate): boolean {
  const kindOk = template.kinds === undefined || template.kinds.includes(ctx.kind);
  const functionsOk =
    template.functions === undefined ||
    template.functions.some((kind) => ctx.functions.includes(kind));
  const conditionOk =
    template.condition === undefined || TASK_CONDITION_CHECKS[template.condition](ctx);
  return kindOk && functionsOk && conditionOk;
}

/**
 * The family's templates that apply to this context, in table order.
 * @example
 * selectTemplates(bengaluruCtx).some((t) => t.id === 'b-rain-plan'); // true in the monsoon
 */
export function selectTemplates(ctx: ClassifiedContext): TaskTemplate[] {
  return templatesForFamily(ctx.family).filter((template) => templateApplies(ctx, template));
}
