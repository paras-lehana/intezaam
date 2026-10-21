/**
 * One-line summary of a validated brief ("A 300-guest wedding in Jaipur on 25 Nov 2026,
 * budget ₹25 L") — the "understood" line the form shows above the filled chips.
 *
 * Responsibility: compose the line from the validated draft only, so it can never repeat a
 * number the code did not parse. Used by the offline reader and by the evidence guard,
 * which replaces whatever line the model wrote. Boundary: English copy; no I/O.
 */
import { EVENT_KIND_PROFILES } from '../domain/event-kinds.js';
import { FAMILY_PROFILES } from '../domain/events.js';
import { formatLakh } from '../format.js';
import type { BriefDraft } from '../schemas/brief.js';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;
/** "25 Nov 2026": three letters keep the line short on a phone. */
const SHORT_MONTH_CHARS = 3;
/** The "understood" line is bounded by the brief response schema (200 characters). */
export const MAX_UNDERSTOOD_CHARS = 200;
const VOWEL_START = /^[aeiou]/i;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? '';
}

/**
 * "25 Nov 2026" for an ISO date (the form the drafts and the summary line use).
 * @example
 * formatShortDate('2026-11-25'); // '25 Nov 2026'
 */
export function formatShortDate(iso: string): string {
  const match = ISO_DATE.exec(iso);
  if (match === null) return iso;
  const [, year, month, day] = match;
  return `${Number(day)} ${monthName(Number(month)).slice(0, SHORT_MONTH_CHARS)} ${year}`;
}

function whatOf(draft: BriefDraft): string {
  if (draft.kind !== undefined) return EVENT_KIND_PROFILES[draft.kind].label.toLowerCase();
  if (draft.family !== undefined) return FAMILY_PROFILES[draft.family].label.toLowerCase();
  return 'celebration';
}

function whenOf(draft: BriefDraft): string {
  if (draft.dateIso !== undefined) return ` on ${formatShortDate(draft.dateIso)}`;
  if (draft.month !== undefined) return ` in ${monthName(draft.month)}`;
  return draft.dateFlexible === true ? ', date not fixed yet' : '';
}

/**
 * The one-line summary of a validated brief.
 * @example
 * describeBrief({ family: 'wedding', kind: 'wedding', guests: 300, city: 'Jaipur', budgetInr: 2_500_000 });
 * // 'A 300-guest wedding in Jaipur, budget ₹25 L.'
 */
export function describeBrief(draft: BriefDraft): string {
  const subject =
    draft.guests === undefined ? whatOf(draft) : `${draft.guests}-guest ${whatOf(draft)}`;
  const article = VOWEL_START.test(subject) ? 'An' : 'A';
  const where = draft.city === undefined ? '' : ` in ${draft.city}`;
  const budget = draft.budgetInr === undefined ? '' : `, budget ${formatLakh(draft.budgetInr)}`;
  return `${article} ${subject}${where}${whenOf(draft)}${budget}.`.slice(0, MAX_UNDERSTOOD_CHARS);
}
