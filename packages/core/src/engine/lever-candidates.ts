/**
 * Lever candidates (LEV-01…07) — each costed change and the context it is judged on.
 *
 * Responsibility: the shared lever shapes and helpers, and the LEV-01…05 candidates
 * (fewer guests, a weekday date, a simpler caterer, one function fewer, the hometown). For
 * each lever, decide whether it applies, the patch "Apply" sends, the
 * rupees it saves (read from the plan, or from the same engine re-run on the changed
 * context) and the context the new money status is judged on: a changed guest count or
 * setting is judged as is; a price saving stays in the budget; a community saving lowers
 * the planned spend. Boundary: candidates only; levers.ts ranks them and runs the judge.
 */
import type { BudgetCategory } from '../domain/budget-categories.js';
import type { CateringLevel } from '../domain/catering.js';
import { OFF_PEAK_PRICE_FACTOR } from '../domain/seasons.js';
import type { LeverId } from '../domain/levers.js';
import { formatInr } from '../format.js';
import type { EventContext } from '../schemas/context.js';
import type { ContextPatch } from '../schemas/patch.js';
import { cateringRange, OFF_PEAK_SAVING_LABEL } from './catering.js';
import { buildCore, type CorePlan } from './core.js';
import { guestTarget } from './lever-targets.js';
import { moneyModelOf } from './money-model.js';
import { createTraceLog } from './trace.js';
import { applyPatch } from './what-if.js';
import { nextDiscountWeekday } from './lever-helpers.js';

const OFF_PEAK_LINES: readonly BudgetCategory[] = ['venue', 'catering', 'decor'];
const PER_GUEST_LINES: readonly BudgetCategory[] = ['gifts', 'invites', 'transport'];
const CHEAPER_LEVEL: Readonly<Record<CateringLevel, CateringLevel | null>> = {
  premium: 'standard',
  standard: 'community',
  community: null,
};

export interface LeverDraft {
  readonly id: LeverId;
  /** Overrides the lever's default label when the change is more specific. */
  readonly title?: string;
  readonly detail: string;
  readonly savingInr: number;
  readonly patch?: ContextPatch;
  /** The context the new money status is read from. */
  readonly judge: EventContext;
}

export interface LeverInput {
  readonly context: EventContext;
  readonly core: CorePlan;
  readonly todayIso: string;
}

export type Candidate = (input: LeverInput) => LeverDraft | null;

/**
 * Re-runs the money core on a changed context (a fresh trace: lever runs are not shown).
 * @example
 * rerun(context, today).money.status; // the status after the change
 */
export function rerun(context: EventContext, todayIso: string): CorePlan {
  // Efficiency: lever pricing re-runs only the money core (no timeline, vendors or safety).
  return buildCore(context, todayIso, createTraceLog());
}

/**
 * The rupees in one budget line of a plan (0 when the line is absent).
 * @example
 * lineOf(core, 'decor'); // 350000
 */
export function lineOf(core: CorePlan, category: BudgetCategory): number {
  return core.budget.lines.find((line) => line.category === category)?.amountInr ?? 0;
}

/**
 * The context with a different budget (whole rupees, at least ₹1).
 * @example
 * withBudget(context, 2_600_000).budgetInr; // 2600000
 */
export function withBudget(context: EventContext, budgetInr: number): EventContext {
  return { ...context, budgetInr: Math.max(1, Math.round(budgetInr)) };
}

/** Cost that falls with guests: food, rooms and the per-guest lines (LEV-01 saving). */
function guestCostDelta(before: CorePlan, after: CorePlan): number {
  const perGuest = PER_GUEST_LINES.reduce(
    (sum, category) =>
      sum + (before.budget.lines.find((line) => line.category === category)?.perGuestInr ?? 0),
    0,
  );
  const food = before.costCheck.cateringInr.mid - after.costCheck.cateringInr.mid;
  const rooms = before.costCheck.roomsInr - after.costCheck.roomsInr;
  return food + rooms + (before.ctx.guests - after.ctx.guests) * perGuest;
}

const fewerGuests: Candidate = ({ context, core, todayIso }) => {
  const target = guestTarget(core);
  if (target === null || target < 1 || target >= core.ctx.guests) return null;
  const patch: ContextPatch = { ops: [{ op: 'setGuests', value: target }] };
  const after = applyPatch(context, patch);
  const saving = guestCostDelta(core, rerun(after, todayIso));
  return {
    id: 'fewer-guests',
    detail: `Invite ${target} instead of ${core.ctx.guests}: food, rooms, favours and transport fall with every guest.`,
    savingInr: saving,
    patch,
    judge: after,
  };
};

const offPeakDate: Candidate = ({ context, core }) => {
  const ctx = core.ctx;
  if (
    ctx.dateMode !== 'dated' ||
    ctx.dateIso === null ||
    ctx.season.offPeak ||
    ctx.season.weekday
  ) {
    return null;
  }
  const weekday = nextDiscountWeekday(ctx.dateIso);
  const saving = Math.round(
    OFF_PEAK_LINES.reduce((sum, category) => sum + lineOf(core, category), 0) *
      (1 - OFF_PEAK_PRICE_FACTOR),
  );
  const patch: ContextPatch = { ops: [{ op: 'setDate', value: weekday }] };
  return {
    id: 'off-peak-date',
    detail: `Move to ${weekday}, a weekday: venue, catering and decor are often about ${OFF_PEAK_SAVING_LABEL} cheaper (check the muhurat first).`,
    savingInr: saving,
    patch,
    judge: withBudget(applyPatch(context, patch), ctx.budgetInr + saving),
  };
};

const simplerCatering: Candidate = ({ context, core }) => {
  const cheaper = CHEAPER_LEVEL[core.money.level];
  // A committee's food is its own line, never priced by caterer class.
  if (cheaper === null || moneyModelOf(core.ctx) === 'committee') return null;
  const saving = core.costCheck.cateringInr.mid - cateringRange(core.ctx, cheaper).mid;
  return {
    id: 'simpler-catering',
    title:
      cheaper === 'standard'
        ? 'Choose a standard multi-cuisine caterer'
        : 'Choose a community caterer or halwai',
    detail: `A ${cheaper} caterer costs about ${formatInr(saving)} less for the same meals.`,
    savingInr: saving,
    judge: withBudget(context, core.ctx.budgetInr + saving),
  };
};

const dropFunction: Candidate = ({ context, core }) => {
  const slices = [...core.budget.byFunction].sort((a, b) => b.amountInr - a.amountInr);
  // The biggest function, and the wedding ceremony itself, are never dropped.
  const drop = slices.slice(1).find((slice) => slice.functionKind !== 'wedding');
  if (drop === undefined) return null;
  const patch: ContextPatch = { ops: [{ op: 'removeFunction', value: drop.functionKind }] };
  const after = applyPatch(context, patch);
  const name = drop.label.toLowerCase();
  return {
    id: 'drop-function',
    title: `Drop or merge the ${name}`,
    detail: `Merging the ${name} into another function frees its ${formatInr(drop.amountInr)} slice.`,
    savingInr: drop.amountInr,
    patch,
    // Bottom-up estimates already shrink with one function fewer; the wedding bands do not,
    // so for a wedding the freed slice is judged as money that goes further.
    judge:
      core.ctx.family === 'wedding'
        ? withBudget(after, core.ctx.budgetInr + drop.amountInr)
        : after,
  };
};

const hometown: Candidate = ({ context, core, todayIso }) => {
  if (!context.destination) return null;
  const after = { ...context, destination: false };
  const saving = core.costCheck.roomsInr - rerun(after, todayIso).costCheck.roomsInr;
  if (saving <= 0) return null;
  return {
    id: 'hometown',
    detail: `Hosting in your home city prices guest rooms at local rates, saving about ${formatInr(saving)}.`,
    savingInr: saving,
    judge: withBudget(after, core.ctx.budgetInr + saving),
  };
};

/** Guest, date, caterer, function and destination levers (LEV-01…05), in LEVER_IDS order. */
export const MONEY_CANDIDATES: readonly Candidate[] = [
  fewerGuests,
  offPeakDate,
  simplerCatering,
  dropFunction,
  hometown,
];
