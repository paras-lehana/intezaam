/**
 * Prompt for GenAI job 3, the quote reader (synthesis §5): read one to three pasted vendor
 * quotes and describe how they differ — neutrally, never recommending a vendor.
 *
 * Responsibility: fence each quote (already redacted: phones, email, UPI, bank details),
 * ask for the price basis, amounts copied as written with an evidence quote, inclusions,
 * exclusions, advance, cancellation, validity and GST wording, then neutral differences and
 * questions per quote (bio-bandish QUOTE_DIFFERENCES@1 rules). Code parses every amount and
 * computes totals, GST and the gap to the budget line afterwards. Boundary: builds strings.
 */
import type { LanguageCode } from '../domain/languages.js';
import { VENDOR_PROFILES, type VendorType } from '../domain/vendors.js';
import { GST_MENTIONS, PRICE_BASES, quoteModelOutputSchema } from '../schemas/model-outputs.js';
import { wrapUntrusted } from './prompt-boundary.js';
import { closedList, systemInstruction, type PromptPair } from './prompt-rules.js';

export interface QuotePromptInput {
  readonly category: VendorType;
  readonly quotes: readonly { readonly id: string; readonly text: string }[];
  readonly language: LanguageCode;
  readonly nonce: string;
}

/**
 * The id a quote has inside the prompt. Request ids are user text, so the prompt uses
 * positional ids ("quote-1") and normaliseQuotes maps replies back to the request ids.
 * @example
 * promptQuoteId(0); // 'quote-1'
 */
export function promptQuoteId(index: number): string {
  return `quote-${index + 1}`;
}

const QUOTE_RULES: readonly string[] = [
  'Task: read the vendor quotes and describe how they differ.',
  'For each quote: its price basis; every amount as written (amountText) with a label and an evidence quote copied exactly from that quote; inclusions; exclusions; the advance, cancellation and validity terms as written; and whether GST is included, extra or not stated.',
  'Do not add, multiply or convert amounts, and do not compute totals or GST; the app does that.',
  'differences: neutral sentences on price basis, inclusions, extra charges, payment schedule, cancellation and validity.',
  'questions: questions the family could ask each vendor, tied to its quoteId.',
  'STRICT: describe differences only. Never recommend, rank, praise or advise choosing, booking or avoiding any vendor, and never say which is better, best, cheaper overall or value for money.',
  closedList('Price bases', PRICE_BASES),
  closedList('GST', GST_MENTIONS),
];

/**
 * Builds the quote-reading prompt (job 3).
 * @example
 * buildQuotePrompt({ category: 'caterer', quotes: [{ id: 'a', text: 'Veg ₹1,200 per plate' }], language: 'en', nonce: 'a1b2c3d4' })
 *   .prompt.includes('<<<QUOTE_1_a1b2c3d4>>>'); // true
 */
export function buildQuotePrompt(input: QuotePromptInput): PromptPair {
  const fenced = input.quotes.map(
    (quote, index) =>
      `quoteId ${promptQuoteId(index)}:\n${wrapUntrusted(`QUOTE_${index + 1}`, quote.text, input.nonce)}`,
  );
  return {
    systemInstruction: systemInstruction(QUOTE_RULES, quoteModelOutputSchema, input.language),
    prompt: [
      `Vendor category: ${VENDOR_PROFILES[input.category].label}.`,
      'Quotes:',
      ...fenced,
    ].join('\n'),
  };
}
