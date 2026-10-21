/**
 * Contract for POST /api/quotes/read (GenAI job 3a).
 *
 * Responsibility: the request — one quote file whose bytes must carry the signature of the
 * declared type (`quoteFileSchema`: PDF, JPEG, PNG or WebP, at most 2 MiB) — and the response:
 * a redacted, editable transcript, what was redacted, and the provenance badge. Shared by the
 * server's validation and the web client. Boundary: shapes only.
 */
import { z } from 'zod';
import { quoteFileSchema } from '../security/magic-bytes.js';
import { MAX_QUOTE_CHARS } from './limits.js';
import { REDACTION_TYPES, redactionCountSchema } from './privacy.js';
import { provenanceSchema } from './provenance.js';

export const quoteReadRequestSchema = z.strictObject({ file: quoteFileSchema });

export type QuoteReadRequest = z.infer<typeof quoteReadRequestSchema>;

export const quoteReadResponseSchema = z.strictObject({
  /** Goes into the quote's text box, where the family can see and correct it before comparing. */
  text: z.string().min(1).max(MAX_QUOTE_CHARS),
  redactions: z.array(redactionCountSchema).max(REDACTION_TYPES.length),
  provenance: provenanceSchema,
});

export type QuoteReadResponse = z.infer<typeof quoteReadResponseSchema>;
