/**
 * Budget allocation (BUD-01…09, FN-02, CST-06) — rupees per category, per function and GST.
 *
 * Responsibility: turn the share table into budget lines whose rupees sum exactly to the
 * total (BUD-09), slice every line across the planned functions (per-guest lines by guest
 * count, fixed lines by function weight; FN-02), and show the GST inside each line at its
 * default rate (CST-06, applied once). Boundary: allocation only; shares come from
 * budget-shares.ts and the verdict judges the total.
 */
import { BUDGET_CATEGORIES, CATEGORY_PROFILES } from '../domain/budget-categories.js';
import { FUNCTION_PROFILES } from '../domain/functions.js';
import { GST_EFFECTIVE_FROM_ISO, gstRateForCategory } from '../domain/gst.js';
import { formatInr, formatPercent } from '../format.js';
import type { BudgetLine, FunctionBudget, GstSummary, PlanBudget } from '../schemas/plan-money.js';
import type { ShareResult } from './budget-shares.js';
import { invitedAt } from './headcount.js';
import { allocateByWeights, splitByBasisPoints } from './money-split.js';
import { BP_PER_PERCENT, PERCENT } from './percent.js';
import type { TraceLog } from './trace.js';
import type { NormalisedContext } from './types.js';

/** The CST-06 note quotes two default rates, read from the same table the lines use. */
const GST_NOTE_RATES = `catering ${gstRateForCategory('catering') ?? 0}%, venue, decor and photo ${gstRateForCategory('venue') ?? 0}%`;

export interface BudgetResult {
  readonly budget: PlanBudget;
  readonly gst: GstSummary;
}

function stepEffect(ruleId: string, touched: readonly string[]): string {
  return `${ruleId} adjusted ${touched.length} categories: ${touched.join(', ')}.`;
}

interface StepIds {
  readonly all: readonly string[];
  readonly byCategory: ReadonlyMap<string, readonly string[]>;
}

/** Records one trace item per share step and returns, per category, the steps that moved it. */
function traceSteps(ctx: NormalisedContext, shares: ShareResult, trace: TraceLog): StepIds {
  const all: string[] = [];
  const byCategory = new Map<string, string[]>();
  for (const step of shares.steps) {
    const id = trace.add({
      ruleId: step.ruleId,
      inputs: [
        ['kind', ctx.kind],
        ['guests', ctx.guests],
        ['priorities', ctx.input.priorities.join(', ') || 'none'],
        ['switched off', ctx.input.disabledCategories.join(', ') || 'none'],
      ],
      effect: stepEffect(step.ruleId, step.touched),
    });
    all.push(id);
    for (const category of step.touched) {
      byCategory.set(category, [...(byCategory.get(category) ?? []), id]);
    }
  }
  return { all, byCategory };
}

/** FN-02: each line sliced across functions; per-guest lines by guests, the rest by weight. */
function byFunction(
  ctx: NormalisedContext,
  lines: readonly BudgetLine[],
  traceId: string,
): FunctionBudget[] {
  const guests = ctx.functions.map((kind) => invitedAt(ctx, kind));
  const weights = ctx.functions.map((kind) => FUNCTION_PROFILES[kind].weight);
  const slices = lines.map((line) =>
    allocateByWeights(line.amountInr, line.costType === 'per-guest' ? guests : weights),
  );
  return ctx.functions.map((kind, index) => {
    const parts = lines
      .map((line, lineIndex) => ({
        category: line.category,
        amountInr: slices[lineIndex]?.[index] ?? 0,
      }))
      .filter((part) => part.amountInr > 0);
    const amountInr = parts.reduce((sum, part) => sum + part.amountInr, 0);
    const count = guests[index] ?? 1;
    return {
      functionKind: kind,
      label: ctx.traditionProfile?.functionNames[kind] ?? FUNCTION_PROFILES[kind].label,
      guests: count,
      amountInr,
      perGuestInr: Math.round(amountInr / count),
      lines: parts,
      traceIds: [traceId],
    };
  });
}

function gstSummary(lines: readonly BudgetLine[], traceId: string): GstSummary {
  const gstLines = lines.map((line) => ({
    category: line.category,
    ratePct: line.gstPct,
    // Lines are all-in spend, so the GST inside a line is amount × rate ÷ (100 + rate).
    gstInr:
      line.gstPct === null
        ? 0
        : Math.round((line.amountInr * line.gstPct) / (PERCENT + line.gstPct)),
  }));
  return {
    effectiveFromIso: GST_EFFECTIVE_FROM_ISO,
    totalInr: gstLines.reduce((sum, line) => sum + line.gstInr, 0),
    note: 'Each line includes GST at its default rate since 22 Sep 2025; the real rate depends on the contract.',
    lines: gstLines,
    traceIds: [traceId],
  };
}

/**
 * Builds the budget section and the GST view from the share table.
 * @example
 * const { budget } = buildBudget(ctx, computeShares(ctx), trace);
 * budget.lines.reduce((sum, line) => sum + line.amountInr, 0) === budget.totalInr; // true
 */
export function buildBudget(
  ctx: NormalisedContext,
  shares: ShareResult,
  trace: TraceLog,
): BudgetResult {
  const stepIds = traceSteps(ctx, shares, trace);
  const total = ctx.budgetInr;
  const held = BUDGET_CATEGORIES.filter((category) => shares.shares[category] > 0);
  const amounts = splitByBasisPoints(
    total,
    held.map((category) => [category, shares.shares[category]] as const),
    'contingency',
  );
  const exactId = trace.add({
    ruleId: 'BUD-09',
    inputs: [
      ['total', formatInr(total)],
      ['lines', held.length],
    ],
    effect: `Every share is rounded down to whole rupees and the remainder goes to contingency, so the ${held.length} lines add up to exactly ${formatInr(total)}.`,
  });
  const lines: BudgetLine[] = held.map((category) => {
    const profile = CATEGORY_PROFILES[category];
    const amountInr = amounts.get(category) ?? 0;
    return {
      category,
      label: profile.label,
      amountInr,
      shareBp: shares.shares[category],
      costType: profile.costType,
      ...(profile.costType === 'fixed' ? {} : { perGuestInr: Math.round(amountInr / ctx.guests) }),
      gstPct: gstRateForCategory(category),
      priority: ctx.input.priorities.some((priority) => priority === category),
      traceIds: [...(stepIds.byCategory.get(category) ?? []), exactId],
    };
  });
  const functionId = trace.add({
    ruleId: 'FN-02',
    inputs: [['functions', ctx.functions.join(', ')]],
    effect:
      'Per-guest lines are sliced by each function’s guest count and fixed lines by function weight.',
  });
  const gstId = trace.add({
    ruleId: 'CST-06',
    inputs: [['lines', lines.length]],
    effect: `GST is shown inside each line at its default rate (${GST_NOTE_RATES}), once.`,
  });
  const amountOf = (category: string): number =>
    lines.find((line) => line.category === category)?.amountInr ?? 0;
  const budget: PlanBudget = {
    totalInr: total,
    source: ctx.budgetSource,
    jewelleryInr: amountOf('jewellery'),
    contingencyInr: amountOf('contingency'),
    perGuestInr: Math.round(total / ctx.guests),
    lines,
    byFunction: byFunction(ctx, lines, functionId),
    traceIds: [...stepIds.all, exactId],
  };
  return { budget, gst: gstSummary(lines, gstId) };
}

/**
 * The share of a line as a percentage, for display ("25%").
 * @example
 * sharePercent(2500); // '25%'
 */
export function sharePercent(shareBp: number): string {
  return formatPercent(shareBp / BP_PER_PERCENT);
}
