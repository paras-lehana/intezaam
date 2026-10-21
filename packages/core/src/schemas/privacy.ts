/**
 * Redaction counts — what PII was removed before text reached a model or a cache.
 *
 * Responsibility: the closed list of identifier types the redactor replaces (Aadhaar,
 * PAN, phone, email, bank account, IFSC, UPI, card) and the count shape responses and
 * logs report. Boundary: shapes only; privacy/redact.ts does the redaction.
 */
import { z } from 'zod';

export const REDACTION_TYPES = [
  'aadhaar',
  'pan',
  'phone',
  'email',
  'bank-account',
  'ifsc',
  'upi',
  'card',
] as const;

export type RedactionType = (typeof REDACTION_TYPES)[number];

export const redactionCountSchema = z.strictObject({
  type: z.enum(REDACTION_TYPES),
  count: z.number().int().min(1),
});

export type RedactionCount = z.infer<typeof redactionCountSchema>;
