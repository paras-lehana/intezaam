/**
 * Tests for the offline twin of the quote reader (GenAI job 3).
 *
 * Responsibility: price basis by keyword, rupee amounts with their line as evidence (never
 * percentages or small counts), inclusions and exclusions, the advance, cancellation and
 * validity lines, GST wording; across quotes, neutral differences and playbook questions,
 * capped, and a reply that parses with the model-output schema. Boundary: quote texts are
 * test-owned; questions come from the vendor playbook table.
 */
import { describe, expect, it } from 'vitest';
import { VENDOR_PLAYBOOK } from '../domain/vendor-playbook.js';
import { compareQuotesOffline, readQuoteOffline } from '../offline/quotes.js';
import { quoteModelOutputSchema } from '../schemas/model-outputs.js';

const CATERER = [
  'Veg thali: ₹1,200 per plate + GST',
  'Includes welcome drink and 2 desserts',
  'Live counters charged extra',
  'Advance 30% at booking; cancellation: no refund within 15 days',
  'Valid till 30 Nov',
].join('\n');

describe('readQuoteOffline', () => {
  const quote = readQuoteOffline({ id: 'a', text: CATERER });

  it('reads the basis, the rupee amount with its line, and the GST wording', () => {
    expect(quote.priceBasis).toBe('per-plate');
    expect(quote.amounts).toEqual([
      { label: 'Veg thali', amountText: '₹1,200', evidence: 'Veg thali: ₹1,200 per plate + GST' },
    ]);
    expect(quote.gst).toBe('extra');
  });

  it('separates inclusions from exclusions and finds the terms', () => {
    expect(quote.inclusions).toEqual(['Includes welcome drink and 2 desserts']);
    expect(quote.exclusions).toEqual(['Live counters charged extra']);
    expect(quote.advanceText).toBe('Advance 30% at booking');
    expect(quote.cancellationText).toBe('cancellation: no refund within 15 days');
    expect(quote.validityText).toBe('Valid till 30 Nov');
  });

  it('knows the other bases and GST wordings', () => {
    expect(readQuoteOffline({ id: 'b', text: 'Tent ₹8,000 per day, GST included' })).toMatchObject({
      priceBasis: 'per-day',
      gst: 'included',
    });
    expect(readQuoteOffline({ id: 'c', text: 'DJ ₹4,000/hour' }).priceBasis).toBe('per-hour');
    expect(readQuoteOffline({ id: 'd', text: 'Gold package Rs. 2,50,000' })).toMatchObject({
      priceBasis: 'package',
      gst: 'not-stated',
    });
    const plain = readQuoteOffline({ id: 'e', text: 'Photography ₹75,000' });
    expect(plain.priceBasis).toBe('per-event');
    expect(plain.amounts[0]?.label).toBe('Photography');
  });

  it('skips percentages and amounts below a hundred rupees', () => {
    expect(readQuoteOffline({ id: 'f', text: 'Advance 50%\nService ₹50' }).amounts).toEqual([]);
  });
});

describe('compareQuotesOffline', () => {
  it('describes neutral differences and asks playbook and missing-term questions', () => {
    const reply = compareQuotesOffline(
      [
        { id: 'a', text: CATERER },
        { id: 'b', text: 'Package ₹3,00,000 all inclusive' },
      ],
      'caterer',
    );
    expect(quoteModelOutputSchema.safeParse(reply).success).toBe(true);
    expect(
      reply.differences.some((line) =>
        line.startsWith(
          'Price basis differs: Quote 1 is priced per plate; Quote 2 is priced as a package',
        ),
      ),
    ).toBe(true);
    expect(reply.differences.join(' ')).not.toMatch(/\b(?:best|better|recommend)\b/);
    const forB = reply.questions
      .filter((question) => question.quoteId === 'b')
      .map((question) => question.text);
    expect(forB).toEqual(
      expect.arrayContaining([
        'Is GST included in this price, and at what rate?',
        'What are your cancellation and refund terms, in writing?',
        ...VENDOR_PLAYBOOK.caterer.questions.slice(0, 2),
      ]),
    );
  });

  it('has no differences for a single quote and caps the questions', () => {
    const one = compareQuotesOffline([{ id: 'a', text: 'Mehendi ₹11,000' }], 'mehendi');
    expect(one.differences).toEqual([]);
    const three = compareQuotesOffline(
      ['x', 'y', 'z'].map((id) => ({ id, text: `Quote ${id} ₹10,000` })),
      'decorator',
    );
    expect(three.questions.length).toBeLessThanOrEqual(15);
  });
});
