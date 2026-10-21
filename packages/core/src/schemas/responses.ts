/**
 * Response schemas — what every API route returns (SPEC-API "Server routes").
 *
 * Responsibility: one schema per route response, used by the server's tests and by the
 * web client to validate what it receives, plus the health and error envelopes.
 * Boundary: shapes only; the server's services build these.
 */
import { z } from 'zod';
import { ERROR_CODES } from '../errors.js';
import { PLAN_SECTIONS } from '../domain/ideas.js';
import { BRIEF_FIELDS, briefDraftSchema } from './brief.js';
import { inrSchema, lineSchema, signedInrSchema } from './common.js';
import { planDiffSchema } from './diff.js';
import {
  MAX_ANSWER_CHARS,
  MAX_DRAFT_BODY_CHARS,
  MAX_MODEL_ID_CHARS,
  MAX_QUOTES,
  MAX_SUBJECT_CHARS,
} from './limits.js';
import {
  REFUSAL_REASONS,
  narrationSchema,
  parsedQuoteSchema,
  quoteModelOutputSchema,
} from './model-outputs.js';
import { contextPatchSchema } from './patch.js';
import { planSchema } from './plan.js';
import { provenanceSchema } from './provenance.js';

const MAX_UNDERSTOOD_CHARS = 200;
const MAX_QUOTE_FLAGS = 10;
const MAX_VERSION_CHARS = 32;
const MAX_MODELS = 6;
/** Error copy is a fixed sentence from DEFAULT_MESSAGE_BY_CODE, well under 300 characters. */
const MAX_ERROR_MESSAGE_CHARS = 300;

export const briefResponseSchema = z.strictObject({
  draft: briefDraftSchema,
  filled: z.array(z.enum(BRIEF_FIELDS)).max(BRIEF_FIELDS.length),
  missing: z.array(z.enum(BRIEF_FIELDS)).max(BRIEF_FIELDS.length),
  understood: z.string().max(MAX_UNDERSTOOD_CHARS),
  provenance: provenanceSchema,
});

export type BriefResponse = z.infer<typeof briefResponseSchema>;

/**
 * POST /api/plan/narration — the narration alone, for the browser, which has already built
 * the plan with the same engine. Efficiency: a few hundred bytes instead of the whole plan
 * (about 100 kB of JSON for a wedding), and no second full plan parse in the browser.
 */
export const narrationResponseSchema = z.strictObject({
  narration: narrationSchema,
  provenance: provenanceSchema,
});

export type NarrationResponse = z.infer<typeof narrationResponseSchema>;

/** POST /api/plan — the engine's plan plus its narration, for API clients that send a context only. */
export const planResponseSchema = z.strictObject({
  plan: planSchema,
  ...narrationResponseSchema.shape,
});

export type PlanResponse = z.infer<typeof planResponseSchema>;

export const whatIfResponseSchema = z.strictObject({
  before: planSchema,
  after: planSchema,
  diff: planDiffSchema,
});

export type WhatIfResponse = z.infer<typeof whatIfResponseSchema>;

/** Code-normalised totals for one quote: expected guests, GST added, against the budget line. */
export const normalisedQuoteSchema = z.strictObject({
  quoteId: z.string().min(1),
  totalInr: inrSchema.optional(),
  perGuestInr: inrSchema.optional(),
  gstAdded: z.boolean(),
  /** Quote total minus the budget line; positive means over budget. */
  vsBudgetLineInr: signedInrSchema.optional(),
  flags: z.array(lineSchema).max(MAX_QUOTE_FLAGS),
});

export type NormalisedQuote = z.infer<typeof normalisedQuoteSchema>;

export const quotesResponseSchema = z.strictObject({
  quotes: z.array(parsedQuoteSchema).max(MAX_QUOTES),
  normalised: z.array(normalisedQuoteSchema).max(MAX_QUOTES),
  differences: quoteModelOutputSchema.shape.differences,
  questions: quoteModelOutputSchema.shape.questions,
  provenance: provenanceSchema,
});

export type QuotesResponse = z.infer<typeof quotesResponseSchema>;

export const draftResponseSchema = z.strictObject({
  subject: z.string().max(MAX_SUBJECT_CHARS).optional(),
  body: z.string().min(1).max(MAX_DRAFT_BODY_CHARS),
  gmailUrl: z.url().optional(),
  whatsappUrl: z.url(),
  provenance: provenanceSchema,
});

export type DraftResponse = z.infer<typeof draftResponseSchema>;

export const askResponseSchema = z.strictObject({
  answer: z.string().min(1).max(MAX_ANSWER_CHARS),
  sources: z.array(z.enum(PLAN_SECTIONS)).max(PLAN_SECTIONS.length),
  patch: contextPatchSchema.optional(),
  refusal: z.strictObject({ reason: z.enum(REFUSAL_REASONS) }).optional(),
  provenance: provenanceSchema,
});

export type AskResponse = z.infer<typeof askResponseSchema>;

export const healthResponseSchema = z.strictObject({
  status: z.literal('ok'),
  version: z.string().min(1).max(MAX_VERSION_CHARS),
  ai: z.strictObject({
    configured: z.boolean(),
    models: z.array(z.string().min(1).max(MAX_MODEL_ID_CHARS)).max(MAX_MODELS),
  }),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

/** The only error shape on the wire; the message never echoes user input. */
export const errorResponseSchema = z.strictObject({
  error: z.strictObject({
    code: z.enum(ERROR_CODES),
    message: z.string().min(1).max(MAX_ERROR_MESSAGE_CHARS),
  }),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
