/**
 * Offline barrel (server-only, re-exported from the package root): the twin of every GenAI
 * job, returning the same model-output shapes with no network (synthesis §5).
 *
 * Responsibility: export the twins (`readBriefOffline`, `narrateOffline`,
 * `compareQuotesOffline`, `draftOffline`, `askOffline`, plus `askByRules` for rule-first
 * answers) and the few helpers the server needs; vocabulary tables and template internals
 * stay private. Boundary: pure code; the web never bundles this module.
 */
export { askByRules, askOffline, REFUSAL_ANSWERS } from './ask.js';
export { parseAskCommand } from './ask-commands.js';
export { answerByIntent, ASK_INTENTS, type AskIntent, type IntentAnswer } from './ask-intents.js';
export { readBriefFields, type BriefFieldReadings } from './brief-fields.js';
export { describeBrief, formatShortDate } from './describe-brief.js';
export { draftOffline, draftRegister, factsUsedIn, type DraftOfflineInput } from './drafts.js';
export { IDEAS_LIBRARY, OFFLINE_IDEA_COUNT, selectIdeas } from './ideas/select-ideas.js';
export type { LibraryIdea } from './ideas/idea-types.js';
export { actionTemplate, citedTrace, narrateOffline, reasonTemplate } from './narrate.js';
export { compareQuotesOffline, readQuoteOffline, type QuoteText } from './quotes.js';
export { CORE_BRIEF_FIELDS, readBriefOffline } from './read-brief.js';
export { nextTasks } from './task-order.js';
