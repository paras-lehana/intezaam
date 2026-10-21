/**
 * Trace contracts — the "Why this?" behind every number (synthesis §4.1).
 *
 * Responsibility: the wire shapes of a source reference and of one trace item (rule id,
 * the context signals that triggered it, its effect, cited sources, grade and whether it
 * is an assumption). Boundary: shapes only; the engines emit trace items.
 */
import { z } from 'zod';
import { RULE_IDS } from '../domain/rule-ids.js';
import { SOURCE_ID_PATTERN } from '../domain/sources.js';
import { CONFIDENCE_GRADES } from '../domain/source-types.js';
import { idSchema, lineSchema } from './common.js';
import { MAX_LABEL_CHARS, MAX_TRACE_INPUTS, MAX_TRACE_SOURCES } from './limits.js';

/** Register ids look like `S-VK-2026` (domain/sources.ts). */
export const sourceIdSchema = z.string().regex(SOURCE_ID_PATTERN);

/** Publication years the register can hold; anything else is a typo. */
const MIN_SOURCE_YEAR = 1900;
const MAX_SOURCE_YEAR = 2100;

export const sourceRefSchema = z.strictObject({
  id: sourceIdSchema,
  title: z
    .string()
    .min(1)
    .max(MAX_LABEL_CHARS * 2),
  publisher: z.string().min(1).max(MAX_LABEL_CHARS),
  url: z.url(),
  year: z.union([z.number().int().min(MIN_SOURCE_YEAR).max(MAX_SOURCE_YEAR), z.literal('n.d.')]),
  confidence: z.enum(CONFIDENCE_GRADES),
});

export type SourceRef = z.infer<typeof sourceRefSchema>;

/** One context signal a rule read, as display text ("guests" = "300"). */
export const traceInputSchema = z.strictObject({
  key: z.string().min(1).max(40),
  value: z.string().max(120),
});

export const traceItemSchema = z.strictObject({
  id: idSchema,
  ruleId: z.enum(RULE_IDS),
  title: z.string().min(1).max(MAX_LABEL_CHARS),
  inputs: z.array(traceInputSchema).max(MAX_TRACE_INPUTS),
  /** What the rule did, in one plain sentence. */
  effect: lineSchema,
  sourceIds: z.array(sourceIdSchema).max(MAX_TRACE_SOURCES),
  confidence: z.enum(CONFIDENCE_GRADES),
  /** True for grade-D logic or values: the UI labels these "assumption". */
  assumption: z.boolean(),
});

export type TraceItem = z.infer<typeof traceItemSchema>;
