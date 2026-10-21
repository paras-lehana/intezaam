/**
 * Request schemas — the only shapes the API accepts (SPEC-API "Server routes").
 *
 * Responsibility: validate every inbound payload identically in the web client and the
 * server. All objects are strict, every string is length-bounded (which also bounds
 * prompt-injection payloads), and every request carrying a context checks its date
 * against `todayIso`: at most MAX_DAYS_AHEAD ahead and MAX_DAYS_PAST behind.
 * Boundary: validation only; the server recomputes the plan from the context.
 */
import { z } from 'zod';
import { daysBetweenIso } from '../domain/calendar.js';
import { LANGUAGE_CODES } from '../domain/languages.js';
import { VENDOR_TYPES } from '../domain/vendors.js';
import { idSchema, isoDateSchema } from './common.js';
import { type EventContext, eventContextSchema } from './context.js';
import {
  MAX_ANSWER_CHARS,
  MAX_BRIEF_CHARS,
  MAX_DAYS_AHEAD,
  MAX_DAYS_PAST,
  MAX_HISTORY_TURNS,
  MAX_HOST_NAME_CHARS,
  MAX_QUESTION_CHARS,
  MAX_QUOTE_CHARS,
  MAX_QUOTES,
  MIN_BRIEF_CHARS,
  MIN_QUESTION_CHARS,
  MIN_QUOTES,
} from './limits.js';
import { DRAFT_KINDS, DRAFT_TONES } from './model-outputs.js';
import { contextPatchSchema } from './patch.js';

/**
 * True when the event date (if any) sits inside the planning window around today.
 * @example
 * isWithinPlanningWindow('2026-11-25', '2026-10-20'); // true
 * isWithinPlanningWindow('2031-01-01', '2026-10-20'); // false
 */
export function isWithinPlanningWindow(dateIso: string | undefined, todayIso: string): boolean {
  if (dateIso === undefined) return true;
  const days = daysBetweenIso(todayIso, dateIso);
  return days !== undefined && days <= MAX_DAYS_AHEAD && days >= -MAX_DAYS_PAST;
}

const WINDOW_MESSAGE = `Pick a date within ${MAX_DAYS_AHEAD} days from today (or up to a year ago).`;

/** Adds the date-window check to any request that carries `context` and `todayIso`. */
function withDateWindow<T extends z.ZodType<{ context: EventContext; todayIso: string }>>(
  schema: T,
): T {
  return schema.refine(
    (request) => isWithinPlanningWindow(request.context.dateIso, request.todayIso),
    {
      error: WINDOW_MESSAGE,
      path: ['context', 'dateIso'],
    },
  );
}

export const briefRequestSchema = z.strictObject({
  text: z.string().trim().min(MIN_BRIEF_CHARS).max(MAX_BRIEF_CHARS),
  todayIso: isoDateSchema,
  language: z.enum(LANGUAGE_CODES).optional(),
});

export type BriefRequest = z.infer<typeof briefRequestSchema>;

export const planRequestSchema = withDateWindow(
  z.strictObject({ context: eventContextSchema, todayIso: isoDateSchema }),
);

export type PlanRequest = z.infer<typeof planRequestSchema>;

export const whatIfRequestSchema = withDateWindow(
  z.strictObject({
    context: eventContextSchema,
    patch: contextPatchSchema,
    todayIso: isoDateSchema,
  }),
);

export type WhatIfRequest = z.infer<typeof whatIfRequestSchema>;

export const quotesRequestSchema = withDateWindow(
  z.strictObject({
    context: eventContextSchema,
    todayIso: isoDateSchema,
    category: z.enum(VENDOR_TYPES),
    quotes: z
      .array(z.strictObject({ id: idSchema, text: z.string().trim().min(1).max(MAX_QUOTE_CHARS) }))
      .min(MIN_QUOTES)
      .max(MAX_QUOTES),
  }),
);

export type QuotesRequest = z.infer<typeof quotesRequestSchema>;

export const draftRequestSchema = withDateWindow(
  z.strictObject({
    context: eventContextSchema,
    todayIso: isoDateSchema,
    kind: z.enum(DRAFT_KINDS),
    language: z.enum(LANGUAGE_CODES),
    tone: z.enum(DRAFT_TONES),
    /** With language 'en': write in Hinglish (Hindi in Latin script), as the brief was typed. */
    hinglish: z.boolean().optional(),
    vendorType: z.enum(VENDOR_TYPES).optional(),
    /** Typed by the user; fenced as untrusted text in the prompt. */
    hostName: z.string().trim().min(1).max(MAX_HOST_NAME_CHARS).optional(),
  }),
);

export type DraftRequest = z.infer<typeof draftRequestSchema>;

export const chatTurnSchema = z.strictObject({
  question: z.string().trim().min(1).max(MAX_QUESTION_CHARS),
  answer: z.string().trim().min(1).max(MAX_ANSWER_CHARS),
});

export type ChatTurn = z.infer<typeof chatTurnSchema>;

export const askRequestSchema = withDateWindow(
  z.strictObject({
    context: eventContextSchema,
    todayIso: isoDateSchema,
    question: z.string().trim().min(MIN_QUESTION_CHARS).max(MAX_QUESTION_CHARS),
    history: z.array(chatTurnSchema).max(MAX_HISTORY_TURNS),
  }),
);

export type AskRequest = z.infer<typeof askRequestSchema>;
