/**
 * Brief service — GenAI job 1 behind POST /api/brief.
 *
 * Responsibility: sanitise and redact the brief, serve repeats from cache, ask the model to
 * read it (closed vocabularies, evidence quotes), then run every claimed field through the
 * core evidence guard (`validateBriefDraft`: quote must be in the brief, numbers and dates
 * parsed by code); when no model answers, the offline reader produces the same shape and goes
 * through the same guard. Boundary: orchestration only; all reading rules live in core.
 */
import {
  type BriefRequest,
  type BriefResponse,
  MAX_BRIEF_CHARS,
  MIN_BRIEF_CHARS,
  type Result,
  appError,
  briefModelOutputSchema,
  buildBriefPrompt,
  err,
  ok,
  readBriefOffline,
  validateBriefDraft,
} from '@intezaam/core';
import { createProvenanceTracker } from './provenance.js';
import {
  type ServiceDeps,
  cacheKey,
  cleanUserText,
  createNonce,
  createResultCache,
  fromCache,
  tryModel,
} from './service-kit.js';

/** A brief draft is at most 15 fields plus short evidence quotes: well under 2k tokens. */
const BRIEF_MAX_OUTPUT_TOKENS = 2_048;

type BriefBody = Omit<BriefResponse, 'provenance'>;

export interface BriefService {
  read(req: BriefRequest, signal: AbortSignal): Promise<Result<BriefResponse>>;
}

/**
 * Creates the brief reader with its own cache.
 * @example
 * const briefs = createBriefService({ genai, now: Date.now, logger });
 */
export function createBriefService(deps: ServiceDeps): BriefService {
  const { now } = deps;
  const cache = createResultCache<BriefBody>(now);

  return {
    async read(req, signal) {
      const tracker = createProvenanceTracker(now);
      const cleanStartedAt = now();
      const text = cleanUserText(req.text, MAX_BRIEF_CHARS).text;
      tracker.rules('sanitize-redact', cleanStartedAt);
      if (text.trim().length < MIN_BRIEF_CHARS) {
        return err(
          appError(
            'VALIDATION_FAILED',
            'text: has no readable words; please describe the celebration.',
          ),
        );
      }
      const key = cacheKey(['brief', text, req.todayIso]);
      const hit = fromCache(cache.get(key), tracker, now());
      if (hit !== undefined) return ok({ ...hit.value, provenance: hit.provenance });

      const prompt = buildBriefPrompt({ text, todayIso: req.todayIso, nonce: createNonce() });
      const reply = await tryModel(deps, tracker, 'read-brief', {
        system: prompt.systemInstruction,
        prompt: prompt.prompt,
        schema: briefModelOutputSchema,
        maxOutputTokens: BRIEF_MAX_OUTPUT_TOKENS,
        signal,
      });
      const guardStartedAt = now();
      // The guard checks quotes against the redacted text, which is exactly what the model saw.
      const checked = validateBriefDraft(
        reply ?? readBriefOffline(text, req.todayIso),
        text,
        req.todayIso,
      );
      tracker.rules(reply === undefined ? 'read-brief-offline' : 'evidence-check', guardStartedAt);
      const body: BriefBody = {
        draft: checked.draft,
        filled: checked.filled,
        missing: checked.missing,
        understood: checked.understood,
      };
      const provenance = tracker.build(reply === undefined ? 'offline' : 'gemini');
      if (reply !== undefined) cache.set(key, { value: body, provenance });
      return ok({ ...body, provenance });
    },
  };
}
