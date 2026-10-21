/**
 * The application's services, built once per app.
 *
 * Responsibility: create every GenAI service (each with its own cache) from the same
 * collaborators, so server.ts wires one object. Boundary: construction only.
 */
import { type AskService, createAskService } from './ask-service.js';
import { type BriefService, createBriefService } from './brief-service.js';
import { type DraftService, createDraftService } from './draft-service.js';
import { type PlanService, createPlanService } from './plan-service.js';
import { type QuoteReadService, createQuoteReadService } from './quote-read-service.js';
import { type QuotesService, createQuotesService } from './quotes-service.js';
import type { ServiceDeps } from './service-kit.js';

export interface AppServices {
  readonly briefs: BriefService;
  readonly plans: PlanService;
  readonly quotes: QuotesService;
  readonly quoteReader: QuoteReadService;
  readonly drafts: DraftService;
  readonly asks: AskService;
}

/**
 * Creates every service over the same model client, clock and logger.
 * @example
 * const services = createAppServices({ genai, now: Date.now, logger });
 */
export function createAppServices(deps: ServiceDeps): AppServices {
  return {
    briefs: createBriefService(deps),
    plans: createPlanService(deps),
    quotes: createQuotesService(deps),
    quoteReader: createQuoteReadService(deps),
    drafts: createDraftService(deps),
    asks: createAskService(deps),
  };
}
