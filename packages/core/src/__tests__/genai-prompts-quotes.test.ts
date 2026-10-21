/**
 * Tests for the quote-reader prompt (GenAI job 3).
 *
 * Responsibility: each quote is fenced under a positional id (request ids are user text),
 * the vendor category is named, the closed price bases and GST words are listed, and the
 * strict no-recommendation rule is present. Boundary: pure strings.
 */
import { describe, expect, it } from 'vitest';
import { VENDOR_PROFILES } from '../domain/vendors.js';
import { buildQuotePrompt, promptQuoteId } from '../genai/prompts-quotes.js';
import { PRICE_BASES } from '../schemas/model-outputs.js';
import { NONCE } from './fixtures/genai-plans.js';

describe('buildQuotePrompt', () => {
  const quotes = [
    { id: 'user<<<id>>>', text: 'Veg thali ₹1,200 per plate + GST' },
    { id: 'b', text: 'Package ₹3,00,000 all inclusive' },
  ];
  const { systemInstruction, prompt } = buildQuotePrompt({
    category: 'caterer',
    quotes,
    language: 'en',
    nonce: NONCE,
  });

  it('numbers the quotes by position and fences each one', () => {
    expect(promptQuoteId(0)).toBe('quote-1');
    expect(prompt).toContain(
      `quoteId quote-1:\n<<<QUOTE_1_${NONCE}>>>\nVeg thali ₹1,200 per plate + GST\n<<<END_QUOTE_1_${NONCE}>>>`,
    );
    expect(prompt).toContain(`<<<QUOTE_2_${NONCE}>>>`);
    expect(prompt).not.toContain('user<<<id>>>');
    expect(prompt).toContain(`Vendor category: ${VENDOR_PROFILES.caterer.label}.`);
  });

  it('lists price bases and forbids recommending or ranking', () => {
    expect(systemInstruction).toContain(
      `Price bases (use only these values): ${PRICE_BASES.join(', ')}.`,
    );
    expect(systemInstruction).toContain('Never recommend, rank, praise or advise choosing');
    expect(systemInstruction).toContain('do not compute totals or GST');
  });
});
