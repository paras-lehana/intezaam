/**
 * Brief number fields: guests, budget, households and days, read by code from the number
 * mentions, each with the spans that prove it.
 *
 * Responsibility: one reader per number field with its limits — guests summed over people
 * nouns (ranges plan high), budget from the first money phrase (ranges plan low), households
 * and days from the first mention with that role (ranges plan high) — and values outside the
 * limits rejected with a reason rather than clamped (battery B59). Boundary: pure; spans only.
 */
import {
  MAX_BUDGET_INR,
  MAX_EVENT_DAYS,
  MAX_GUESTS,
  MAX_HOUSEHOLDS,
  MIN_GUESTS,
} from '../schemas/limits.js';
import type { FieldReading, Rejected, RejectReason, Span } from './brief-fields.js';
import type { NumberMention } from './number-roles.js';

/** In the order rejections are reported. */
export const NUMBER_FIELDS = ['guests', 'budget', 'households', 'days'] as const;

export type NumberField = (typeof NUMBER_FIELDS)[number];

type Limited =
  | { readonly ok: true; readonly reading: FieldReading<number> }
  | { readonly ok: false; readonly reason: RejectReason; readonly spans: Span[] };

/**
 * The token spans of some number mentions.
 * @example
 * spansOf([]); // []
 */
export function spansOf(mentions: readonly NumberMention[]): Span[] {
  return mentions.map((mention) => ({ start: mention.start, end: mention.end }));
}

function withinLimits(value: number, min: number, max: number, spans: Span[]): Limited {
  if (value > max) return { ok: false, reason: 'above-limit', spans };
  if (value < min) return { ok: false, reason: 'below-limit', spans };
  return { ok: true, reading: { value, spans } };
}

/** A count from the first mention with this role ("150 flats", "10 din"); ranges plan high. */
function countOf(
  mentions: readonly NumberMention[],
  role: 'households' | 'days',
  max: number,
): Limited | undefined {
  const mention = mentions.find((entry) => entry.role === role);
  if (mention === undefined) return undefined;
  return withinLimits(Math.round(mention.phrase.high), 1, max, spansOf([mention]));
}

const NUMBER_READERS: Readonly<
  Record<NumberField, (mentions: readonly NumberMention[]) => Limited | undefined>
> = {
  // Every people-noun count is summed ("20 bachche aur 10 parents" = 30).
  guests: (mentions) => {
    const guests = mentions.filter((mention) => mention.role === 'guests');
    if (guests.length === 0) return undefined;
    const total = guests.reduce((sum, mention) => sum + Math.round(mention.phrase.high), 0);
    return withinLimits(total, MIN_GUESTS, MAX_GUESTS, spansOf(guests));
  },
  budget: (mentions) => {
    const budget = mentions.find((mention) => mention.role === 'budget');
    if (budget === undefined) return undefined;
    return withinLimits(Math.round(budget.phrase.low), 1, MAX_BUDGET_INR, spansOf([budget]));
  },
  households: (mentions) => countOf(mentions, 'households', MAX_HOUSEHOLDS),
  days: (mentions) => countOf(mentions, 'days', MAX_EVENT_DAYS),
};

export interface NumberReadings {
  readonly values: Partial<Record<NumberField, FieldReading<number>>>;
  /** Numbers the brief states but the limits refuse, with their spans. */
  readonly rejected: readonly Rejected[];
}

/**
 * Every number field a brief states, or why a stated number was refused.
 * @example
 * readNumberFields([]).rejected; // []
 */
export function readNumberFields(mentions: readonly NumberMention[]): NumberReadings {
  const values: Partial<Record<NumberField, FieldReading<number>>> = {};
  const rejected: Rejected[] = [];
  for (const field of NUMBER_FIELDS) {
    const read = NUMBER_READERS[field](mentions);
    if (read?.ok === true) values[field] = read.reading;
    else if (read !== undefined) rejected.push({ field, reason: read.reason, spans: read.spans });
  }
  return { values, rejected };
}
