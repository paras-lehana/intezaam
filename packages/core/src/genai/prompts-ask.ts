/**
 * Prompt for GenAI job 5, Ask and change (GENAI_ARCHITECTURE.md): grounded questions about the plan
 * and natural-language changes turned into a typed patch the user approves.
 *
 * Responsibility: give the model the numbered plan facts (recomputed by the server from
 * the posted context), up to four earlier turns and the question — all fenced — with the
 * rules: answer only from the facts and cite their sections, say plainly when the plan
 * does not cover it, propose changes only as the closed patch operations, refuse booking,
 * payment and legal advice. Boundary: builds strings; applyAskPatch validates any patch.
 */
import { PLAN_SECTIONS } from '../domain/ideas.js';
import type { LanguageCode } from '../domain/languages.js';
import type { PlanFact } from '../schemas/diff.js';
import { MAX_BUDGET_INR, MAX_GUESTS, MAX_PATCH_OPS, MIN_GUESTS } from '../schemas/limits.js';
import { askModelOutputSchema, REFUSAL_REASONS } from '../schemas/model-outputs.js';
import { PATCH_OPS } from '../schemas/patch.js';
import type { ChatTurn } from '../schemas/requests.js';
import { wrapUntrusted } from './prompt-boundary.js';
import { closedList, factsBlock, systemInstruction, type PromptPair } from './prompt-rules.js';

export interface AskPromptInput {
  readonly question: string;
  readonly history: readonly ChatTurn[];
  readonly facts: readonly PlanFact[];
  readonly todayIso: string;
  readonly language: LanguageCode;
  readonly nonce: string;
}

const ASK_RULES: readonly string[] = [
  "Task: answer the family's question about their plan in under 120 words.",
  'Answer only from the numbered plan facts and list the sections of the facts you used in "sources". Every number in the answer must appear in the facts.',
  'If the facts do not answer the question, say so plainly and suggest the What-if panel or the relevant tab; do not guess.',
  'If the user asks to change the plan ("add 50 guests", "budget 20 lakh", "move to 12 December"), propose a patch with the closed operations below and explain it; the app applies it only after the user presses Apply.',
  `Patch limits: guests ${MIN_GUESTS}–${MAX_GUESTS}; budget in whole rupees up to ${MAX_BUDGET_INR}; dates in YYYY-MM-DD form after today; at most ${MAX_PATCH_OPS} operations.`,
  'If asked to book, pay, transfer money or contact a vendor, set refusal.reason to "booking-or-payment". If asked whether something is legal, about police cases or contracts, set "legal-advice". If the question is not about this celebration, set "off-scope". A refusal still answers kindly and says what the user can do.',
  closedList('Sources', PLAN_SECTIONS),
  closedList('Patch operations', PATCH_OPS),
  closedList('Refusal reasons', REFUSAL_REASONS),
];

/**
 * Builds the Ask prompt (job 5).
 * @example
 * buildAskPrompt({ question: 'Add 50 guests', history: [], facts, todayIso: '2026-10-20', language: 'en', nonce: 'a1b2c3d4' })
 *   .prompt.includes('<<<QUESTION_a1b2c3d4>>>'); // true
 */
export function buildAskPrompt(input: AskPromptInput): PromptPair {
  const history = input.history.map((turn, index) =>
    wrapUntrusted(`TURN${index + 1}`, `Q: ${turn.question}\nA: ${turn.answer}`, input.nonce),
  );
  return {
    systemInstruction: systemInstruction(ASK_RULES, askModelOutputSchema, input.language),
    prompt: [
      `Today is ${input.todayIso}.`,
      'Plan facts:',
      wrapUntrusted('PLAN_FACTS', factsBlock(input.facts), input.nonce),
      ...(history.length === 0 ? [] : ['Earlier conversation:', ...history]),
      'Question:',
      wrapUntrusted('QUESTION', input.question, input.nonce),
    ].join('\n'),
  };
}
