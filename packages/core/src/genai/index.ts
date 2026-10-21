/**
 * GenAI barrel (server-only, re-exported from the package root): prompt builders, reply
 * guards and the contracts between them for the five jobs (synthesis §5).
 *
 * Responsibility: one entry point for `buildBriefPrompt`, `buildNarrationPrompt`,
 * `buildQuotePrompt`, `buildDraftPrompt`, `buildAskPrompt`, `toModelSchema` and the
 * code-enforced guards (`validateBriefDraft`, `checkNarrationFaithfulness`,
 * `enforceIdeaConstraints`, `normaliseQuotes`, `applyAskPatch`, `checkAskReply`,
 * `checkDraftFaithfulness`, `matchesLanguageScript`). Boundary: the web imports the narrower
 * subpaths and never bundles this; prompt-boundary.ts is re-exported by the root barrel itself.
 */
export * from './ask-check.js';
export * from './ask-guard.js';
export * from './brief-guard.js';
export * from './draft-check.js';
export * from './draft-facts.js';
export { DROP_REASONS, type DropReason } from './evidence.js';
export * from './faithfulness.js';
export * from './idea-constraints.js';
export * from './idea-guard.js';
export * from './model-schema.js';
export * from './prompt-rules.js';
export * from './prompts-ask.js';
export * from './prompts-brief.js';
export * from './prompts-drafts.js';
export * from './prompts-narration.js';
export * from './prompts-quotes.js';
export * from './quote-normalise.js';
export * from './script-check.js';
