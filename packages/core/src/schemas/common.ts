/**
 * Shared schema primitives: ids, dates, times, money, text lines and user-typed text fields.
 *
 * Responsibility: the small zod building blocks every contract reuses, so a rupee amount
 * or an ISO date is validated the same way in the context, the plan and the model
 * outputs, and a short free-text field (city, event title) is cleaned the same way
 * wherever it is parsed. Boundary: primitives only; contracts are in the neighbouring files.
 */
import { z } from 'zod';
import { isValidIsoDate } from '../domain/calendar.js';
import { redactPii } from '../privacy/redact.js';
import { sanitizeUserText } from '../security/sanitize.js';
import {
  MAX_AMOUNT_INR,
  MAX_ID_CHARS,
  MAX_LABEL_CHARS,
  MAX_LINE_CHARS,
  MAX_TRACE_REFS,
} from './limits.js';

/** An opaque, length-bounded id. */
export const idSchema = z.string().trim().min(1).max(MAX_ID_CHARS);

/** A real calendar date (YYYY-MM-DD); 2027-02-29 is rejected. */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Use the YYYY-MM-DD date format.' })
  .refine(isValidIsoDate, { error: 'That date does not exist.' });

/** 24-hour clock time, 00:00–23:59. */
export const hhmmSchema = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, { error: 'Use the HH:MM 24-hour format.' });

/** A month key for cash-flow rows (YYYY-MM). */
export const monthKeySchema = z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/);

/** Whole rupees, never negative. */
export const inrSchema = z.number().int().min(0).max(MAX_AMOUNT_INR);

/** Whole rupees that may be negative (deltas, gaps). */
export const signedInrSchema = z.number().int().min(-MAX_AMOUNT_INR).max(MAX_AMOUNT_INR);

/** A low–mid–high estimate in whole rupees. */
export const inrEstimateSchema = z.strictObject({
  low: inrSchema,
  mid: inrSchema,
  high: inrSchema,
});

export type InrEstimate = z.infer<typeof inrEstimateSchema>;

/** A min–max range of whole rupees. */
export const inrRangeSchema = z.strictObject({ min: inrSchema, max: inrSchema });

/** A short title: a task, a risk, a lever, a vendor. */
export const labelSchema = z.string().trim().min(1).max(MAX_LABEL_CHARS);

/** One line of plan text. */
export const lineSchema = z.string().trim().min(1).max(MAX_LINE_CHARS);

/** Trace ids attached to any plan item so the UI can show "Why this?". */
export const traceIdsSchema = z.array(idSchema).max(MAX_TRACE_REFS);

/** A whole count of people or items. */
export const countSchema = z.number().int().min(0);

/** A 0–1 share. */
export const shareSchema = z.number().min(0).max(1);

/**
 * The text a short user-typed field may carry onwards. Order matters: hidden and reordering
 * characters go first, so a zero-width space or a tag character cannot split a phone number
 * past the redactor; the cap runs once more because a placeholder can be longer than what it
 * replaced ("a/c 123456789" becomes "a/c [BANK_ACCOUNT]").
 */
function cleanFieldText(text: string, maxChars: number): string {
  // Efficiency: a fixed chain of linear regex passes over a 60–80 character field, so the
  // form's parse on every keystroke stays in microseconds.
  return sanitizeUserText(redactPii(sanitizeUserText(text, maxChars)).text, maxChars);
}

/**
 * A short free-text field the user types (city, event title, a what-if city). Security: the
 * value leaves the schema already sanitised and PII-redacted, so every consumer of a parsed
 * context (plan trace, narration and draft prompts, exports, cache keys) sees clean text
 * without each service having to remember to clean it. The length is checked on the trimmed
 * input, as the form's maxLength counts it; emptiness is checked after cleaning, so a value
 * made only of hidden characters is rejected instead of being planned as a blank.
 * @example
 * userTextFieldSchema(60).parse(' Pune\u{202E} 9876543210 '); // 'Pune [PHONE]'
 * userTextFieldSchema(60).safeParse('\u{200B}').success; // false
 */
export function userTextFieldSchema(maxChars: number): z.ZodString {
  // `.overwrite` (not `.transform`) keeps a plain ZodString: `.partial()` and `.pick()` still
  // work, and the JSON Schema handed to the model keeps its type and length bounds.
  return z
    .string()
    .trim()
    .max(maxChars)
    .overwrite((text) => cleanFieldText(text, maxChars))
    .min(1);
}
