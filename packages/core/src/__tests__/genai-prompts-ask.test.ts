/**
 * Tests for the Ask prompt (GenAI job 5).
 *
 * Responsibility: today, the plan facts, earlier turns and the question are each fenced;
 * the rules ground answers in the facts, list the closed patch operations with their limits
 * and the refusal reasons. Boundary: plans come from the real engine.
 */
import { describe, expect, it } from 'vitest';
import { factsBlock } from '../genai/prompt-rules.js';
import { buildAskPrompt } from '../genai/prompts-ask.js';
import { MAX_GUESTS, MAX_PATCH_OPS } from '../schemas/limits.js';
import { REFUSAL_REASONS } from '../schemas/model-outputs.js';
import { PATCH_OPS } from '../schemas/patch.js';
import { NONCE, planned, TODAY } from './fixtures/genai-plans.js';

describe('buildAskPrompt', () => {
  const { facts } = planned('society-ganesh');

  it('fences the facts and the question, with no history block for a first question', () => {
    const { prompt } = buildAskPrompt({
      question: 'Kitna chanda per flat?',
      history: [],
      facts,
      todayIso: TODAY,
      language: 'en',
      nonce: NONCE,
    });
    expect(prompt).toContain(`Today is ${TODAY}.`);
    expect(prompt).toContain(
      `<<<PLAN_FACTS_${NONCE}>>>\n${factsBlock(facts)}\n<<<END_PLAN_FACTS_${NONCE}>>>`,
    );
    expect(prompt).toContain(
      `<<<QUESTION_${NONCE}>>>\nKitna chanda per flat?\n<<<END_QUESTION_${NONCE}>>>`,
    );
    expect(prompt).not.toContain('Earlier conversation:');
  });

  it('fences each earlier turn separately', () => {
    const history = [
      { question: 'How many volunteers?', answer: 'About 20.' },
      { question: 'And security?', answer: 'Two guards per gate.' },
    ];
    const { prompt } = buildAskPrompt({
      question: 'Add 50 guests',
      history,
      facts,
      todayIso: TODAY,
      language: 'en',
      nonce: NONCE,
    });
    expect(prompt).toContain('Earlier conversation:');
    expect(prompt).toContain(
      `<<<TURN1_${NONCE}>>>\nQ: How many volunteers?\nA: About 20.\n<<<END_TURN1_${NONCE}>>>`,
    );
    expect(prompt).toContain(`<<<TURN2_${NONCE}>>>`);
  });

  it('lists the patch operations with their limits and the refusal reasons', () => {
    const { systemInstruction } = buildAskPrompt({
      question: 'x',
      history: [],
      facts,
      todayIso: TODAY,
      language: 'ta',
      nonce: NONCE,
    });
    expect(systemInstruction).toContain(
      `Patch operations (use only these values): ${PATCH_OPS.join(', ')}.`,
    );
    expect(systemInstruction).toContain(
      `Refusal reasons (use only these values): ${REFUSAL_REASONS.join(', ')}.`,
    );
    expect(systemInstruction).toContain(`${MAX_GUESTS}`);
    expect(systemInstruction).toContain(`at most ${MAX_PATCH_OPS} operations`);
    expect(systemInstruction).toContain('Answer only from the numbered plan facts');
    expect(systemInstruction).toContain('Write every sentence in Tamil.');
  });
});
