/**
 * Quote normaliser for GenAI job 3: code, not the model, turns read quotes into comparable
 * totals (GENAI_ARCHITECTURE.md, job 3; GST rates CST-06; playbook flags).
 *
 * Responsibility: map reply ids back to the request's quotes, keep only amounts whose
 * evidence is in that quote's text, parse each amount by code, total it for the plan's
 * expected guests (per plate × guests, per day × function days, package or event as the
 * largest stated amount), add GST at the category's rate when it is extra or not stated,
 * compare with the category's budget line, flag missing terms, and drop any sentence that
 * recommends, ranks or praises a vendor. Boundary: pure; no ranking, ever.
 */
import { gstRateForCategory } from '../domain/gst.js';
import { VENDOR_PROFILES, type VendorType } from '../domain/vendors.js';
import { readNumberPhrases } from '../offline/number-phrases.js';
import type { QuoteText } from '../offline/quotes.js';
import { tokenise } from '../offline/tokens.js';
import { MAX_AMOUNT_INR } from '../schemas/limits.js';
import type { ParsedQuote, QuoteModelOutput } from '../schemas/model-outputs.js';
import type { Plan } from '../schemas/plan.js';
import type { NormalisedQuote } from '../schemas/responses.js';
import { foldForMatch } from '../security/normalise.js';
import { promptQuoteId } from './prompts-quotes.js';

export interface QuoteComparison {
  readonly quotes: ParsedQuote[];
  readonly normalised: NormalisedQuote[];
  readonly differences: string[];
  readonly questions: QuoteModelOutput['questions'];
}

/** Recommendation and ranking language the comparison must never carry. */
const RECOMMENDATION =
  /\b(?:recommend\w*|best|better|go with|choose|pick|opt for|book (?:it|this|them|quote)|avoid|value for money|worth it|cheapest option|we suggest|should (?:go|choose|book|pick|prefer)|prefer(?:able|red)?)\b/u;
const PERCENT = /%/u;
const ADVANCE_PERCENT = /(\d{1,3})\s*%/u;
/** An advance above half the total leaves the family exposed if the vendor cancels (grade D). */
const HIGH_ADVANCE_PCT = 50;
const PERCENT_DIVISOR = 100;
const MINIMUM_GUARANTEE =
  /minimum|min\.?\s*(?:guarantee|plates|pax)|guaranteed? (?:plates|pax|count)/u;
const ROYALTY = /royalty/u;
/** "minimum guarantee: 280 plates", "minimum 250 plates", "min 300 pax", "250 plates minimum". */
const MINIMUM_PLATES =
  /(?:minimum|min)(?:\s+guarantee)?(?:\s+of)?\s*:?\s*(\d{2,5})|(\d{2,5})\s*(?:plates|pax|covers)\s+minimum/u;

/**
 * The minimum number of plates a quote bills, when it states one (code reads it from the text).
 * @example
 * minimumPlates('minimum guarantee: 280 plates'); // 280
 */
export function minimumPlates(foldedText: string): number | undefined {
  const match = MINIMUM_PLATES.exec(foldedText);
  const digits = match?.[1] ?? match?.[2];
  return digits === undefined ? undefined : Number(digits);
}

function moneyValue(amountText: string): number | undefined {
  if (PERCENT.test(amountText)) return undefined;
  const [phrase] = readNumberPhrases(tokenise(amountText).tokens);
  return phrase === undefined ? undefined : phrase.low;
}

/** Days the vendor works: one per distinct function day (at least one). */
function functionDays(plan: Plan): number {
  return Math.max(1, new Set(plan.functions.map((card) => card.dayOffset)).size);
}

/** The total before GST for the quote's price basis; undefined for an hourly rate. */
function baseTotal(
  quote: ParsedQuote,
  values: readonly number[],
  plan: Plan,
  plates: number,
): number | undefined {
  const [first] = values;
  if (first === undefined) return undefined;
  const largest = Math.max(...values);
  const BASIS_TOTALS: Readonly<Record<ParsedQuote['priceBasis'], () => number | undefined>> = {
    // A minimum guarantee bills at least that many plates, however few guests come.
    'per-plate': () => first * plates,
    'per-day': () => largest * functionDays(plan),
    'per-hour': () => undefined,
    package: () => largest,
    'per-event': () => largest,
  };
  return BASIS_TOTALS[quote.priceBasis]();
}

function minimumFlag(folded: string, minimum: number | undefined, expected: number): string[] {
  if (minimum !== undefined && minimum > expected) {
    return [
      `Minimum guarantee of ${String(minimum)} plates: you pay for ${String(minimum)} although about ${String(expected)} guests are expected.`,
    ];
  }
  return MINIMUM_GUARANTEE.test(folded)
    ? ['Minimum guarantee: you pay for that many plates even if fewer guests come.']
    : [];
}

function flagsFor(
  quote: ParsedQuote,
  text: string,
  gstRate: number | null,
  expected: number,
): string[] {
  const folded = foldForMatch(text);
  const advance = ADVANCE_PERCENT.exec(quote.advanceText ?? '');
  return [
    ...(quote.priceBasis === 'per-hour' ? ['Hourly rate: ask how many hours are included.'] : []),
    ...(quote.cancellationText === undefined
      ? ['No cancellation or refund terms: ask for them in writing.']
      : []),
    ...(quote.validityText === undefined
      ? ['No validity date: ask until when the price holds.']
      : []),
    ...(advance !== null && Number(advance[1]) > HIGH_ADVANCE_PCT
      ? ['Advance above half the total: ask for a milestone schedule.']
      : []),
    ...minimumFlag(folded, minimumPlates(folded), expected),
    ...(ROYALTY.test(folded) ? ['Venue royalty applies to outside caterers.'] : []),
    ...(quote.gst === 'not-stated' && gstRate !== null
      ? [`GST not stated: the usual ${gstRate}% was added; confirm with the vendor.`]
      : []),
    ...(gstRate === null ? ['GST not estimated for this category: ask the vendor.'] : []),
  ];
}

/**
 * What the budget sets aside for this quote: a per-plate quote covers one meal, so it is compared
 * with the food line's share for that many plates (the plan serves `costCheck.plates` in all);
 * any other quote with the whole line.
 */
function budgetFor(lineInr: number, quote: ParsedQuote, plates: number, plan: Plan): number {
  const planned = plan.costCheck.plates;
  if (quote.priceBasis !== 'per-plate' || planned === 0) return lineInr;
  return Math.round(lineInr * Math.min(1, plates / planned));
}

function normalise(
  quote: ParsedQuote,
  text: string,
  category: VendorType,
  plan: Plan,
): NormalisedQuote {
  const budgetCategory = VENDOR_PROFILES[category].category;
  const gstRate = gstRateForCategory(budgetCategory);
  const values = quote.amounts.flatMap((amount) => {
    const value = moneyValue(amount.amountText);
    return value === undefined ? [] : [value];
  });
  const expected = plan.headcount.expected;
  const plates = Math.max(expected, minimumPlates(foldForMatch(text)) ?? 0);
  const base = baseTotal(quote, values, plan, plates);
  const addGst = quote.gst !== 'included' && gstRate !== null;
  const total =
    base === undefined
      ? undefined
      : Math.round(addGst ? base * (1 + gstRate / PERCENT_DIVISOR) : base);
  const usable = total !== undefined && total <= MAX_AMOUNT_INR ? total : undefined;
  const line = plan.budget.lines.find((budgetLine) => budgetLine.category === budgetCategory);
  const budget = line === undefined ? undefined : budgetFor(line.amountInr, quote, plates, plan);
  return {
    quoteId: quote.quoteId,
    ...(usable === undefined ? {} : { totalInr: usable }),
    ...(usable === undefined || expected === 0
      ? {}
      : { perGuestInr: Math.round(usable / expected) }),
    gstAdded: addGst && usable !== undefined,
    ...(usable === undefined || budget === undefined ? {} : { vsBudgetLineInr: usable - budget }),
    flags: flagsFor(quote, text, gstRate, expected),
  };
}

/** The reply's positional ids ("Quote quote-1 asks…", "quote-2 states…"), as the page labels them. */
const POSITIONAL_ID = /\b(?:quote\s+)?quote-(\d)\b/giu;

/**
 * Reads the positional quote ids in the reply's sentences as the labels the page shows.
 * @example
 * readableQuoteIds('Quote quote-1 asks for a 50% advance'); // 'Quote 1 asks for a 50% advance'
 */
export function readableQuoteIds(text: string): string {
  return text.replace(POSITIONAL_ID, 'Quote $1');
}

/**
 * Validates and normalises a quote reply (model or offline) against the pasted quotes.
 * @example
 * normaliseQuotes(reply, request.quotes, 'caterer', plan).normalised[0]?.totalInr; // per plate × expected + GST
 */
export function normaliseQuotes(
  reply: QuoteModelOutput,
  quotes: readonly QuoteText[],
  category: VendorType,
  plan: Plan,
): QuoteComparison {
  const resolve = (replyId: string): QuoteText | undefined =>
    quotes.find((quote, index) => quote.id === replyId || promptQuoteId(index) === replyId);
  const parsed = reply.quotes.flatMap((quote) => {
    const source = resolve(quote.quoteId);
    if (source === undefined) return [];
    const haystack = foldForMatch(source.text);
    // An amount survives only when its evidence really is in that vendor's quote.
    const amounts = quote.amounts.filter((amount) =>
      haystack.includes(foldForMatch(amount.evidence)),
    );
    return [{ source, quote: { ...quote, quoteId: source.id, amounts } }];
  });
  const neutral = (text: string): boolean => !RECOMMENDATION.test(foldForMatch(text));
  return {
    quotes: parsed.map((entry) => entry.quote),
    normalised: parsed.map((entry) => normalise(entry.quote, entry.source.text, category, plan)),
    differences: reply.differences.filter(neutral).map(readableQuoteIds),
    questions: reply.questions.flatMap((question) => {
      const source = resolve(question.quoteId);
      return source === undefined || !neutral(question.text)
        ? []
        : [{ quoteId: source.id, text: readableQuoteIds(question.text) }];
    }),
  };
}
