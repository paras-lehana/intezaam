/**
 * Budget shares (BUD-01…08) — how the budget divides across categories, in basis points.
 *
 * Responsibility: start from the event's base split, then apply the scale, destination,
 * outstation (a guest-rooms line once anyone travels in), home-party, priority, switched-off,
 * planner, contingency-floor and jewellery rules in order, keeping the table at exactly
 * 10,000 bp after every step, and record which step touched which category. Boundary:
 * shares only; rupees come from budget.ts.
 */
import { BUDGET_CATEGORIES, type BudgetCategory } from '../domain/budget-categories.js';
import {
  DESTINATION_SHIFT_BP,
  HOME_PARTY_VENUE_BP,
  JEWELLERY_SHARE_OF_TOTAL,
  OUTSTATION_ACCOMMODATION_DEFAULT_BP,
  PLANNER_DEFAULT_BP,
  PRIORITY_SHIFT_BP,
  SCALE_SPLIT_SHIFTS_BP,
} from '../domain/budget-shifts.js';
import {
  BASIS_POINTS_TOTAL,
  BUDGET_SPLITS,
  baseSplitFor,
  type SplitBp,
} from '../domain/budget-splits.js';
import { FAMILY_PROFILES } from '../domain/events.js';
import { OUTSTATION_HEAVY_SHARE } from '../domain/headcount.js';
import type { RuleId } from '../domain/rule-ids.js';
import { allocateByWeights } from './money-split.js';
import type { ClassifiedContext, ShareTable } from './types.js';

/** One applied rule and the categories it moved (each line's "Why this?" cites it). */
export interface ShareStep {
  readonly ruleId: RuleId;
  readonly touched: readonly BudgetCategory[];
}

export interface ShareResult {
  readonly shares: ShareTable;
  readonly steps: readonly ShareStep[];
}

type MutableShares = Record<BudgetCategory, number>;

/** BUD-06: jewellery is 15% of the grand total, i.e. 1,500 bp. */
const JEWELLERY_BP = Math.round(JEWELLERY_SHARE_OF_TOTAL * BASIS_POINTS_TOTAL);

/**
 * BUD-04: a split with no guest-rooms line (a 60th, a party, a family function) starts one at
 * the wedding split's share once any guest travels in, so the rooms CST-05 prices have a line
 * to be checked against; outstation-heavy events rise to the 8–10% band instead.
 */
const ROOMS_LINE_START_BP = BUDGET_SPLITS.wedding.shares.accommodation ?? 0;

function fromSplit(split: SplitBp): MutableShares {
  const shares: MutableShares = {
    venue: 0,
    catering: 0,
    decor: 0,
    photo_video: 0,
    attire: 0,
    jewellery: 0,
    makeup: 0,
    mehendi: 0,
    entertainment: 0,
    invites: 0,
    gifts: 0,
    transport: 0,
    accommodation: 0,
    rituals: 0,
    sound_light: 0,
    safety_medical: 0,
    cultural_prizes: 0,
    promotion: 0,
    volunteers_sanitation: 0,
    planner: 0,
    contingency: 0,
  };
  for (const category of BUDGET_CATEGORIES) shares[category] = split[category] ?? 0;
  return shares;
}

function total(shares: MutableShares): number {
  return BUDGET_CATEGORIES.reduce((sum, category) => sum + shares[category], 0);
}

function others(exclude: readonly BudgetCategory[]): BudgetCategory[] {
  return BUDGET_CATEGORIES.filter((category) => !exclude.includes(category));
}

/**
 * Moves `amount` bp into (positive) or out of (negative) the `pool` categories in
 * proportion to their current shares, exactly. A take is capped at what the pool holds,
 * so no category goes below zero; returns the bp actually moved.
 */
function spread(shares: MutableShares, amount: number, pool: readonly BudgetCategory[]): number {
  const holders = pool.filter((category) => shares[category] > 0);
  const held = holders.reduce((sum, category) => sum + shares[category], 0);
  const moved = amount < 0 ? Math.min(-amount, held) : amount;
  if (holders.length === 0 || moved === 0) return 0;
  const parts = allocateByWeights(
    moved,
    holders.map((category) => shares[category]),
  );
  holders.forEach((category, index) => {
    shares[category] += Math.sign(amount) * (parts[index] ?? 0);
  });
  return moved;
}

/**
 * Raises one category to `target` bp, taking the difference pro rata from the rest (except
 * the `protect`ed categories).
 */
function raiseTo(
  shares: MutableShares,
  category: BudgetCategory,
  target: number,
  protect: readonly BudgetCategory[] = [],
): boolean {
  const missing = target - shares[category];
  if (missing <= 0) return false;
  shares[category] += spread(shares, -missing, others([category, ...protect]));
  return true;
}

/** Adds a net-zero shift table, clamping at zero and re-spreading any clamp loss. */
function applyShift(shares: MutableShares, shift: SplitBp): BudgetCategory[] {
  const touched = BUDGET_CATEGORIES.filter((category) => shift[category] !== undefined);
  for (const category of touched) {
    shares[category] = Math.max(0, shares[category] + (shift[category] ?? 0));
  }
  spread(shares, BASIS_POINTS_TOTAL - total(shares), others([]));
  return touched;
}

/** BUD-05: up to +3 points to each top-3 category, from the cut category first, then pro rata. */
function applyPriorities(shares: MutableShares, ctx: ClassifiedContext): BudgetCategory[] {
  const priorities = ctx.input.priorities.filter(
    (category) => !ctx.input.disabledCategories.includes(category),
  );
  if (priorities.length === 0) return [];
  const needed = PRIORITY_SHIFT_BP * priorities.length;
  const cut = ctx.input.cut;
  const cutList: BudgetCategory[] = cut === undefined ? [] : [cut];
  const fromCut = cut === undefined ? 0 : Math.min(needed, shares[cut]);
  if (cut !== undefined) shares[cut] -= fromCut;
  const pool = others([...priorities, ...cutList, 'contingency']);
  const moved = fromCut + spread(shares, -(needed - fromCut), pool);
  const gains = allocateByWeights(
    moved,
    priorities.map(() => 1),
  );
  priorities.forEach((category, index) => {
    shares[category] += gains[index] ?? 0;
  });
  return [...priorities, ...cutList];
}

/**
 * BUD-06: switched-off categories are spread pro rata over what remains. Contingency can
 * only go down to its floor (BUD-07: never 0), never off.
 */
function applyDisabled(
  shares: MutableShares,
  ctx: ClassifiedContext,
  floor: number,
): BudgetCategory[] {
  const disabled = ctx.input.disabledCategories;
  const off = disabled.filter((category) => shares[category] > 0);
  for (const category of off) {
    const keep = category === 'contingency' ? Math.min(floor, shares[category]) : 0;
    const freed = shares[category] - keep;
    shares[category] = keep;
    spread(shares, freed, others(disabled));
  }
  return off;
}

/** BUD-04: the guest-rooms share outstation guests call for (0 leaves the split alone). */
function roomsTargetBp(ctx: ClassifiedContext): number {
  const share = ctx.input.outstationShare;
  if (share > OUTSTATION_HEAVY_SHARE) return OUTSTATION_ACCOMMODATION_DEFAULT_BP;
  const hasRoomsLine = baseSplitFor(ctx.kind).shares.accommodation !== undefined;
  return share > 0 && !hasRoomsLine ? ROOMS_LINE_START_BP : 0;
}

/**
 * Applies BUD-01…08 to a classified context; the result always sums to 10,000 bp.
 * @example
 * const { shares } = computeShares(jaipurCtx);
 * Object.values(shares).reduce((a, b) => a + b, 0); // 10000
 */
export function computeShares(ctx: ClassifiedContext): ShareResult {
  const shares = fromSplit(baseSplitFor(ctx.kind).shares);
  const steps: ShareStep[] = [
    { ruleId: 'BUD-01', touched: BUDGET_CATEGORIES.filter((category) => shares[category] > 0) },
  ];
  const record = (ruleId: RuleId, touched: readonly BudgetCategory[]): void => {
    if (touched.length > 0) steps.push({ ruleId, touched });
  };
  const disabled = ctx.input.disabledCategories;
  // BUD-07 first, then protected: later moves never push contingency below its floor.
  const floor = FAMILY_PROFILES[ctx.family].contingencyFloorBp;
  record('BUD-07', raiseTo(shares, 'contingency', floor) ? ['contingency'] : []);
  if (ctx.family === 'wedding') {
    record('BUD-02', applyShift(shares, SCALE_SPLIT_SHIFTS_BP[ctx.scale]));
    if (ctx.input.destination) record('BUD-03', applyShift(shares, DESTINATION_SHIFT_BP));
  }
  const roomsBp = roomsTargetBp(ctx);
  if (roomsBp > 0) {
    const raised = raiseTo(shares, 'accommodation', roomsBp, ['contingency']);
    record('BUD-04', raised ? ['accommodation'] : []);
  }
  if (ctx.family === 'birthday' && ctx.setting === 'home' && shares.venue > HOME_PARTY_VENUE_BP) {
    const freed = shares.venue - HOME_PARTY_VENUE_BP;
    shares.venue = HOME_PARTY_VENUE_BP;
    spread(shares, freed, others(['venue']));
    record('BUD-08', ['venue']);
  }
  record('BUD-05', applyPriorities(shares, ctx));
  record('BUD-06', applyDisabled(shares, ctx, floor));
  if (ctx.plannerHired && !disabled.includes('planner')) {
    const raised = raiseTo(shares, 'planner', PLANNER_DEFAULT_BP, ['contingency']);
    record('BUD-06', raised ? ['planner'] : []);
  }
  if (ctx.input.toggles.jewellery && !disabled.includes('jewellery')) {
    // Taking 15% pro rata leaves the core (contingency floor included) at 85% of the total.
    record('BUD-06', raiseTo(shares, 'jewellery', JEWELLERY_BP) ? ['jewellery'] : []);
  }
  return { shares, steps };
}
