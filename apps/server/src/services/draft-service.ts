/**
 * Draft service — GenAI job 4 (messages) behind POST /api/drafts.
 *
 * Responsibility: build the plan, pick the draft facts from it (a vendor enquiry never carries
 * the budget; the host's typed name is sanitised, redacted and fenced), ask the model for the
 * message in the chosen language and tone, and let core's draft check replace it with the
 * template when it has a number or date that is not a fact, a link or phone number, or the
 * wrong script. A family that typed its brief in Hinglish gets an English draft in Hinglish
 * (model and template alike). Code attaches the Gmail compose link (drafts with a subject) and
 * the WhatsApp link. Boundary: orchestration only.
 */
import {
  type DraftModelOutput,
  type DraftRequest,
  type DraftResponse,
  MAX_HOST_NAME_CHARS,
  type Result,
  buildDraftFacts,
  buildDraftPrompt,
  buildGmailComposeUrl,
  buildPlan,
  buildWhatsAppUrl,
  checkDraftFaithfulness,
  draftFactLines,
  draftModelOutputSchema,
  draftOffline,
  ok,
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

/** A body under 900 characters; Indic scripts take several tokens per character. */
const DRAFT_MAX_OUTPUT_TOKENS = 2_048;

type DraftBody = Omit<DraftResponse, 'provenance'>;

export interface DraftService {
  draft(req: DraftRequest, signal: AbortSignal): Promise<Result<DraftResponse>>;
}

/** The share links code builds for a finished draft. */
function withLinks(draft: DraftModelOutput): DraftBody {
  const subject = draft.subject;
  return {
    ...(subject === undefined
      ? {}
      : { subject, gmailUrl: buildGmailComposeUrl({ subject, body: draft.body }) }),
    body: draft.body,
    whatsappUrl: buildWhatsAppUrl(draft.body),
  };
}

/**
 * Creates the drafting service with its own cache.
 * @example
 * const drafts = createDraftService({ genai, now: Date.now, logger });
 */
export function createDraftService(deps: ServiceDeps): DraftService {
  const { now } = deps;
  const cache = createResultCache<DraftBody>(now);

  return {
    async draft(req, signal) {
      const tracker = createProvenanceTracker(now);
      const startedAt = now();
      const built = buildPlan(req.context, req.todayIso);
      if (!built.ok) return built;
      const hostName =
        req.hostName === undefined ? '' : cleanUserText(req.hostName, MAX_HOST_NAME_CHARS).text;
      const facts = buildDraftFacts(built.value, {
        kind: req.kind,
        ...(req.vendorType === undefined ? {} : { vendorType: req.vendorType }),
        ...(hostName === '' ? {} : { hostName }),
      });
      // Hinglish is a register of English; core ignores it for any other language.
      const register = req.hinglish === true ? { register: 'hinglish' as const } : {};
      const fallback = draftOffline(
        { kind: req.kind, language: req.language, tone: req.tone, ...register },
        facts,
      );
      tracker.rules('plan-and-facts', startedAt);

      const key = cacheKey([
        'draft',
        req.kind,
        req.language,
        req.tone,
        req.hinglish === true ? 'hinglish' : 'standard',
        draftFactLines(facts),
        hostName,
      ]);
      const hit = fromCache(cache.get(key), tracker, now());
      if (hit !== undefined) return ok({ ...hit.value, provenance: hit.provenance });

      const prompt = buildDraftPrompt({
        kind: req.kind,
        language: req.language,
        tone: req.tone,
        facts,
        nonce: createNonce(),
        ...register,
      });
      const reply = await tryModel(deps, tracker, 'draft', {
        system: prompt.systemInstruction,
        prompt: prompt.prompt,
        schema: draftModelOutputSchema,
        maxOutputTokens: DRAFT_MAX_OUTPUT_TOKENS,
        signal,
      });
      const checkStartedAt = now();
      const checked =
        reply === undefined
          ? undefined
          : checkDraftFaithfulness(reply, facts, fallback, req.language);
      tracker.rules(reply === undefined ? 'draft-offline' : 'draft-check', checkStartedAt);
      // A replaced draft is the template, so its badge says offline.
      const fromModel = checked !== undefined && checked.replacedBecause === undefined;
      const body = withLinks(checked?.draft ?? fallback);
      const provenance = tracker.build(fromModel ? 'gemini' : 'offline');
      if (fromModel) cache.set(key, { value: body, provenance });
      return ok({ ...body, provenance });
    },
  };
}
