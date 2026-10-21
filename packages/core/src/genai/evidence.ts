/**
 * Evidence checks shared by the brief guard: grounded quotes and per-field confirmation.
 *
 * Responsibility: (1) keep only quotes that, folded, are 2–120 characters and a substring
 * of the folded brief the model saw; (2) re-read each field by code from that field's own
 * quotes and accept a claim only when the code finds the same value; (3) flag quotes for
 * one scalar field that disagree ("200 log" … "250 log") and numbers outside the limits.
 * Every refusal is recorded with its reason. Boundary: pure; brief-guard.ts decides the
 * order of fields and the cross-field rules.
 */
import { readBriefFields, type BriefFieldReadings } from '../offline/brief-fields.js';
import { MAX_EVIDENCE_QUOTE_CHARS, MIN_EVIDENCE_QUOTE_CHARS } from '../offline/read-brief.js';
import { tokenise, type Token } from '../offline/tokens.js';
import type { BriefDraft, BriefField, BriefModelOutput } from '../schemas/brief.js';
import { foldForMatch } from '../security/normalise.js';

export const DROP_REASONS = ['no-evidence', 'not-supported', 'ambiguous', 'out-of-range'] as const;

export type DropReason = (typeof DROP_REASONS)[number];

export type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/** Scalar fields whose quotes must agree with each other (09 §5.3 rule 4). */
const MUST_AGREE: ReadonlySet<BriefField> = new Set(['city', 'date', 'budget', 'tradition']);

/** Quotes are joined as separate clauses so clause-based readers (priorities) stay local. */
const QUOTE_JOINER = ' , ';

type Reader<V> = (readings: BriefFieldReadings, tokens: readonly Token[]) => V | undefined;

/**
 * Folded quotes per field that pass the length and substring checks.
 * @example
 * groundedQuotes(reply, foldForMatch('2 lakh mein 200 log')).get('budget'); // ['2 lakh']
 */
export function groundedQuotes(
  output: BriefModelOutput,
  haystack: string,
): Map<BriefField, string[]> {
  const numberClaims: { field: BriefField; quote: string }[] = [];
  if (output.guestsText !== undefined)
    numberClaims.push({ field: 'guests', quote: output.guestsText });
  if (output.budgetText !== undefined)
    numberClaims.push({ field: 'budget', quote: output.budgetText });
  if (output.householdsText !== undefined)
    numberClaims.push({ field: 'households', quote: output.householdsText });
  if (output.daysText !== undefined) numberClaims.push({ field: 'days', quote: output.daysText });
  const grounded = new Map<BriefField, string[]>();
  // Number phrases come first: a number is read from its own phrase, not from every quote.
  for (const { field, quote } of [...numberClaims, ...output.evidence]) {
    const folded = foldForMatch(quote);
    const fits =
      folded.length >= MIN_EVIDENCE_QUOTE_CHARS && folded.length <= MAX_EVIDENCE_QUOTE_CHARS;
    if (!fits || !haystack.includes(folded)) continue;
    const list = grounded.get(field) ?? [];
    if (!list.includes(folded)) list.push(folded);
    grounded.set(field, list);
  }
  return grounded;
}

/** Collects the validated draft and every refusal for one brief. */
export class EvidenceGuard {
  readonly draft: Mutable<BriefDraft> = {};
  readonly dropped: { field: BriefField; reason: DropReason }[] = [];

  constructor(
    private readonly quotes: ReadonlyMap<BriefField, readonly string[]>,
    private readonly todayIso: string,
  ) {}

  /** Code readings over the field's own quotes; undefined (and a drop) without evidence. */
  readings(field: BriefField): { all: BriefFieldReadings; tokens: readonly Token[] } | undefined {
    const quotes = this.quotes.get(field) ?? [];
    if (quotes.length === 0) return this.drop(field, 'no-evidence');
    const read = (text: string): BriefFieldReadings =>
      readBriefFields(tokenise(text).tokens, this.todayIso);
    if (MUST_AGREE.has(field) && quotes.length > 1) {
      const values = new Set(quotes.map((quote) => JSON.stringify(read(quote)[field]?.value)));
      if (values.size > 1) return this.drop(field, 'ambiguous');
    }
    const joined = quotes.join(QUOTE_JOINER);
    return { all: read(joined), tokens: tokenise(joined).tokens };
  }

  /** Accepts the code's value when it equals the model's claim. */
  confirm<V>(field: BriefField, claimed: V | undefined, read: Reader<V>): V | undefined {
    if (claimed === undefined) return undefined;
    const readings = this.readings(field);
    if (readings === undefined) return undefined;
    const code = read(readings.all, readings.tokens);
    return code !== undefined && JSON.stringify(code) === JSON.stringify(claimed)
      ? code
      : this.drop(field, 'not-supported');
  }

  /** Keeps the claimed list items the code also finds in the quotes. */
  subset<V>(
    field: BriefField,
    claimed: readonly V[] | undefined,
    read: Reader<readonly V[]>,
  ): V[] | undefined {
    if (claimed === undefined || claimed.length === 0) return undefined;
    const readings = this.readings(field);
    if (readings === undefined) return undefined;
    const code = read(readings.all, readings.tokens) ?? [];
    const kept = claimed.filter((value) => code.includes(value));
    return kept.length > 0 ? kept : this.drop(field, 'not-supported');
  }

  /**
   * Numbers come from code only: the first grounded phrase (the model's guest, budget,
   * households or days text when it is in the brief) is re-parsed; the model's number is
   * never used.
   */
  number(field: 'guests' | 'budget' | 'households' | 'days', claimed: boolean): number | undefined {
    const [phrase] = this.quotes.get(field) ?? [];
    if (!claimed) return undefined;
    if (phrase === undefined) return this.drop(field, 'no-evidence');
    const readings = readBriefFields(tokenise(phrase).tokens, this.todayIso);
    if (readings.rejected.some((entry) => entry.field === field)) {
      return this.drop(field, 'out-of-range');
    }
    return readings[field]?.value ?? this.drop(field, 'not-supported');
  }

  /** Records a refusal; returns undefined so callers can `return guard.drop(...)`. */
  drop(field: BriefField, reason: DropReason): undefined {
    this.dropped.push({ field, reason });
    return undefined;
  }
}
