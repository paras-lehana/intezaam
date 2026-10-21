/**
 * Model-output contracts for GenAI jobs 2–5: plan narration with ideas, quote reading,
 * message drafts and Ask (synthesis §5).
 *
 * Responsibility: LEAN shapes the model must return, validated after every call; plus
 * the narration shape the API returns once code has attached cost bands and YouTube
 * links. Ideas never carry rupee amounts; drafts and answers carry only plan facts.
 * Boundary: shapes only; prompts, guards and offline twins live with the GenAI code.
 */
import { z } from 'zod';
import {
  COST_BANDS,
  EFFORT_LEVELS,
  IDEA_CATEGORIES,
  PLAN_SECTIONS,
  SIGNAL_KEYS,
} from '../domain/ideas.js';
import { LANGUAGE_CODES } from '../domain/languages.js';
import { idSchema, labelSchema, lineSchema } from './common.js';
import {
  MAX_ANSWER_CHARS,
  MAX_DRAFT_BODY_CHARS,
  MAX_HEADLINE_CHARS,
  MAX_IDEA_DESCRIPTION_CHARS,
  MAX_IDEAS,
  MAX_QUOTES,
  MAX_SUBJECT_CHARS,
  MAX_SUMMARY_CHARS,
  MAX_YOUTUBE_QUERY_CHARS,
  MIN_IDEAS,
} from './limits.js';
import { contextPatchSchema } from './patch.js';

/** The narrative cites up to five trace items and three next actions (job 2). */
const MAX_REASONS = 5;
const MAX_ACTIONS = 3;
const MAX_THEMES = 4;
/** The ideas board shows three palette words per theme. */
export const PALETTE_WORDS = 3;
/**
 * Models sometimes list more than three (seen live on 21 Oct 2026, which failed the whole
 * narration); the reply may carry up to eight and code keeps the first three.
 */
const MAX_MODEL_PALETTE_WORDS = 8;
const MAX_PALETTE_WORD_CHARS = 30;

function themesSchema(maxWords: number) {
  return z
    .array(
      z.strictObject({
        name: labelSchema,
        paletteWords: z.array(z.string().min(1).max(MAX_PALETTE_WORD_CHARS)).min(1).max(maxWords),
      }),
    )
    .max(MAX_THEMES)
    .optional();
}

export const modelIdeaSchema = z.strictObject({
  category: z.enum(IDEA_CATEGORIES),
  title: labelSchema,
  description: z.string().trim().min(1).max(MAX_IDEA_DESCRIPTION_CHARS),
  whyItFits: z.strictObject({ signal: z.enum(SIGNAL_KEYS), text: lineSchema }),
  effort: z.enum(EFFORT_LEVELS),
  eco: z.boolean(),
  youtubeQuery: z.string().trim().min(1).max(MAX_YOUTUBE_QUERY_CHARS),
});

const narrationCore = {
  headline: z.string().trim().min(1).max(MAX_HEADLINE_CHARS),
  summary: z.string().trim().min(1).max(MAX_SUMMARY_CHARS),
  reasons: z.array(z.strictObject({ traceId: idSchema, text: lineSchema })).max(MAX_REASONS),
  actions: z.array(z.strictObject({ taskId: idSchema, text: lineSchema })).max(MAX_ACTIONS),
};

/** Job 2 output: ids must exist in the plan facts, or the server drops the item. */
export const narrationModelOutputSchema = z.strictObject({
  ...narrationCore,
  themes: themesSchema(MAX_MODEL_PALETTE_WORDS),
  ideas: z.array(modelIdeaSchema).min(MIN_IDEAS).max(MAX_IDEAS),
});

export type NarrationModelOutput = z.infer<typeof narrationModelOutputSchema>;

/** An idea as the API returns it: code attaches the cost band and the YouTube search link. */
export const ideaSchema = modelIdeaSchema.extend({
  costBand: z.enum(COST_BANDS),
  youtubeUrl: z.url(),
});

export type Idea = z.infer<typeof ideaSchema>;

/** Narration as returned; diet filtering may leave fewer than six ideas. */
export const narrationSchema = z.strictObject({
  ...narrationCore,
  themes: themesSchema(PALETTE_WORDS),
  ideas: z.array(ideaSchema).max(MAX_IDEAS),
});

export type Narration = z.infer<typeof narrationSchema>;

export const PRICE_BASES = ['per-plate', 'per-event', 'per-day', 'per-hour', 'package'] as const;
export const GST_MENTIONS = ['included', 'extra', 'not-stated'] as const;

const MAX_QUOTE_AMOUNTS = 12;
const MAX_QUOTE_ITEMS = 20;
const MAX_AMOUNT_TEXT_CHARS = 60;
const MAX_EVIDENCE_CHARS = 200;
const MAX_DIFFERENCES = 10;
const MAX_QUOTE_QUESTIONS = 15;

export const parsedQuoteSchema = z.strictObject({
  quoteId: idSchema,
  priceBasis: z.enum(PRICE_BASES),
  amounts: z
    .array(
      z.strictObject({
        label: labelSchema,
        amountText: z.string().trim().min(1).max(MAX_AMOUNT_TEXT_CHARS),
        evidence: z.string().trim().min(1).max(MAX_EVIDENCE_CHARS),
      }),
    )
    .max(MAX_QUOTE_AMOUNTS),
  inclusions: z.array(lineSchema).max(MAX_QUOTE_ITEMS),
  exclusions: z.array(lineSchema).max(MAX_QUOTE_ITEMS),
  advanceText: lineSchema.optional(),
  cancellationText: lineSchema.optional(),
  validityText: lineSchema.optional(),
  gst: z.enum(GST_MENTIONS),
});

export type ParsedQuote = z.infer<typeof parsedQuoteSchema>;

/** Job 3 output: neutral differences only — it never recommends or ranks a vendor. */
export const quoteModelOutputSchema = z.strictObject({
  quotes: z.array(parsedQuoteSchema).min(1).max(MAX_QUOTES),
  differences: z.array(lineSchema).max(MAX_DIFFERENCES),
  questions: z
    .array(z.strictObject({ quoteId: idSchema, text: lineSchema }))
    .max(MAX_QUOTE_QUESTIONS),
});

export type QuoteModelOutput = z.infer<typeof quoteModelOutputSchema>;

export const DRAFT_KINDS = [
  'vendor-enquiry',
  'invitation',
  'rsvp-reminder',
  'volunteer-brief',
  'thank-you',
  'plan-summary',
] as const;

export const DRAFT_TONES = ['warm', 'formal'] as const;

/** The facts a draft may use; every number or date in it must come from one of these. */
export const DRAFT_FACT_KEYS = [
  'eventKind',
  'date',
  'city',
  'guestBand',
  'budgetBand',
  'functions',
  'vendorCategory',
  'questions',
  'hostName',
] as const;

/** Job 4 output. */
export const draftModelOutputSchema = z.strictObject({
  subject: z.string().trim().min(1).max(MAX_SUBJECT_CHARS).optional(),
  body: z.string().trim().min(1).max(MAX_DRAFT_BODY_CHARS),
  language: z.enum(LANGUAGE_CODES),
  factsUsed: z.array(z.enum(DRAFT_FACT_KEYS)).max(DRAFT_FACT_KEYS.length),
});

export type DraftModelOutput = z.infer<typeof draftModelOutputSchema>;

/** Ask refuses to book, pay or give legal advice, and anything off the plan's scope. */
export const REFUSAL_REASONS = ['booking-or-payment', 'legal-advice', 'off-scope'] as const;

/** Job 5 output: a proposed patch is applied only after the user presses Apply. */
export const askModelOutputSchema = z.strictObject({
  answer: z.string().trim().min(1).max(MAX_ANSWER_CHARS),
  sources: z.array(z.enum(PLAN_SECTIONS)).max(PLAN_SECTIONS.length),
  patch: contextPatchSchema.optional(),
  refusal: z.strictObject({ reason: z.enum(REFUSAL_REASONS) }).optional(),
});

export type AskModelOutput = z.infer<typeof askModelOutputSchema>;
