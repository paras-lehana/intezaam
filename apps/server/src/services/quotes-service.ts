/**
 * Quotes service — GenAI job 3 (quote reader and comparer) behind POST /api/quotes/compare.
 *
 * Responsibility: sanitise and redact the pasted quotes (phones, email, UPI and bank details
 * never reach the model), build the plan for the posted context (the server never trusts client
 * totals), read the quotes with the model — or the offline regex reader — and let core's
 * `normaliseQuotes` keep only amounts whose evidence is in the quote, parse every amount, add
 * GST, total for the expected guests, compare with the budget line and drop any sentence that
 * recommends or ranks a vendor. Boundary: orchestration only.
 */
import {
  MAX_QUOTE_CHARS,
  type QuoteModelOutput,
  type QuotesRequest,
  type QuotesResponse,
  type Result,
  buildPlan,
  buildQuotePrompt,
  compareQuotesOffline,
  normaliseQuotes,
  ok,
  quoteModelOutputSchema,
} from '@intezaam/core';
import { createProvenanceTracker } from './provenance.js';
import {
  type ServiceDeps,
  cacheKey,
  cleanUserText,
  createNonce,
  createResultCache,
  tryModel,
} from './service-kit.js';

/** Three quotes with up to twelve amounts each, plus differences and questions. */
const QUOTES_MAX_OUTPUT_TOKENS = 4_096;

export interface QuotesService {
  compare(req: QuotesRequest, signal: AbortSignal): Promise<Result<QuotesResponse>>;
}

/**
 * Creates the quote comparer. The cache holds the model's READING of the quotes; totals are
 * recomputed against the current plan on every request, so a changed guest count still counts.
 * @example
 * const quotes = createQuotesService({ genai, now: Date.now, logger });
 */
export function createQuotesService(deps: ServiceDeps): QuotesService {
  const { now } = deps;
  const cache = createResultCache<QuoteModelOutput>(now);

  return {
    async compare(req, signal) {
      const tracker = createProvenanceTracker(now);
      const startedAt = now();
      const built = buildPlan(req.context, req.todayIso);
      if (!built.ok) return built;
      const quotes = req.quotes.map((quote) => ({
        id: quote.id,
        text: cleanUserText(quote.text, MAX_QUOTE_CHARS).text,
      }));
      const language = req.context.language;
      tracker.rules('plan-and-redact', startedAt);

      const key = cacheKey([
        'quotes',
        req.category,
        language,
        ...quotes.flatMap((quote) => [quote.id, quote.text]),
      ]);
      const lookupStartedAt = now();
      const cached = cache.get(key);
      if (cached !== undefined) tracker.cacheHit(cached.provenance, lookupStartedAt);
      const readWithModel = (): Promise<QuoteModelOutput | undefined> => {
        const prompt = buildQuotePrompt({
          category: req.category,
          quotes,
          language,
          nonce: createNonce(),
        });
        return tryModel(deps, tracker, 'read-quotes', {
          system: prompt.systemInstruction,
          prompt: prompt.prompt,
          schema: quoteModelOutputSchema,
          maxOutputTokens: QUOTES_MAX_OUTPUT_TOKENS,
          signal,
        });
      };
      const reading = cached?.value ?? (await readWithModel());
      const normaliseStartedAt = now();
      const output = reading ?? compareQuotesOffline(quotes, req.category);
      const comparison = normaliseQuotes(output, quotes, req.category, built.value);
      tracker.rules(
        reading === undefined ? 'read-quotes-offline' : 'normalise-quotes',
        normaliseStartedAt,
      );
      // Only model readings are cached, so a cached reading is a Gemini one.
      const provenance = tracker.build(reading === undefined ? 'offline' : 'gemini');
      if (cached === undefined && reading !== undefined)
        cache.set(key, { value: reading, provenance });
      return ok({ ...comparison, provenance });
    },
  };
}
