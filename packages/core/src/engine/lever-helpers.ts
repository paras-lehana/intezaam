/**
 * Lever helpers — the next cheaper weekday and the smaller party format.
 *
 * Responsibility: find the first Monday–Thursday after a date (LEV-02) and the guest cap
 * that moves a kids' party into the next smaller published band (LEV-06). Boundary: pure
 * lookups; lever-candidates.ts prices the change.
 */
import { addDaysIso, isoWeekday } from '../domain/calendar.js';
import { BIRTHDAY_BANDS } from '../domain/costs.js';
import { DISCOUNT_WEEKDAYS } from '../domain/seasons.js';
import { partyBandFor } from './estimate.js';
import { partyChildren } from './headcount.js';
import type { ClassifiedContext } from './types.js';

/** A Monday–Thursday always falls within the next seven days. */
const DAYS_PER_WEEK = 7;

/**
 * The first Monday–Thursday after `dateIso` (later, never earlier, so lead times only grow).
 * @example
 * nextDiscountWeekday('2027-02-20'); // '2027-02-22' (Saturday → Monday)
 */
export function nextDiscountWeekday(dateIso: string): string {
  for (let offset = 1; offset <= DAYS_PER_WEEK; offset += 1) {
    const candidate = addDaysIso(dateIso, offset) ?? dateIso;
    const weekday = isoWeekday(candidate);
    if (weekday !== undefined && DISCOUNT_WEEKDAYS.includes(weekday)) return candidate;
  }
  return dateIso;
}

/**
 * LEV-06: the guest count that fits the next smaller party band (adults kept, children
 * capped at that band's size), or null when the party is already in the smallest format.
 * @example
 * partyCap(ctxWith50Kids); // adults + 40 (the hall band's top)
 */
export function partyCap(ctx: ClassifiedContext): number | null {
  const children = partyChildren(ctx);
  const current = partyBandFor(ctx);
  if (children === null || current === null || ctx.setting === 'home') return null;
  const source = ctx.kind === 'first-birthday' ? 'first-birthday' : 'kids-birthday';
  const outside = BIRTHDAY_BANDS[source].filter((band) => band.setting !== 'home');
  const index = outside.indexOf(current.band);
  const smaller = index > 0 ? outside[index - 1] : undefined;
  if (smaller === undefined || children <= smaller.guests.max) return null;
  return ctx.guests - children + smaller.guests.max;
}
