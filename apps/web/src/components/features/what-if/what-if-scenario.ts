/**
 * What-if controls as data: the slider and picker positions, and the typed change they mean.
 *
 * Responsibility: a scenario (guests, budget ±%, date shift, venue setting, a dropped
 * function) that starts at "no change", the ranges each control offers, and the
 * ContextPatch the scenario turns into — only the controls that moved become ops.
 * Boundary: pure; simulate.ts runs the engine, the components render the controls.
 */
import { type FunctionKind, type VenueSetting, addDaysIso } from '@intezaam/core/domain';
import {
  type ContextPatch,
  type EventContext,
  type PatchOp,
  type Plan,
  MAX_GUESTS,
  MIN_GUESTS,
} from '@intezaam/core/schemas';

export interface WhatIfScenario {
  readonly guests: number;
  readonly budgetPct: number;
  readonly dateShiftDays: number;
  readonly setting: VenueSetting;
  /** '' = keep every function. */
  readonly dropFunction: FunctionKind | '';
}

export interface ControlRange {
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

/** Guests can halve or grow by half: the "invite fewer / more" talk families actually have. */
const GUEST_SWING = 0.5;
/** Lists of 50+ move in fives (one family at a time); smaller parties move one guest at a time. */
const LARGE_LIST_GUESTS = 50;
const LARGE_LIST_STEP = 5;
/** Budget moves ±50% in 5% steps: beyond that it is a different event, not a trade-off. */
export const BUDGET_RANGE: ControlRange = { min: -50, max: 50, step: 5 };
/** Dates move by whole weeks (the weekday stays), up to about a season either way. */
export const DATE_SHIFT_RANGE: ControlRange = { min: -91, max: 91, step: 7 };
/** Families talk in thousands, so a recomputed budget is rounded to ₹1,000. */
const BUDGET_ROUNDING_INR = 1_000;
const PERCENT = 100;

/**
 * The guest slider's range around today's count.
 * @example
 * guestRange(300); // { min: 150, max: 450, step: 5 }
 */
export function guestRange(guests: number): ControlRange {
  return {
    min: Math.max(MIN_GUESTS, Math.round(guests * (1 - GUEST_SWING))),
    max: Math.min(MAX_GUESTS, Math.round(guests * (1 + GUEST_SWING))),
    step: guests >= LARGE_LIST_GUESTS ? LARGE_LIST_STEP : 1,
  };
}

/**
 * The scenario that changes nothing.
 * @example
 * startScenario(context).guests === context.guests; // true
 */
export function startScenario(context: EventContext): WhatIfScenario {
  return {
    guests: context.guests,
    budgetPct: 0,
    dateShiftDays: 0,
    setting: context.venueSetting,
    dropFunction: '',
  };
}

/**
 * The budget a percentage move gives, rounded to ₹1,000 (never below ₹1,000).
 * @example
 * shiftedBudget(2_500_000, -10); // 2250000
 */
export function shiftedBudget(budgetInr: number, pct: number): number {
  const raw = (budgetInr * (PERCENT + pct)) / PERCENT;
  return Math.max(BUDGET_ROUNDING_INR, Math.round(raw / BUDGET_ROUNDING_INR) * BUDGET_ROUNDING_INR);
}

function moves(scenario: WhatIfScenario, context: EventContext, plan: Plan): PatchOp[] {
  const ops: PatchOp[] = [];
  if (scenario.guests !== context.guests) ops.push({ op: 'setGuests', value: scenario.guests });
  if (scenario.budgetPct !== 0) {
    ops.push({
      op: 'setBudget',
      value: shiftedBudget(plan.contextEcho.budgetInr, scenario.budgetPct),
    });
  }
  const moved =
    context.dateIso === undefined || scenario.dateShiftDays === 0
      ? undefined
      : addDaysIso(context.dateIso, scenario.dateShiftDays);
  if (moved !== undefined) ops.push({ op: 'setDate', value: moved });
  if (scenario.setting !== context.venueSetting) {
    ops.push({ op: 'setVenueSetting', value: scenario.setting });
  }
  if (scenario.dropFunction !== '')
    ops.push({ op: 'removeFunction', value: scenario.dropFunction });
  return ops;
}

/**
 * The typed change a scenario means, or null when no control has moved.
 * @example
 * scenarioPatch({ ...startScenario(context), guests: 250 }, context, plan);
 * // { ops: [{ op: 'setGuests', value: 250 }] }
 */
export function scenarioPatch(
  scenario: WhatIfScenario,
  context: EventContext,
  plan: Plan,
): ContextPatch | null {
  const ops = moves(scenario, context, plan);
  return ops.length === 0 ? null : { ops };
}
