/**
 * Money verdict (VER-M, VER-F money axis) — is the budget enough for the plan as described?
 *
 * Responsibility: pick the judge from the event's money model — wedding rows (weddings and
 * the 60th, verdict-wedding.ts), the published party band (first, kids' and teen birthdays),
 * a bottom-up estimate (milestone birthdays and family functions) or the committee's funding
 * (community events: covered spend reads Balanced) — and trace the comparison it made.
 * Copy never says "not feasible". Boundary: judges the budget; the levers say what would
 * change it.
 */
import type { SourceId } from '../domain/sources.js';
import type { Confidence } from '../domain/source-types.js';
import { formatInr } from '../format.js';
import type { BudgetLine, MoneyStatus } from '../schemas/plan-money.js';
import { partyBandFor } from './estimate.js';
import type { Funding } from './funding.js';
import { DEFAULT_LEVEL_BY_MODEL, type MoneyModel, moneyModelOf } from './money-model.js';
import { PERCENT } from './percent.js';
import type { TraceLog } from './trace.js';
import type { NormalisedContext } from './types.js';
import { MONEY_LABELS, type MoneyVerdict } from './verdict-labels.js';
import { weddingMoney } from './verdict-wedding.js';

export { MONEY_LABELS, type MoneyVerdict } from './verdict-labels.js';
export { eventSpendInr } from './verdict-wedding.js';

/** Addendum 1 (grade D): below 60% of a band's minimum the money axis reads Stretch. */
const LEAN_FLOOR_PCT = 60;

/**
 * Compares an amount with a min–max range: Stretch below 60% of the minimum, Lean below the
 * minimum, Balanced up to the maximum, Premium above it.
 * @example
 * statusAgainst(40_000, 18_000, 45_000); // 'balanced'
 */
export function statusAgainst(amount: number, min: number, max: number): MoneyStatus {
  if (amount * PERCENT < LEAN_FLOOR_PCT * min) return 'stretch';
  if (amount < min) return 'lean';
  return amount <= max ? 'balanced' : 'premium';
}

interface RangeBasis {
  readonly min: number;
  readonly max: number;
  readonly label: string;
  readonly sourceIds: readonly SourceId[];
  readonly confidence: Confidence;
}

function rangeMoney(ctx: NormalisedContext, basis: RangeBasis, trace: TraceLog): MoneyVerdict {
  const status = statusAgainst(ctx.budgetInr, basis.min, basis.max);
  const reason = `${MONEY_LABELS[status]}: ${formatInr(ctx.budgetInr)} against ${formatInr(basis.min)}–${formatInr(basis.max)} for ${basis.label}.`;
  const id = trace.add({
    ruleId: 'VER-M',
    inputs: [
      ['budget', formatInr(ctx.budgetInr)],
      ['typical range', `${formatInr(basis.min)}–${formatInr(basis.max)}`],
      ['basis', basis.label],
    ],
    effect: reason,
    sourceIds: basis.sourceIds,
    confidence: basis.confidence,
  });
  return {
    status,
    reason: status === 'stretch' ? `Needs changes — see the levers. ${reason}` : reason,
    traceIds: [id],
    level: DEFAULT_LEVEL_BY_MODEL[moneyModelOf(ctx)],
  };
}

function bottomUpMoney(ctx: NormalisedContext, trace: TraceLog): MoneyVerdict {
  return rangeMoney(
    ctx,
    {
      min: ctx.estimate.low,
      max: ctx.estimate.high,
      label: `a bottom-up estimate for ${ctx.guests} guests`,
      sourceIds: ['S-RSA-2026', 'S-VKPLATE-2026', 'S-INTEZAAM-D'],
      confidence: 'D',
    },
    trace,
  );
}

function partyMoney(ctx: NormalisedContext, trace: TraceLog): MoneyVerdict {
  const party = partyBandFor(ctx);
  if (party === null) return bottomUpMoney(ctx, trace);
  return rangeMoney(
    ctx,
    {
      min: party.min,
      max: party.max,
      label: party.band.label.toLowerCase(),
      sourceIds: [party.band.sourceId, 'S-INTEZAAM-D'],
      confidence: 'C',
    },
    trace,
  );
}

function communityMoney(funding: Funding, traceIds: readonly string[]): MoneyVerdict {
  const covered = funding.plannedInr - funding.gapInr;
  // Funded (or in surplus) reads Balanced; at least 60% covered reads Lean; less is Stretch.
  const status: MoneyStatus =
    funding.gapInr === 0
      ? 'balanced'
      : covered * PERCENT < LEAN_FLOOR_PCT * funding.plannedInr
        ? 'stretch'
        : 'lean';
  const reason =
    funding.gapInr === 0
      ? 'Balanced: the planned spend is covered by contributions and offsets.'
      : `${MONEY_LABELS[status]}: ${formatInr(funding.gapInr)} of ${formatInr(funding.plannedInr)} is not yet funded.`;
  return { status, reason, traceIds, level: 'community' };
}

/** A community event's funding and the VER-F trace item the money axis cites. */
export interface FundingInput {
  readonly funding: Funding;
  readonly traceIds: readonly string[];
}

interface JudgeInput {
  readonly ctx: NormalisedContext;
  readonly lines: readonly BudgetLine[];
  readonly funding: FundingInput | null;
  readonly trace: TraceLog;
}

/** One judge per money model; a new model without a judge is a compile error. */
const JUDGES: Readonly<Record<MoneyModel, (input: JudgeInput) => MoneyVerdict>> = {
  'wedding-rows': ({ ctx, lines, trace }) => weddingMoney(ctx, lines, trace),
  'party-bands': ({ ctx, trace }) => partyMoney(ctx, trace),
  'bottom-up': ({ ctx, trace }) => bottomUpMoney(ctx, trace),
  // A community event always has its funding worked out; the fallback keeps the type total.
  committee: ({ ctx, funding, trace }) =>
    funding === null
      ? bottomUpMoney(ctx, trace)
      : communityMoney(funding.funding, funding.traceIds),
};

/**
 * The money verdict for any event, judged by its money model.
 * @example
 * moneyVerdict(jaipurCtx, budget.lines, null, trace).status; // 'balanced'
 */
export function moneyVerdict(
  ctx: NormalisedContext,
  lines: readonly BudgetLine[],
  funding: FundingInput | null,
  trace: TraceLog,
): MoneyVerdict {
  return JUDGES[moneyModelOf(ctx)]({ ctx, lines, funding, trace });
}
