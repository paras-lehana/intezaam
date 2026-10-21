/**
 * Tests for the rules and blocks every GenAI prompt shares.
 *
 * Responsibility: the base rules state the product principle, the no-invention rule, the
 * refusal rule and the untrusted-data rule; the language rule names the language (Hinglish
 * only for English output); closed
 * lists, numbered facts and the reply schema render as the model reads them; the system
 * instruction joins them in order. Boundary: pure strings.
 */
import { describe, expect, it } from 'vitest';
import { LANGUAGE_CODES, LANGUAGES } from '../domain/languages.js';
import { toModelSchema } from '../genai/model-schema.js';
import {
  BASE_RULES,
  HINGLISH_RULE,
  closedList,
  factsBlock,
  languageRule,
  schemaBlock,
  systemInstruction,
} from '../genai/prompt-rules.js';
import { draftModelOutputSchema } from '../schemas/model-outputs.js';

describe('prompt rules', () => {
  it('states the principle, the no-invention, refusal and untrusted-data rules', () => {
    const rules = BASE_RULES.join('\n');
    expect(rules).toContain('GenAI reads and writes; code decides.');
    expect(rules).toContain('Never invent a price');
    expect(rules).toContain('Never book, pay');
    expect(rules).toContain('untrusted data');
  });

  it('names every output language in English', () => {
    for (const code of LANGUAGE_CODES)
      expect(languageRule(code)).toContain(LANGUAGES[code].englishName);
  });

  it('asks for Hinglish only for English output, keeping keys in English', () => {
    expect(languageRule('en', true).startsWith(HINGLISH_RULE)).toBe(true);
    expect(languageRule('en', true)).toContain('Keep ids, enum values and JSON keys in English.');
    expect(languageRule('hi', true)).toBe(languageRule('hi'));
    expect(systemInstruction([], draftModelOutputSchema, 'en', true)).toContain(HINGLISH_RULE);
    expect(systemInstruction([], draftModelOutputSchema, 'en')).not.toContain(HINGLISH_RULE);
  });

  it('renders closed lists and numbered facts', () => {
    expect(closedList('Diets', ['veg', 'jain'])).toBe('Diets (use only these values): veg, jain.');
    expect(
      factsBlock([
        { id: 'F1', section: 'budget', text: 'Total ₹25,00,000' },
        { id: 'F2', section: 'headcount', text: 'Expected 222 guests' },
      ]),
    ).toBe('[F1] (budget) Total ₹25,00,000\n[F2] (headcount) Expected 222 guests');
  });

  it('embeds the reply schema generated from the same zod contract', () => {
    expect(schemaBlock(draftModelOutputSchema)).toBe(
      `JSON schema:\n${JSON.stringify(toModelSchema(draftModelOutputSchema))}`,
    );
  });

  it('joins base rules, language, job rules and schema in that order', () => {
    const instruction = systemInstruction(['Task: test.'], draftModelOutputSchema, 'hi');
    const order = [BASE_RULES[0] ?? '', languageRule('hi'), 'Task: test.', 'JSON schema:'].map(
      (part) => instruction.indexOf(part),
    );
    expect(order.every((position) => position >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});
