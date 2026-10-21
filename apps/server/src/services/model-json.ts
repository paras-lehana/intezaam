/**
 * Model JSON parsing — the step between a model's reply text and a typed value.
 *
 * Responsibility: strip a markdown fence, parse JSON and validate it with the core zod
 * contract, with one forgiving second pass that drops blank strings (models without
 * constrained decoding send `""` for optional fields). Boundary: pure; the error carries only
 * a fixed internal hint, never the reply text.
 */
import { type Result, appError, err, ok } from '@intezaam/core';
import type { z } from 'zod';

const MARKDOWN_FENCE_START = /^```(?:json)?\s*/i;
const MARKDOWN_FENCE_END = /\s*```$/;

/**
 * Removes blank strings from objects (the property) and arrays (the item), recursively.
 * @example
 * dropBlankStrings({ subject: '', asks: ['a', ' '] }); // { asks: ['a'] }
 */
export function dropBlankStrings(value: unknown): unknown {
  const isBlank = (item: unknown): boolean => typeof item === 'string' && item.trim().length === 0;
  if (Array.isArray(value)) return value.filter((item) => !isBlank(item)).map(dropBlankStrings);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => !isBlank(item))
      .map(([key, item]) => [key, dropBlankStrings(item)]),
  );
}

/**
 * Parses model JSON, tolerating a markdown fence around it, then validates it with zod.
 * Through the OpenAI-compatible gateway, models send `""` for an optional field they have
 * nothing for (seen live for a WhatsApp draft's `subject`); a second pass without blank
 * strings rescues those, and a blank required field still fails.
 * @example
 * parseModelJson('```json\n{"answer":"yes"}\n```', z.object({ answer: z.string() })); // ok({ answer: 'yes' })
 */
export function parseModelJson<T>(text: string, schema: z.ZodType<T>): Result<T> {
  const unfenced = text.trim().replace(MARKDOWN_FENCE_START, '').replace(MARKDOWN_FENCE_END, '');
  let raw: unknown;
  try {
    raw = JSON.parse(unfenced);
  } catch {
    return err(appError('UPSTREAM_FAILURE', undefined, 'model output is not JSON'));
  }
  const parsed = schema.safeParse(raw);
  if (parsed.success) return ok(parsed.data);
  const retried = schema.safeParse(dropBlankStrings(raw));
  return retried.success
    ? ok(retried.data)
    : err(appError('UPSTREAM_FAILURE', undefined, 'model output failed schema validation'));
}
