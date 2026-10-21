/**
 * Community money (feature #5 and CST-01 for community events) — the estimate and the food
 * line, built from the community budget heads instead of per-plate wedding logic.
 *
 * Responsibility: the sources publish no per-flat or per-visitor cost ("the committee sets
 * it"), so a community plan is its own budget heads (structure, decor, sound, food and
 * prasad, puja, cultural, safety, contingency). With the committee's budget, the estimate IS
 * the planned spend (from the heads before the buffer up to the whole plan), so it always
 * agrees with the funding verdict (VER-F). Without one, a labelled grade-D rate per visitor
 * prices the food-and-prasad head and the default split grosses it up. The food check reports
 * the line per visitor and never flags it "short": there is nothing published to compare it
 * with. Boundary: estimates and assumptions, never quotes; funding.ts judges who pays.
 */
import { BASIS_POINTS_TOTAL, baseSplitFor } from '../domain/budget-splits.js';
import { type NumberRange, range } from '../domain/units.js';
import { formatInr, formatPercent } from '../format.js';
import type { InrEstimate } from '../schemas/common.js';
import type { CostCheck } from '../schemas/plan-money.js';
import { computeShares } from './budget-shares.js';
import { CATERING_BASIS_INFO } from './catering-basis.js';
import { BP_PER_PERCENT } from './percent.js';
import type { TraceLog } from './trace.js';
import type { ClassifiedContext, NormalisedContext } from './types.js';

/**
 * Grade D, used ONLY when the committee gives no budget: about one simple prasad-and-snack
 * serving per visitor. No published rate exists (searches on 2026-10-20 found only
 * marketing pages), so the trace marks it as an assumption and entering a budget replaces it.
 */
export const PRASAD_PER_VISITOR_INR: NumberRange = range(40, 80);

/** The base split's food-and-prasad head: what such an event spends on food (22%, grade D). */
function foodShareBp(ctx: ClassifiedContext): number {
  return baseSplitFor(ctx.kind).shares.catering ?? BASIS_POINTS_TOTAL;
}

/**
 * What a community plan costs: the committee's planned spend when given (the heads before
 * the contingency buffer up to the whole plan), else visitors × the assumed prasad rate
 * grossed up by the food-and-prasad share of the default split.
 * @example
 * communityEstimate(ganeshCtx); // { low: 315000, mid: 350000, high: 350000 }
 */
export function communityEstimate(ctx: ClassifiedContext): InrEstimate {
  const planned = ctx.input.budgetInr;
  if (planned !== undefined) {
    const bufferBp = computeShares(ctx).shares.contingency;
    const buffer = Math.round((planned * bufferBp) / BASIS_POINTS_TOTAL);
    return { low: planned - buffer, mid: planned, high: planned };
  }
  const gross = (perVisitor: number): number =>
    Math.round((ctx.footfall * perVisitor * BASIS_POINTS_TOTAL) / foodShareBp(ctx));
  const low = gross(PRASAD_PER_VISITOR_INR.min);
  const high = gross(PRASAD_PER_VISITOR_INR.max);
  return { low, mid: Math.round((low + high) / 2), high };
}

function foodNotes(ctx: NormalisedContext, lineInr: number, perVisitor: number): string[] {
  const share = formatPercent(foodShareBp(ctx) / BP_PER_PERCENT);
  const basis =
    ctx.budgetSource === 'estimate'
      ? `No budget was given, so food and prasad are assumed at ${formatInr(PRASAD_PER_VISITOR_INR.min)}–${formatInr(PRASAD_PER_VISITOR_INR.max)} a visitor (an assumption); enter the committee's budget to replace it.`
      : `Your food and prasad line of ${formatInr(lineInr)} gives about ${formatInr(perVisitor)} for each of ${ctx.footfall.toLocaleString('en-IN')} visitors — an assumption the committee can change.`;
  return [
    CATERING_BASIS_INFO.prasad.note,
    basis,
    `Food and prasad start at ${share} of the plan (the default community split, an assumption).`,
  ];
}

/**
 * CST-01 for a community event: the food-and-prasad line per visitor, never "short".
 * @example
 * communityFoodCheck(ganeshCtx, 87_500, trace).perPlateInr.min; // 73 a visitor
 */
export function communityFoodCheck(
  ctx: NormalisedContext,
  line: number,
  trace: TraceLog,
): CostCheck {
  const perVisitor = Math.round(line / ctx.footfall);
  const info = CATERING_BASIS_INFO.prasad;
  const id = trace.add({
    ruleId: 'CST-01',
    inputs: [
      ['visitors', ctx.footfall],
      ['food and prasad line', formatInr(line)],
      ['per visitor', formatInr(perVisitor)],
      ['budget', ctx.budgetSource === 'user' ? 'the committee’s' : 'our estimate'],
    ],
    effect: `No per-plate pricing for a community event: the food and prasad line gives about ${formatInr(perVisitor)} a visitor.`,
    sourceIds: info.sourceIds,
    confidence: info.confidence,
  });
  return {
    perPlateInr: { min: perVisitor, max: perVisitor },
    plates: ctx.footfall,
    taxesServicePct: 0,
    cateringInr: { low: line, mid: line, high: line },
    roomsInr: 0,
    cateringLineInr: line,
    gapInr: 0,
    status: 'covered',
    notes: foodNotes(ctx, line, perVisitor),
    traceIds: [id],
  };
}
