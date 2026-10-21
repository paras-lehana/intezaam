/**
 * Responsibility: the What-if scenario as data — the guest slider's range around today's
 * count, budget moves rounded the way families talk, the "no change" start, and the typed
 * change that only the moved controls become. Boundary: pure; the engine run is tested in
 * simulate.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { addDaysIso } from '@intezaam/core/domain';
import { MAX_GUESTS, MIN_GUESTS, contextPatchSchema } from '@intezaam/core/schemas';
import {
  BUDGET_RANGE,
  DATE_SHIFT_RANGE,
  guestRange,
  scenarioPatch,
  shiftedBudget,
  startScenario,
} from '../../../components/features/what-if/what-if-scenario';
import { samplePanel, undated } from '../panel-fixtures';

/** Guest counts this test owns. */
const LIST_OF_300 = 300;
const SMALL_PARTY = 20;

describe('guestRange', () => {
  it('lets a list halve or grow by half, in fives for a large list', () => {
    const range = guestRange(LIST_OF_300);
    expect(range.min * 2).toBe(LIST_OF_300);
    expect(range.max).toBe(LIST_OF_300 + LIST_OF_300 / 2);
    expect(range.step).toBe(5);
    expect(guestRange(SMALL_PARTY).step).toBe(1);
  });

  it('stays inside the planner bounds', () => {
    expect(guestRange(MIN_GUESTS).min).toBe(MIN_GUESTS);
    expect(guestRange(MAX_GUESTS).max).toBe(MAX_GUESTS);
  });
});

describe('shiftedBudget', () => {
  it('moves the budget by a percentage, rounded to the nearest thousand rupees', () => {
    expect(shiftedBudget(2_500_000, -10)).toBe(2_250_000);
    expect(shiftedBudget(1_234_567, 0)).toBe(1_235_000);
  });

  it('never drops below a thousand rupees', () => {
    expect(shiftedBudget(1_000, BUDGET_RANGE.min)).toBe(1_000);
  });
});

describe('scenarioPatch', () => {
  it('is null until a control moves', () => {
    const { context, plan } = samplePanel('jaipur-wedding');
    expect(scenarioPatch(startScenario(context), context, plan)).toBeNull();
  });

  it('turns each moved control into one typed op the schema accepts', () => {
    const { context, plan } = samplePanel('jaipur-wedding');
    const dropped = plan.contextEcho.functions[0];
    if (dropped === undefined || context.dateIso === undefined)
      throw new Error('the wedding sample is dated with functions');
    const scenario = {
      guests: context.guests - 50,
      budgetPct: 10,
      dateShiftDays: DATE_SHIFT_RANGE.step,
      setting: context.venueSetting === 'indoor' ? ('outdoor' as const) : ('indoor' as const),
      dropFunction: dropped,
    };
    const patch = scenarioPatch(scenario, context, plan);
    expect(patch?.ops).toEqual([
      { op: 'setGuests', value: scenario.guests },
      { op: 'setBudget', value: shiftedBudget(plan.contextEcho.budgetInr, scenario.budgetPct) },
      { op: 'setDate', value: addDaysIso(context.dateIso, DATE_SHIFT_RANGE.step) },
      { op: 'setVenueSetting', value: scenario.setting },
      { op: 'removeFunction', value: dropped },
    ]);
    expect(contextPatchSchema.safeParse(patch).success).toBe(true);
  });

  it('never moves a date that is not fixed yet', () => {
    const { context, plan } = samplePanel('jaipur-wedding');
    const loose = undated(context);
    const scenario = { ...startScenario(loose), dateShiftDays: DATE_SHIFT_RANGE.step };
    expect(scenarioPatch(scenario, loose, plan)).toBeNull();
  });
});
