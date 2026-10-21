/**
 * Guest rooms (CST-05) — what outstation guests' rooms cost, and what their line holds.
 *
 * Responsibility: price rooms × nights × the assumed nightly rate (the destination rate for
 * destination weddings) plus the room GST slab, and read the guest-rooms (accommodation)
 * budget line those rooms are paid from, so the cost check, the risk radar, the vendor
 * payments and the plan facts all compare the same two numbers. Boundary: estimates, never
 * quotes; cost-check.ts words the comparison and risk-probes-money.ts raises the risk.
 */
import { DEFAULT_ROOM_NIGHTS, ROOM_RATE_PER_NIGHT_INR } from '../domain/catering.js';
import { GST_SERVICES } from '../domain/gst.js';
import type { BudgetLine } from '../schemas/plan-money.js';
import { PERCENT } from './percent.js';
import type { ClassifiedContext } from './types.js';

/** CST-05: rooms up to ₹7,500 a night pay 5% GST, above that 18% (S-HNA-2025). */
const ROOM_GST_SLAB_LIMIT_INR = 7_500;

/**
 * CST-05 / CST-06: the GST slab for a nightly room rate (5% up to ₹7,500, else 18%).
 * @example
 * roomGstPct(2_500); // 5
 * roomGstPct(9_000); // 18
 */
export function roomGstPct(ratePerNightInr: number): number {
  const slab =
    ratePerNightInr <= ROOM_GST_SLAB_LIMIT_INR
      ? GST_SERVICES['hotel-rooms-low']
      : GST_SERVICES['hotel-rooms-high'];
  return slab.ratePct;
}

/**
 * CST-05: rooms × nights × the assumed nightly rate (destination rate for destination
 * weddings) plus the room GST slab.
 * @example
 * roomsCostInr(jaipurCtx, 60); // 60 × 2 nights × ₹2,500 × 1.05
 */
export function roomsCostInr(ctx: ClassifiedContext, rooms: number): number {
  const rate = ctx.input.destination
    ? ROOM_RATE_PER_NIGHT_INR.destination
    : ROOM_RATE_PER_NIGHT_INR[ctx.tier];
  return Math.round(rooms * DEFAULT_ROOM_NIGHTS * rate * (1 + roomGstPct(rate) / PERCENT));
}

/**
 * The guest-rooms (accommodation) budget line in rupees; 0 when the plan has none.
 * @example
 * roomsLineInr(budget.lines); // the accommodation line's amountInr
 */
export function roomsLineInr(lines: readonly BudgetLine[]): number {
  return lines.find((line) => line.category === 'accommodation')?.amountInr ?? 0;
}

/**
 * CST-05: the guest-rooms line minus the priced rooms; negative means the line is short.
 * @example
 * roomsGapInr(315_000, budget.lines); // roomsLineInr(budget.lines) − 315000
 */
export function roomsGapInr(roomsInr: number, lines: readonly BudgetLine[]): number {
  return roomsLineInr(lines) - roomsInr;
}
