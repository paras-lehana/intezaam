/**
 * zod → JSON Schema for the model's structured-output request.
 *
 * Responsibility: convert a model-output contract into the JSON Schema dialect Gemini's
 * OpenAI-compatible endpoint accepts, minus the keys it rejects or mishandles: `$schema`,
 * `additionalProperties`, `minItems` and `maxItems` (array bounds are enforced by zod after
 * the call, synthesis §5 "shared transport"). Boundary: pure; the same zod schema validates
 * the reply, so the contract is written once.
 */
import { z } from 'zod';

/** Keys removed at every depth of the generated schema. */
const UNSUPPORTED_KEYS: ReadonlySet<string> = new Set([
  '$schema',
  'additionalProperties',
  'minItems',
  'maxItems',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stripValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripValue);
  return isRecord(value) ? stripRecord(value) : value;
}

function stripRecord(value: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (!UNSUPPORTED_KEYS.has(key)) cleaned[key] = stripValue(child);
  }
  return cleaned;
}

/**
 * The JSON Schema to embed in a model request for a zod contract.
 * @example
 * const schema = toModelSchema(draftModelOutputSchema);
 * JSON.stringify(schema).includes('additionalProperties'); // false
 */
export function toModelSchema(schema: z.ZodType): Record<string, unknown> {
  return stripRecord(z.toJSONSchema(schema, { unrepresentable: 'any' }));
}
