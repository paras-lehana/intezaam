/**
 * Clock arithmetic on HH:MM times (24-hour) for run sheets and the noise curfew.
 *
 * Responsibility: convert between "HH:MM" and minutes after midnight, add minutes with
 * wrap-around, say a time the way readers do ("10 pm"), and decide whether a time falls in
 * the 10 pm–6 am outdoor sound ban.
 * Boundary: times of day only; dates are calendar.ts.
 */
import { NOISE_CURFEW_END_HHMM, NOISE_CURFEW_START_HHMM } from '../domain/permissions.js';

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 1_440;
const PAD_WIDTH = 2;
/** Hours on a 12-hour clock face: 12 noon is "12 pm" and midnight "12 am". */
const HOURS_PER_HALF_DAY = 12;

/**
 * Minutes after midnight for an "HH:MM" time (malformed input reads as midnight).
 * @example
 * toMinutes('19:30'); // 1170
 */
export function toMinutes(hhmm: string): number {
  const [hours = 0, minutes = 0] = hhmm.split(':').map(Number);
  return hours * MINUTES_PER_HOUR + minutes;
}

/**
 * "HH:MM" for minutes after midnight, wrapping around the day in either direction.
 * @example
 * fromMinutes(-30); // '23:30'
 */
export function fromMinutes(total: number): string {
  const wrapped = ((total % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = String(Math.floor(wrapped / MINUTES_PER_HOUR)).padStart(PAD_WIDTH, '0');
  const minutes = String(wrapped % MINUTES_PER_HOUR).padStart(PAD_WIDTH, '0');
  return `${hours}:${minutes}`;
}

/**
 * A 12-hour label for an "HH:MM" time, so copy shows the same time the rule checks
 * ("22:00" reads "10 pm"; minutes appear only when they are not zero).
 * @example
 * clockLabel('22:00'); // '10 pm'
 * clockLabel('23:55'); // '11:55 pm'
 */
export function clockLabel(hhmm: string): string {
  // Round-tripping through fromMinutes wraps out-of-range input into one day.
  const total = toMinutes(fromMinutes(toMinutes(hhmm)));
  const hour = Math.floor(total / MINUTES_PER_HOUR);
  const minutes = total % MINUTES_PER_HOUR;
  const face = hour % HOURS_PER_HALF_DAY || HOURS_PER_HALF_DAY;
  const suffix = hour < HOURS_PER_HALF_DAY ? 'am' : 'pm';
  const shownMinutes = minutes === 0 ? '' : `:${String(minutes).padStart(PAD_WIDTH, '0')}`;
  return `${face}${shownMinutes} ${suffix}`;
}

/**
 * Adds minutes to a clock time, wrapping past midnight.
 * @example
 * addMinutes('23:30', 300); // '04:30'
 */
export function addMinutes(hhmm: string, minutes: number): string {
  return fromMinutes(toMinutes(hhmm) + minutes);
}

/**
 * True when amplified sound at this time would break the outdoor 10 pm–6 am ban (PERM-02).
 * Ending exactly at 22:00 is allowed.
 * @example
 * isInNoiseCurfew('23:30'); // true
 * isInNoiseCurfew('22:00'); // false
 */
export function isInNoiseCurfew(hhmm: string): boolean {
  const minutes = toMinutes(hhmm);
  return minutes > toMinutes(NOISE_CURFEW_START_HHMM) || minutes < toMinutes(NOISE_CURFEW_END_HHMM);
}

/**
 * True when a span that starts at `startHhmm` and lasts `hours` runs past 10 pm or into the
 * early hours (spans crossing midnight always do).
 * @example
 * runsIntoCurfew('19:00', 4); // true (ends 23:00)
 */
export function runsIntoCurfew(startHhmm: string, hours: number): boolean {
  const start = toMinutes(startHhmm);
  const end = start + hours * MINUTES_PER_HOUR;
  return end > toMinutes(NOISE_CURFEW_START_HHMM) || isInNoiseCurfew(startHhmm);
}
