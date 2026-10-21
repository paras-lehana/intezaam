/**
 * The money core of a plan — context, budget, headcount, funding, verdict and cost check.
 *
 * Responsibility: run the rules every lever must re-run (CTX, BUD, HC, VER-F, VER-M, CST)
 * in one place, so `buildPlan` and the lever pricing go through exactly the same engine; the
 * cost check sees both the catering line and the guest-rooms line.
 * Boundary: no timeline, vendors or safety; plan.ts adds those for the full plan.
 */
import type { EventContext } from '../schemas/context.js';
import type { CostCheck, GstSummary, PlanBudget } from '../schemas/plan-money.js';
import type { Headcount } from '../schemas/plan-people.js';
import { buildBudget } from './budget.js';
import { computeShares } from './budget-shares.js';
import { normaliseContext } from './context.js';
import { type ContextTraceIds, traceContext } from './context-trace.js';
import { buildCostCheck } from './cost-check.js';
import { computeFunding, type Funding } from './funding.js';
import { buildHeadcount } from './headcount.js';
import { roomsLineInr } from './rooms.js';
import type { TraceLog } from './trace.js';
import type { NormalisedContext } from './types.js';
import { type AxisVerdict, fundingVerdict } from './verdict.js';
import { moneyVerdict, type MoneyVerdict } from './verdict-money.js';

export interface FundingResult {
  readonly funding: Funding;
  readonly verdict: AxisVerdict<Funding['status']>;
}

export interface CorePlan {
  readonly ctx: NormalisedContext;
  readonly contextIds: ContextTraceIds;
  readonly budget: PlanBudget;
  readonly gst: GstSummary;
  readonly headcount: Headcount;
  readonly funding: FundingResult | null;
  readonly money: MoneyVerdict;
  readonly costCheck: CostCheck;
}

/**
 * Runs the money core for a context.
 * @example
 * buildCore(sampleContext('jaipur-wedding', today), today, createTraceLog()).money.status; // 'balanced'
 */
export function buildCore(context: EventContext, todayIso: string, trace: TraceLog): CorePlan {
  const ctx = normaliseContext(context, todayIso);
  const contextIds = traceContext(ctx, trace);
  const { budget, gst } = buildBudget(ctx, computeShares(ctx), trace);
  const headcount = buildHeadcount(ctx, trace);
  const funds = computeFunding(ctx);
  const funding = funds === null ? null : { funding: funds, verdict: fundingVerdict(funds, trace) };
  const fundingInput =
    funding === null ? null : { funding: funding.funding, traceIds: funding.verdict.traceIds };
  const money = moneyVerdict(ctx, budget.lines, fundingInput, trace);
  const cateringLineInr = budget.lines.find((line) => line.category === 'catering')?.amountInr ?? 0;
  // A switched-off rooms line means guests book their own rooms, so the host pays for none.
  const roomsOff = ctx.input.disabledCategories.includes('accommodation');
  const costCheck = buildCostCheck(
    ctx,
    {
      level: money.level,
      cateringLineInr,
      rooms: roomsOff ? 0 : headcount.rooms,
      roomsLineInr: roomsLineInr(budget.lines),
      money: money.status,
    },
    trace,
  );
  return { ctx, contextIds, budget, gst, headcount, funding, money, costCheck };
}
