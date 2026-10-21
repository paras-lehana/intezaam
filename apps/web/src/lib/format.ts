/**
 * The two display formats the web needs that core does not own.
 *
 * Responsibility: latency for provenance badges, and today's local date as an ISO day (the
 * engine is pure and takes `todayIso` as a parameter). Boundary: display only; every rupee
 * amount is formatted by core's `formatInr` / `formatLakh`, so the web, the share text and
 * the offline narrator can never disagree about how ₹25,00,000 reads.
 */
/** Provenance badges show one decimal of a second ("3.2 s"). */
const SECONDS_DIGITS = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });

const MS_PER_SECOND = 1000;
const ISO_PAD = 2;

/**
 * Milliseconds as seconds with one decimal.
 * @example
 * formatSeconds(3240); // '3.2 s'
 */
export function formatSeconds(ms: number): string {
  return `${SECONDS_DIGITS.format(ms / MS_PER_SECOND)} s`;
}

/**
 * The calendar day of a Date in the reader's own time zone, in YYYY-MM-DD form.
 * @example
 * toIsoDay(new Date(2026, 9, 20, 23, 30)); // '2026-10-20'
 */
export function toIsoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(ISO_PAD, '0');
  const day = String(date.getDate()).padStart(ISO_PAD, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
