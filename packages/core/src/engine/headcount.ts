/**
 * Headcount forecast (HC-01…03) — from invited to expected, plated and cooked-for.
 *
 * Responsibility: the attendance rate (in town 0.80, destination 0.65, blended by the share
 * of outstation guests), guests per function, the plate guarantee, cook-for count, waste
 * warning, rooms for outstation guests and the kids'-party return-gift buffer.
 * Boundary: counts only; the cost rules price them.
 */
import { EVENT_KIND_PROFILES } from '../domain/event-kinds.js';
import type { EventFamily } from '../domain/events.js';
import { FUNCTION_PROFILES, type FunctionKind } from '../domain/functions.js';
import {
  ATTENDANCE_DESTINATION,
  ATTENDANCE_IN_TOWN,
  COOK_FOR_FACTOR,
  GUESTS_PER_ROOM,
  PLATE_GUARANTEE_FACTOR,
  RETURN_GIFT_BUFFER_PCT,
  WASTE_WARNING_FACTOR,
} from '../domain/headcount.js';
import type { Headcount } from '../schemas/plan-people.js';
import { formatPercent } from '../format.js';
import { PERCENT } from './percent.js';
import type { TraceLog } from './trace.js';
import type { ClassifiedContext } from './types.js';

/** Rates are published to three decimals (0.755), so floating-point tails never reach the plan. */
const RATE_DECIMALS = 1_000;

/**
 * HC-01 discounts an invitation list for declines; a committee's figure is already its
 * expected count (the schema calls it "the count fed at the meals"), so it is not cut again.
 */
const COUNT_IS_INVITATION: Readonly<Record<EventFamily, boolean>> = {
  wedding: true,
  birthday: true,
  'family-function': true,
  community: false,
};

/** Return gifts are ordered for children only (babies, kids and teens). */
const CHILD_AGE_BANDS = ['baby', 'kid', 'teen'] as const;

/**
 * HC-01: the share of invited guests expected to attend, to three decimals. Outstation guests
 * decline like destination guests, so the in-town rate is blended by the outstation share
 * (grade D); a community count is already an expectation, so its rate is 1.
 * @example
 * attendanceRate(ctxWith({ destination: false, outstationShare: 0 })); // 0.8
 */
export function attendanceRate(ctx: ClassifiedContext): number {
  if (!COUNT_IS_INVITATION[ctx.family]) return 1;
  if (ctx.input.destination) return ATTENDANCE_DESTINATION.value;
  const share = ctx.input.outstationShare;
  const blended = ATTENDANCE_IN_TOWN.value * (1 - share) + ATTENDANCE_DESTINATION.value * share;
  return Math.round(blended * RATE_DECIMALS) / RATE_DECIMALS;
}

/**
 * Invited guests at one function: the user's count, else the function's default share.
 * @example
 * invitedAt(jaipurCtx, 'mehendi'); // 150 (300 × 0.5)
 */
export function invitedAt(ctx: ClassifiedContext, kind: FunctionKind): number {
  const typed = ctx.input.guestsByFunction?.[kind];
  return typed ?? Math.max(1, Math.round(ctx.guests * FUNCTION_PROFILES[kind].guestShare));
}

/**
 * Expected attendance at one function (HC-01 applied to its invited count; at least one).
 * @example
 * expectedAt(jaipurCtx, 'wedding'); // 222 at a 0.74 attendance rate
 */
export function expectedAt(ctx: ClassifiedContext, kind: FunctionKind): number {
  return Math.max(1, Math.round(invitedAt(ctx, kind) * attendanceRate(ctx)));
}

/**
 * Expected attendance for the whole event (HC-01; at least one).
 * @example
 * expectedGuests(jaipurCtx); // 222
 */
export function expectedGuests(ctx: ClassifiedContext): number {
  return Math.max(1, Math.round(ctx.guests * attendanceRate(ctx)));
}

/**
 * HC-03: children at a party whose kind has a child age band (the typed count, capped at
 * the guest list), or null for adult events.
 * @example
 * partyChildren(bengaluruCtx); // 25
 */
export function partyChildren(ctx: ClassifiedContext): number | null {
  const band = EVENT_KIND_PROFILES[ctx.kind].ageBand;
  if (!CHILD_AGE_BANDS.some((child) => child === band)) return null;
  return Math.min(ctx.input.birthday?.kidsCount ?? ctx.guests, ctx.guests);
}

/**
 * Builds the headcount section and its trace (HC-01, HC-02, CST-05 rooms, HC-03).
 * @example
 * buildHeadcount(jaipurCtx, trace).plateGuarantee; // round(expected × 0.95)
 */
export function buildHeadcount(ctx: ClassifiedContext, trace: TraceLog): Headcount {
  const rate = attendanceRate(ctx);
  const expected = expectedGuests(ctx);
  const outstationGuests = Math.round(ctx.guests * ctx.input.outstationShare);
  const rooms = Math.ceil(outstationGuests / GUESTS_PER_ROOM);
  const attendanceId = trace.add({
    ruleId: 'HC-01',
    inputs: COUNT_IS_INVITATION[ctx.family]
      ? [
          ['invited', ctx.guests],
          ['destination', ctx.input.destination],
          ['outstation share', formatPercent(ctx.input.outstationShare * PERCENT)],
        ]
      : [
          ['fed at the meals', ctx.guests],
          ['visitors in all', ctx.footfall],
        ],
    effect: COUNT_IS_INVITATION[ctx.family]
      ? `About ${formatPercent(Math.round(rate * PERCENT))} of invited guests are expected, so plan for ${expected} people.`
      : `${expected} is the committee's count fed at the meals (about ${ctx.footfall.toLocaleString('en-IN')} visitors come and go in all), so no share is taken off for declines.`,
  });
  const platesId = trace.add({
    ruleId: 'HC-02',
    inputs: [['expected', expected]],
    effect: `Guarantee ${Math.round(expected * PLATE_GUARANTEE_FACTOR)} plates and cook for ${Math.round(expected * COOK_FOR_FACTOR)}; more than ${Math.round(expected * WASTE_WARNING_FACTOR)} plates is likely waste.`,
  });
  const traceIds = [attendanceId, platesId];
  if (rooms > 0) {
    traceIds.push(
      trace.add({
        ruleId: 'CST-05',
        inputs: [['outstation guests', outstationGuests]],
        effect: `${outstationGuests} outstation guests sharing two to a room need ${rooms} rooms.`,
      }),
    );
  }
  const children = partyChildren(ctx);
  let giftsToOrder: number | undefined;
  if (children !== null) {
    // The top of the 10–15% range: running short at the party is worse than a spare gift.
    giftsToOrder = Math.ceil(children * (1 + RETURN_GIFT_BUFFER_PCT.max / PERCENT));
    traceIds.push(
      trace.add({
        ruleId: 'HC-03',
        inputs: [['children', children]],
        effect: `Order ${giftsToOrder} return gifts: ${RETURN_GIFT_BUFFER_PCT.max}% over the children expected, because many replies never come.`,
      }),
    );
  }
  return {
    invited: ctx.guests,
    expected,
    attendanceRate: rate,
    plateGuarantee: Math.round(expected * PLATE_GUARANTEE_FACTOR),
    cookFor: Math.round(expected * COOK_FOR_FACTOR),
    wasteWarningAbove: Math.round(expected * WASTE_WARNING_FACTOR),
    outstationGuests,
    rooms,
    ...(giftsToOrder === undefined ? {} : { returnGiftsToOrder: giftsToOrder }),
    traceIds,
  };
}
