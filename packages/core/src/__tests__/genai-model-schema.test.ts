/**
 * Tests for zod → JSON Schema conversion of the model-output contracts.
 *
 * Responsibility: every GenAI job's reply schema converts, at every depth, without the keys
 * the Gemini endpoint rejects ($schema, additionalProperties, minItems, maxItems) while the
 * structure (properties, required, enums) survives. Boundary: pure.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { toModelSchema } from '../genai/model-schema.js';
import { briefModelOutputSchema } from '../schemas/brief.js';
import {
  askModelOutputSchema,
  draftModelOutputSchema,
  narrationModelOutputSchema,
  quoteModelOutputSchema,
} from '../schemas/model-outputs.js';

const REMOVED = ['$schema', 'additionalProperties', 'minItems', 'maxItems'];

function keysDeep(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(keysDeep);
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value).flatMap(([key, child]) => [key, ...keysDeep(child)]);
}

describe('toModelSchema', () => {
  const contracts = {
    brief: briefModelOutputSchema,
    narration: narrationModelOutputSchema,
    quotes: quoteModelOutputSchema,
    draft: draftModelOutputSchema,
    ask: askModelOutputSchema,
  };

  it('strips the unsupported keys at every depth of every job schema', () => {
    for (const schema of Object.values(contracts)) {
      const keys = keysDeep(toModelSchema(schema));
      for (const key of REMOVED) expect(keys).not.toContain(key);
      expect(keys).toContain('properties');
    }
  });

  it('keeps required fields and closed enums', () => {
    const draft = toModelSchema(draftModelOutputSchema);
    expect(draft['required']).toEqual(expect.arrayContaining(['body', 'language', 'factsUsed']));
    expect(JSON.stringify(draft)).toContain('"enum":["en","hi"');
  });

  it('keeps array items and nested objects', () => {
    const schema = toModelSchema(
      z.object({
        list: z
          .array(z.object({ id: z.string() }))
          .min(1)
          .max(3),
      }),
    );
    expect(schema).toEqual({
      type: 'object',
      properties: {
        list: {
          type: 'array',
          items: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        },
      },
      required: ['list'],
    });
  });
});
