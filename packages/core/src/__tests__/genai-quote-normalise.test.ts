/**
 * Tests for the quote normaliser (GenAI job 3): code, not the model, turns quotes into totals.
 *
 * Responsibility: per-plate totals use the plan's expected guests and the category's GST
 * rate; included GST is not added twice; a package is its largest amount; an hourly rate
 * has no total; reply ids map back to request ids; amounts without evidence in the quote
 * are dropped; playbook flags; recommendation language is filtered out. Boundary: the reply
 * is the offline reading of test-owned quote texts; totals derive from the plan and tables.
 */
import { describe, expect, it } from 'vitest';
import { gstRateForCategory } from '../domain/gst.js';
import { VENDOR_PROFILES } from '../domain/vendors.js';
import { minimumPlates, normaliseQuotes, readableQuoteIds } from '../genai/quote-normalise.js';
import { compareQuotesOffline } from '../offline/quotes.js';
import type { QuoteModelOutput } from '../schemas/model-outputs.js';
import { planned } from './fixtures/genai-plans.js';

const PERCENT = 100;
const PLATE_INR = 1_200;
const PACKAGE_INR = 300_000;
/** Above the Jaipur sample's expected guests, so the minimum decides what is billed. */
const MIN_PLATES = 250;

const QUOTES = [
  {
    id: 'shree-caterers',
    text: `Veg thali ₹1,200 per plate + GST\nAdvance 60% at booking\nMinimum guarantee ${String(MIN_PLATES)} plates\nValid till 30 Nov 2026`,
  },
  {
    id: 'b',
    text: 'Package ₹3,00,000 all inclusive, GST included\nCancellation: 50% refund up to 30 days before',
  },
];

describe('normaliseQuotes', () => {
  const { plan } = planned('jaipur-wedding');
  const reply = compareQuotesOffline(QUOTES, 'caterer');
  const result = normaliseQuotes(reply, QUOTES, 'caterer', plan);
  const gst = gstRateForCategory(VENDOR_PROFILES.caterer.category) ?? 0;
  const expected = plan.headcount.expected;

  it("bills a per-plate quote for its minimum above the expected guests, adds GST, and compares it with the food line's share for those plates", () => {
    const plates = Math.max(expected, MIN_PLATES);
    expect(plates).toBe(MIN_PLATES);
    const total = Math.round(PLATE_INR * plates * (1 + gst / PERCENT));
    const line = plan.budget.lines.find(
      (budgetLine) => budgetLine.category === VENDOR_PROFILES.caterer.category,
    );
    const share = Math.round((line?.amountInr ?? 0) * Math.min(1, plates / plan.costCheck.plates));
    expect(result.normalised[0]).toMatchObject({
      quoteId: 'shree-caterers',
      totalInr: total,
      perGuestInr: Math.round(total / expected),
      gstAdded: true,
      vsBudgetLineInr: total - share,
    });
  });

  it("reads the reply's positional quote ids as the labels the page shows", () => {
    expect(
      readableQuoteIds('Quote quote-1 states GST is extra, while quote quote-2 includes it.'),
    ).toBe('Quote 1 states GST is extra, while Quote 2 includes it.');
    expect(readableQuoteIds('quote-3 asks for a 50% advance')).toBe(
      'Quote 3 asks for a 50% advance',
    );
    expect(readableQuoteIds('Quote 1 is per plate')).toBe('Quote 1 is per plate');
  });

  it('reads the minimum a quote states, in the usual phrasings', () => {
    expect(minimumPlates('minimum guarantee: 280 plates')).toBe(280);
    expect(minimumPlates('minimum 250 plates, live counter extra')).toBe(250);
    expect(minimumPlates('min 300 pax')).toBe(300);
    expect(minimumPlates('250 plates minimum')).toBe(250);
    expect(minimumPlates('veg thali 950 per plate')).toBeUndefined();
  });

  it('takes a package at its amount without adding GST twice', () => {
    expect(result.normalised[1]).toMatchObject({
      quoteId: 'b',
      totalInr: PACKAGE_INR,
      gstAdded: false,
    });
  });

  it('flags the high advance, the minimum guarantee and missing terms', () => {
    const [first, second] = result.normalised;
    expect(first?.flags).toEqual(
      expect.arrayContaining([
        'Advance above half the total: ask for a milestone schedule.',
        `Minimum guarantee of ${String(MIN_PLATES)} plates: you pay for ${String(MIN_PLATES)} although about ${String(expected)} guests are expected.`,
        'No cancellation or refund terms: ask for them in writing.',
      ]),
    );
    expect(second?.flags).toContain('No validity date: ask until when the price holds.');
  });

  it('maps positional reply ids back and drops unknown ids and ungrounded amounts', () => {
    const [first, second] = reply.quotes;
    const scripted: QuoteModelOutput = {
      quotes: [
        ...(first === undefined
          ? []
          : [
              {
                ...first,
                quoteId: 'quote-1',
                amounts: [
                  ...first.amounts,
                  { label: 'Hidden', amountText: '₹99,000', evidence: 'Hidden fee ₹99,000' },
                ],
              },
            ]),
        ...(second === undefined ? [] : [{ ...second, quoteId: 'invented' }]),
      ],
      differences: [],
      questions: [
        { quoteId: 'quote-2', text: 'Does the package include the welcome drinks?' },
        { quoteId: 'nobody', text: 'Is parking free?' },
      ],
    };
    const mapped = normaliseQuotes(scripted, QUOTES, 'caterer', plan);
    expect(mapped.quotes.map((quote) => quote.quoteId)).toEqual(['shree-caterers']);
    expect(mapped.quotes[0]?.amounts.map((amount) => amount.label)).not.toContain('Hidden');
    expect(mapped.questions).toEqual([
      { quoteId: 'b', text: 'Does the package include the welcome drinks?' },
    ]);
  });

  it('removes recommendation and ranking language', () => {
    const scripted: QuoteModelOutput = {
      ...reply,
      differences: [
        'Quote 1 is the best value for money.',
        'Quote 1 is priced per plate; quote 2 as a package.',
      ],
      questions: [
        { quoteId: 'quote-1', text: 'We recommend you book this one.' },
        { quoteId: 'quote-1', text: 'Is the dessert counter included?' },
      ],
    };
    const neutral = normaliseQuotes(scripted, QUOTES, 'caterer', plan);
    expect(neutral.differences).toEqual(['Quote 1 is priced per plate; quote 2 as a package.']);
    expect(neutral.questions).toEqual([
      { quoteId: 'shree-caterers', text: 'Is the dessert counter included?' },
    ]);
  });

  it('gives an hourly rate no total and says when GST is not estimated', () => {
    const hourly = [{ id: 'dj', text: 'DJ ₹5,000 per hour, valid till Dec' }];
    const [dj] = normaliseQuotes(
      compareQuotesOffline(hourly, 'dj_band'),
      hourly,
      'dj_band',
      plan,
    ).normalised;
    expect(dj?.totalInr).toBeUndefined();
    expect(dj?.flags).toContain('Hourly rate: ask how many hours are included.');
    const cab = [{ id: 'cab', text: 'Tempo traveller ₹6,000 per day' }];
    const [transport] = normaliseQuotes(
      compareQuotesOffline(cab, 'transport'),
      cab,
      'transport',
      plan,
    ).normalised;
    expect(transport?.flags).toContain('GST not estimated for this category: ask the vendor.');
    expect(transport?.gstAdded).toBe(false);
  });

  it('ignores percentage and unreadable amounts, and flags a venue royalty', () => {
    const venue = [{ id: 'hall', text: 'Hall ₹1,50,000 per day\nRoyalty on outside caterers' }];
    const [first] = compareQuotesOffline(venue, 'venue').quotes;
    const scripted: QuoteModelOutput = {
      quotes:
        first === undefined
          ? []
          : [
              {
                ...first,
                amounts: [
                  { label: 'Royalty', amountText: '10%', evidence: 'Royalty' },
                  { label: 'Hall', amountText: 'on request', evidence: 'Hall' },
                ],
              },
            ],
      differences: [],
      questions: [],
    };
    const [hall] = normaliseQuotes(scripted, venue, 'venue', plan).normalised;
    expect(hall?.totalInr).toBeUndefined();
    expect(hall?.flags).toContain('Venue royalty applies to outside caterers.');
  });

  it('adds the usual GST and says so when the quote does not state it', () => {
    const silent = [{ id: 'cake', text: 'Two-tier cake ₹4,500 for the event' }];
    const [cake] = normaliseQuotes(
      compareQuotesOffline(silent, 'cake'),
      silent,
      'cake',
      plan,
    ).normalised;
    const rate = gstRateForCategory(VENDOR_PROFILES.cake.category) ?? 0;
    expect(cake?.totalInr).toBe(Math.round(4_500 * (1 + rate / PERCENT)));
    expect(cake?.flags).toContain(
      `GST not stated: the usual ${rate}% was added; confirm with the vendor.`,
    );
  });
});
