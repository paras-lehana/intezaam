/**
 * Wedding-rows money verdict (VER-M, 09 Gap 2 §2.4) — weddings, and the 60th priced like one.
 *
 * Responsibility: compare event spend per billable guest with the city's published rows after
 * the catering-floor stretch test, and say it in plain copy: Needs changes, Simple &
 * home-style, Lean, Balanced or Premium, with a "close to" note near a boundary. A 60th uses
 * the same rows (04 §5.2) and says so, at grade D. Copy never says "not feasible".
 * Boundary: judges the budget; the levers say what would change it.
 */
import type { CateringLevel } from '../domain/catering.js';
import { formatInr, formatInrRange, formatLakh } from '../format.js';
import type { BudgetLine, MoneyStatus } from '../schemas/plan-money.js';
import { cateringFloorInr } from './catering.js';
import { expectedGuests } from './headcount.js';
import {
  BAND_BASIS_GUESTS,
  billableGuests,
  classifyWeddingSpend,
  EVENT_SPEND_EXCLUDES,
  weddingRow,
} from './money-bands.js';
import { rowsSubject } from './money-model.js';
import { PERCENT } from './percent.js';
import type { TraceLog } from './trace.js';
import type { NormalisedContext } from './types.js';
import { MONEY_LABELS, type MoneyVerdict } from './verdict-labels.js';


/** Gap 2 §2.5: the caterer class follows the band (the user can still choose another). */
const LEVEL_BY_BAND: Readonly<Record<MoneyStatus, CateringLevel>> = {
  stretch: 'community',
  'home-style': 'community',
  lean: 'standard',
  balanced: 'standard',
  premium: 'premium',
};

/**
 * Event spend: the budget minus jewellery, outfits and guest rooms (the rows exclude them).
 * @example
 * eventSpendInr(lines); // total − attire − accommodation − jewellery
 */
export function eventSpendInr(lines: readonly BudgetLine[]): number {
  return lines
    .filter((line) => !EVENT_SPEND_EXCLUDES.includes(line.category))
    .reduce((sum, line) => sum + line.amountInr, 0);
}

function copyFor(band: MoneyStatus, place: string, noun: string, detail: string): string {
  const copy: Record<MoneyStatus, string> = {
    stretch: `Needs changes — see the levers. ${detail}`,
    'home-style': `Simple & home-style: works as a home, community-hall or dharamshala ${noun} with a local caterer. ${detail}`,
    lean: `Lean: inside the published budget range for ${place}; little room for extras.`,
    balanced: `Balanced: inside the published mid-range for ${place}.`,
    premium: `Premium: at or above the published luxury range for ${place}.`,
  };
  return copy[band];
}

/**
 * VER-M for a wedding-rows event (a wedding, or a 60th priced like an intimate wedding).
 * @example
 * weddingMoney(jaipurCtx, budget.lines, trace).status; // 'balanced'
 */
export function weddingMoney(
  ctx: NormalisedContext,
  lines: readonly BudgetLine[],
  trace: TraceLog,
): MoneyVerdict {
  const subject = rowsSubject(ctx.kind);
  const { row, place, anchored } = weddingRow(ctx);
  const eventSpend = eventSpendInr(lines);
  const billable = billableGuests(expectedGuests(ctx));
  const floorInr = cateringFloorInr(ctx);
  const { band, near } = classifyWeddingSpend(
    { eventSpendInr: eventSpend, billable, floorInr },
    row,
  );
  const perGuest = Math.round(eventSpend / billable);
  const perGuestMin = (amount: number): string => formatInr(Math.round(amount / BAND_BASIS_GUESTS));
  const detail =
    band === 'stretch'
      ? `At the lowest local caterer rate, food alone would take ${Math.round((floorInr * PERCENT) / Math.max(eventSpend, 1))}% of your event spend.`
      : `Published budget-tier weddings in ${place} start near ${formatLakh(Math.round((row.budget.min * billable) / BAND_BASIS_GUESTS))}.`;
  const nearText = near === null ? '' : ` Close to ${MONEY_LABELS[near]}.`;
  const basis = subject.basisNote === null ? '' : ` ${subject.basisNote}`;
  const id = trace.add({
    ruleId: 'VER-M',
    inputs: [
      ['compared with', anchored ? `${place} row` : `${place}, scaled`],
      ['event spend', formatInr(eventSpend)],
      ['billable guests', billable],
      ['per guest', formatInr(perGuest)],
      ['lean from', perGuestMin(row.budget.min)],
      ['balanced from', perGuestMin(row.mid.min)],
      ['premium from', perGuestMin(row.luxury.min)],
      ['food floor', formatInr(floorInr)],
      // The estimate card shows the mid-range row; the trace puts it beside the band it is not.
      ['typical mid-range', formatInrRange(ctx.estimate.low, ctx.estimate.high)],
      ['band', MONEY_LABELS[band]],
    ],
    effect: `${formatInr(perGuest)} of event spend per guest against ${place}: ${MONEY_LABELS[band]}.${nearText}${basis}`,
    sourceIds: subject.sourceIds,
    confidence: subject.confidence,
  });
  return {
    status: band,
    reason: `${copyFor(band, place, subject.noun, detail)}${nearText}${basis}`,
    traceIds: [id],
    level: LEVEL_BY_BAND[band],
  };
}
