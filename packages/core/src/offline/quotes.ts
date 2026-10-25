/**
 * Offline twin of GenAI job 3 (quote reader): the same `QuoteModelOutput` the model
 * returns, read from pasted quote text with keyword rules and the shared number grammar.
 *
 * Responsibility: per quote — the price basis (per plate, day, hour, package or event),
 * every rupee amount as written with its line as evidence, inclusion and exclusion lines,
 * the advance, cancellation and validity lines, and the GST wording; across quotes — neutral
 * differences and questions from the vendor playbook plus questions for missing terms.
 * It never ranks or recommends. Boundary: pure; code normalises totals in quote-normalise.ts.
 */
import { VENDOR_PLAYBOOK } from '../domain/vendor-playbook.js';
import type { VendorType } from '../domain/vendors.js';
import { clipText } from '../format.js';
import { withoutUndefined } from '../objects.js';
import { MAX_LABEL_CHARS, MAX_LINE_CHARS } from '../schemas/limits.js';
import type { ParsedQuote, QuoteModelOutput } from '../schemas/model-outputs.js';
import { foldForMatch } from '../security/normalise.js';
import { readNumberMentions } from './number-roles.js';
import { quoteOf, tokenise } from './tokens.js';

export interface QuoteText {
  readonly id: string;
  readonly text: string;
}

type PriceBasis = ParsedQuote['priceBasis'];

/** Price-basis keywords, checked in this order (folded text). */
const BASIS_RULES: readonly (readonly [PriceBasis, RegExp])[] = [
  ['per-plate', /per (?:plate|head|pax|thali|guest)|\/ ?(?:plate|head|pax)|प्रति प्लेट/u],
  ['per-day', /per day|\/ ?day|daily|प्रति दिन/u],
  ['per-hour', /per hour|\/ ?(?:hour|hr)|hourly/u],
  ['package', /package|all[ -]inclusive|combo/u],
];

const GST_INCLUDED = /incl(?:usive|uding|\.)?\s*(?:of\s*)?gst|gst\s*incl/u;
const GST_EXTRA =
  /\+\s*gst|plus gst|gst\s*(?:extra|additional|as applicable)|excl(?:uding|usive|\.)?\s*(?:of\s*)?gst/u;
const EXCLUSION = /exclud|not included|extra|additional|separately|charged/u;
const INCLUSION = /includ|incl\.|complimentary|free of cost|\bfree\b/u;
const ADVANCE = /advance|booking amount|token/u;
const CANCELLATION = /cancel|refund/u;
const VALIDITY = /valid/u;
const MONEY_MARK = /₹|\brs\b|\brs\.|\binr\b|rupees|\/-/u;
const PERCENT = /%/u;
const LINE_BREAK = /\r?\n|;|•/u;

/** Amounts below ₹100 are counts or percentages, not prices (grade D threshold). */
const MIN_PRICE_INR = 100;
/** Schema caps: twelve amounts and twenty inclusion lines per quote. */
const MAX_AMOUNTS = 12;
const MAX_ITEMS = 20;
/** Two playbook questions per quote keep the list short (15 at most for three quotes). */
const PLAYBOOK_QUESTIONS_PER_QUOTE = 2;
const MAX_QUESTIONS = 15;
const MAX_EVIDENCE_CHARS = 200;
const MAX_AMOUNT_TEXT_CHARS = 60;
const DEFAULT_AMOUNT_LABEL = 'Amount';

function linesOf(text: string): string[] {
  return text
    .split(LINE_BREAK)
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

function amountsIn(line: string): ParsedQuote['amounts'] {
  const parsed = tokenise(line);
  const priced = MONEY_MARK.test(foldForMatch(line));
  return readNumberMentions(parsed.tokens).flatMap((mention) => {
    const isMoney =
      mention.role === 'budget' ||
      mention.role === 'per-plate' ||
      (priced && mention.role === 'ignored');
    const amountText = quoteOf(parsed, mention.phrase.start, mention.phrase.end);
    if (!isMoney || mention.phrase.low < MIN_PRICE_INR || PERCENT.test(amountText)) return [];
    const label = line
      .slice(0, line.indexOf(amountText))
      .replace(/[:\-–₹\s]+$/u, '')
      .trim();
    return [
      {
        label: clipText(label === '' ? DEFAULT_AMOUNT_LABEL : label, MAX_LABEL_CHARS),
        amountText: clipText(amountText, MAX_AMOUNT_TEXT_CHARS),
        evidence: clipText(line, MAX_EVIDENCE_CHARS),
      },
    ];
  });
}

/**
 * GST wording, read line by line: folding joins lines, and "+ GST" ending one line with
 * "Includes …" starting the next must not read as "GST included". An explicit "+ GST" or
 * "excluding GST" wins over an "inclusive" elsewhere, because it is the costlier reading.
 */
function gstMention(lines: readonly string[]): ParsedQuote['gst'] {
  const folded = lines.map(foldForMatch);
  if (folded.some((line) => GST_EXTRA.test(line))) return 'extra';
  return folded.some((line) => GST_INCLUDED.test(line)) ? 'included' : 'not-stated';
}

function firstLine(lines: readonly string[], pattern: RegExp): string | undefined {
  const line = lines.find((candidate) => pattern.test(foldForMatch(candidate)));
  return line === undefined ? undefined : clipText(line, MAX_LINE_CHARS);
}

/**
 * Reads one quote's terms by keyword rules.
 * @example
 * readQuoteOffline({ id: 'a', text: 'Veg thali ₹1,200 per plate + GST' }).priceBasis; // 'per-plate'
 */
export function readQuoteOffline(quote: QuoteText): ParsedQuote {
  const lines = linesOf(quote.text);
  const folded = foldForMatch(quote.text);
  const basis = BASIS_RULES.find(([, pattern]) => pattern.test(folded))?.[0] ?? 'per-event';
  const exclusions = lines.filter((line) => EXCLUSION.test(foldForMatch(line)));
  const inclusions = lines.filter(
    (line) => INCLUSION.test(foldForMatch(line)) && !exclusions.includes(line),
  );
  const advanceText = firstLine(lines, ADVANCE);
  const cancellationText = firstLine(lines, CANCELLATION);
  const validityText = firstLine(lines, VALIDITY);
  return {
    quoteId: quote.id,
    priceBasis: basis,
    amounts: lines.flatMap(amountsIn).slice(0, MAX_AMOUNTS),
    inclusions: inclusions.slice(0, MAX_ITEMS).map((line) => clipText(line, MAX_LINE_CHARS)),
    exclusions: exclusions.slice(0, MAX_ITEMS).map((line) => clipText(line, MAX_LINE_CHARS)),
    ...withoutUndefined({ advanceText, cancellationText, validityText }),
    gst: gstMention(lines),
  };
}

const BASIS_WORDS: Readonly<Record<PriceBasis, string>> = {
  'per-plate': 'per plate',
  'per-event': 'for the whole event',
  'per-day': 'per day',
  'per-hour': 'per hour',
  package: 'as a package',
};

function differencesOf(parsed: readonly ParsedQuote[]): string[] {
  const label = (index: number): string => `Quote ${index + 1}`;
  const describe = (pick: (quote: ParsedQuote) => string): string =>
    parsed.map((quote, index) => `${label(index)} ${pick(quote)}`).join('; ');
  const differs = (pick: (quote: ParsedQuote) => string): boolean =>
    new Set(parsed.map(pick)).size > 1;
  const checks: readonly (readonly [(quote: ParsedQuote) => string, string])[] = [
    [(quote) => `is priced ${BASIS_WORDS[quote.priceBasis]}`, 'Price basis differs'],
    [(quote) => `states GST as ${quote.gst.replace('-', ' ')}`, 'GST is stated differently'],
    [
      (quote) =>
        quote.cancellationText === undefined
          ? 'has no cancellation terms'
          : 'states cancellation terms',
      'Cancellation terms differ',
    ],
    [
      (quote) =>
        quote.advanceText === undefined ? 'does not mention an advance' : 'asks for an advance',
      'Advance terms differ',
    ],
    [
      (quote) => `lists ${quote.exclusions.length === 0 ? 'no' : 'some'} extra charges`,
      'Extra charges differ',
    ],
  ];
  return checks
    .filter(([pick]) => parsed.length > 1 && differs(pick))
    .map(([pick, title]) => clipText(`${title}: ${describe(pick)}.`, MAX_LINE_CHARS));
}

function questionsOf(
  parsed: readonly ParsedQuote[],
  category: VendorType,
): QuoteModelOutput['questions'] {
  const playbook = VENDOR_PLAYBOOK[category].questions.slice(0, PLAYBOOK_QUESTIONS_PER_QUOTE);
  return parsed
    .flatMap((quote) =>
      [
        ...(quote.gst === 'not-stated' ? ['Is GST included in this price, and at what rate?'] : []),
        ...(quote.cancellationText === undefined
          ? ['What are your cancellation and refund terms, in writing?']
          : []),
        ...(quote.validityText === undefined ? ['Until what date does this price hold?'] : []),
        ...playbook,
      ].map((text) => ({ quoteId: quote.quoteId, text: clipText(text, MAX_LINE_CHARS) })),
    )
    .slice(0, MAX_QUESTIONS);
}

/**
 * Compares one to three quotes with no model.
 * @example
 * compareQuotesOffline([{ id: 'a', text: '₹1,200 per plate' }, { id: 'b', text: 'Package ₹3,00,000' }], 'caterer')
 *   .differences.length > 0; // true
 */
export function compareQuotesOffline(
  quotes: readonly QuoteText[],
  category: VendorType,
): QuoteModelOutput {
  const parsed = quotes.map(readQuoteOffline);
  return {
    quotes: parsed,
    differences: differencesOf(parsed),
    questions: questionsOf(parsed, category),
  };
}
