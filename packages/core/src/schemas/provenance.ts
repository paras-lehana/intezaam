/**
 * Provenance — which engine produced an AI-backed response, and how long it took.
 *
 * Responsibility: the badge data every GenAI response carries ("Explained by Gemini ·
 * model · seconds" or "Offline planner"), in the shape the previous project shipped.
 * Boundary: shape only; the server's services fill it.
 */
import { z } from 'zod';
import { MAX_LABEL_CHARS, MAX_MODEL_ID_CHARS } from './limits.js';

export const ENGINE_MODES = ['gemini', 'offline'] as const;

export type EngineMode = (typeof ENGINE_MODES)[number];

/** A response names at most a primary model and its failovers. */
const MAX_MODELS = 6;
/** Redact, sanitise, cache, model, faithfulness, fallback… ten steps is ample. */
const MAX_STEPS = 10;

/** Why an answer came from the offline planner (addendum 13): shown next to the badge. */
export const OFFLINE_REASONS = ['daily_quota', 'upstream_error', 'not_configured'] as const;

export type OfflineReason = (typeof OFFLINE_REASONS)[number];

export const provenanceSchema = z.strictObject({
  mode: z.enum(ENGINE_MODES),
  /** Set only for offline answers. */
  reason: z.enum(OFFLINE_REASONS).optional(),
  models: z.array(z.string().min(1).max(MAX_MODEL_ID_CHARS)).max(MAX_MODELS),
  latencyMs: z.number().int().min(0),
  steps: z
    .array(
      z.strictObject({
        name: z.string().min(1).max(MAX_LABEL_CHARS),
        engine: z.string().min(1).max(MAX_MODEL_ID_CHARS),
        ms: z.number().int().min(0),
      }),
    )
    .max(MAX_STEPS),
});

export type Provenance = z.infer<typeof provenanceSchema>;
