/**
 * Offline twin of GenAI job 1 (brief reader): the same `BriefModelOutput` shape the model
 * returns, produced by the vocabulary readers with no network.
 *
 * Responsibility: sanitise the brief, read every field by code, and emit the model-shaped
 * output — closed enums, the guest and budget phrases as written ("dhai sau mehmaan",
 * "2 lakh"), one evidence quote per proving span (always a substring of the brief), the
 * core fields still missing, and the "understood" line. The server runs this output
 * through the same evidence guard as a model reply. Boundary: pure.
 */
import {
  BRIEF_FIELDS,
  type BriefDraft,
  type BriefField,
  type BriefModelOutput,
} from '../schemas/brief.js';
import { MAX_BRIEF_CHARS } from '../schemas/limits.js';
import { sanitizeUserText } from '../security/sanitize.js';
import { readBriefFields, type BriefFieldReadings, type Span } from './brief-fields.js';
import { describeBrief } from './describe-brief.js';
import { quoteOf, tokenise, type TokenisedText } from './tokens.js';

/** The five questions the form must ask when the brief does not answer them (feature #3). */
export const CORE_BRIEF_FIELDS = ['family', 'date', 'city', 'guests', 'budget'] as const;

/** Evidence quotes are phrases: 2–120 characters. */
export const MIN_EVIDENCE_QUOTE_CHARS = 2;
export const MAX_EVIDENCE_QUOTE_CHARS = 120;
/** The guest and budget phrases are short (schema MAX_NUMBER_TEXT_CHARS). */
const MAX_NUMBER_TEXT_CHARS = 60;

function usableQuote(quote: string): boolean {
  return quote.length >= MIN_EVIDENCE_QUOTE_CHARS && quote.length <= MAX_EVIDENCE_QUOTE_CHARS;
}

function spanQuotes(parsed: TokenisedText, spans: readonly Span[]): string[] {
  const quotes = spans.map((span) => quoteOf(parsed, span.start, span.end)).filter(usableQuote);
  return [...new Set(quotes)];
}

/** The phrase from the first to the last span ("20 bachche aur 10 parents"), or the first span. */
function numberText(parsed: TokenisedText, spans: readonly Span[]): string | undefined {
  const [first] = spans;
  const last = spans[spans.length - 1];
  if (first === undefined || last === undefined) return undefined;
  const whole = quoteOf(parsed, first.start, last.end);
  const text =
    whole.length <= MAX_NUMBER_TEXT_CHARS ? whole : quoteOf(parsed, first.start, first.end);
  return text.length <= MAX_NUMBER_TEXT_CHARS ? text : undefined;
}

/** Fields that describe community events only (evidence for them is dropped elsewhere). */
const COMMUNITY_FIELDS: ReadonlySet<BriefField> = new Set(['households', 'days', 'premises']);

function evidenceOf(
  parsed: TokenisedText,
  fields: BriefFieldReadings,
): BriefModelOutput['evidence'] {
  return BRIEF_FIELDS.flatMap((field) => {
    const reading = fields[field];
    if (reading === undefined || (COMMUNITY_FIELDS.has(field) && !isCommunity(fields))) return [];
    return spanQuotes(parsed, reading.spans).map((quote) => ({ field, quote }));
  });
}

type SharedFields = Omit<BriefDraft, 'guests' | 'budgetInr' | 'households' | 'days'>;

/** Households, days and premises describe community events only. */
function isCommunity(fields: BriefFieldReadings): boolean {
  return fields.family?.value === 'community';
}

/** Every non-numeric field: the part the model output and the draft share. */
function sharedFields(fields: BriefFieldReadings): SharedFields {
  const date = fields.date?.value;
  return {
    ...(fields.family === undefined ? {} : { family: fields.family.value }),
    ...(fields.kind === undefined ? {} : { kind: fields.kind.value }),
    ...(fields.tradition === undefined ? {} : { tradition: fields.tradition.value }),
    ...(fields.anandKaraj === undefined ? {} : { anandKaraj: fields.anandKaraj.value }),
    ...(fields.city === undefined ? {} : { city: fields.city.value }),
    ...(date?.dateIso === undefined ? {} : { dateIso: date.dateIso }),
    ...(date?.month === undefined ? {} : { month: date.month }),
    ...(date === undefined ? {} : { dateFlexible: date.flexible }),
    ...(fields.functions === undefined ? {} : { functions: fields.functions.value }),
    ...(fields.venueSetting === undefined ? {} : { venueSetting: fields.venueSetting.value }),
    ...(fields.diet === undefined ? {} : { diet: fields.diet.value }),
    ...(fields.alcohol === undefined ? {} : { alcohol: fields.alcohol.value }),
    ...(fields.accessibility === undefined ? {} : { accessibility: fields.accessibility.value }),
    ...(fields.priorities === undefined ? {} : { priorities: fields.priorities.value }),
    ...(fields.cut === undefined ? {} : { cut: fields.cut.value }),
    ...(fields.styleTags === undefined ? {} : { styleTags: fields.styleTags.value }),
    ...(fields.premises === undefined || !isCommunity(fields)
      ? {}
      : { premises: fields.premises.value }),
    language: fields.language,
    ...(fields.hinglish ? { hinglish: true } : {}),
  };
}

/**
 * Reads a brief with no model, returning the shape of GenAI job 1's reply.
 * @example
 * readBriefOffline('2 lakh mein 200 log, Diwali ke baad, Jaipur', '2026-10-20').budgetText; // '2 lakh'
 */
export function readBriefOffline(text: string, todayIso: string): BriefModelOutput {
  const parsed = tokenise(sanitizeUserText(text, MAX_BRIEF_CHARS));
  const fields = readBriefFields(parsed.tokens, todayIso);
  const shared = sharedFields(fields);
  // A number the limits refused is still quoted, so the guard reports why it was dropped.
  const spansFor = (field: 'guests' | 'budget' | 'households' | 'days'): readonly Span[] =>
    fields[field]?.spans ?? fields.rejected.find((entry) => entry.field === field)?.spans ?? [];
  const guestsText = numberText(parsed, spansFor('guests'));
  const budgetText = numberText(parsed, spansFor('budget'));
  const community = isCommunity(fields);
  const householdsText = community ? numberText(parsed, spansFor('households')) : undefined;
  const daysText = community ? numberText(parsed, spansFor('days')) : undefined;
  const filled = new Set(BRIEF_FIELDS.filter((field) => fields[field] !== undefined));
  const draft: BriefDraft = {
    ...shared,
    ...(fields.guests === undefined ? {} : { guests: fields.guests.value }),
    ...(fields.budget === undefined ? {} : { budgetInr: fields.budget.value }),
    ...(fields.households === undefined || !community
      ? {}
      : { households: fields.households.value }),
    ...(fields.days === undefined || !community ? {} : { days: fields.days.value }),
  };
  return {
    ...shared,
    ...(guestsText === undefined ? {} : { guestsText }),
    ...(budgetText === undefined ? {} : { budgetText }),
    ...(householdsText === undefined ? {} : { householdsText }),
    ...(daysText === undefined ? {} : { daysText }),
    evidence: evidenceOf(parsed, fields),
    missing: CORE_BRIEF_FIELDS.filter((field) => !filled.has(field)),
    understood: describeBrief(draft),
  };
}
