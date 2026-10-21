/**
 * Tests for the Ask reply check (GenAI job 5): the model's answer passes the same rules as
 * the offline assistant.
 *
 * Responsibility: a question code refuses is refused whatever the model said; a faithful
 * answer survives with deduplicated sources; an invented number swaps in the rule-based
 * answer; an invalid patch op is removed and reported. Boundary: plans from the real engine.
 */
import { describe, expect, it } from 'vitest';
import { checkAskReply } from '../genai/ask-check.js';
import { factNumbers } from '../genai/faithfulness.js';
import { askOffline, REFUSAL_ANSWERS } from '../offline/ask.js';
import { formatInr } from '../format.js';
import { MAX_GUESTS } from '../schemas/limits.js';
import { planned, TODAY } from './fixtures/genai-plans.js';

describe('checkAskReply', () => {
  const { plan, facts, context } = planned('jaipur-wedding');
  const input = (question: string): Parameters<typeof checkAskReply>[1] => ({
    question,
    plan,
    facts,
    context,
    todayIso: TODAY,
  });

  it('refuses a booking request even when the model answered it', () => {
    const result = checkAskReply(
      { answer: 'Booked! The caterer is confirmed.', sources: ['vendors'] },
      input('Book the caterer for me'),
    );
    expect(result.reply).toEqual({
      answer: REFUSAL_ANSWERS['booking-or-payment'],
      sources: [],
      refusal: { reason: 'booking-or-payment' },
    });
    expect(result.corrected).toEqual(['refusal']);
  });

  it('reports nothing when the model refused correctly', () => {
    const reply = {
      answer: 'I cannot pay.',
      sources: [],
      refusal: { reason: 'booking-or-payment' as const },
    };
    expect(checkAskReply(reply, input('Pay the advance to the decorator')).corrected).toEqual([]);
  });

  it('keeps a faithful answer and deduplicates its sources', () => {
    const answer = `Your total budget is ${formatInr(plan.budget.totalInr)}.`;
    const result = checkAskReply(
      { answer, sources: ['budget', 'budget', 'verdict'] },
      input('What is my budget?'),
    );
    expect(result.reply).toEqual({ answer, sources: ['budget', 'verdict'] });
    expect(result.corrected).toEqual([]);
  });

  it('swaps an invented number for the rule-based answer', () => {
    const invented = Math.max(...factNumbers(facts)) + 1;
    const question = 'What is my budget?';
    const result = checkAskReply(
      { answer: `It will cost ₹${invented}.`, sources: ['budget'] },
      input(question),
    );
    expect(result.reply.answer).toBe(askOffline(question, plan, context, TODAY).answer);
    expect(result.corrected).toEqual(['answer']);
  });

  it("removes an invalid patch op and keeps the model's refusal field when no rule fires", () => {
    const reply = {
      answer: 'I can add the guests; press Apply.',
      sources: ['headcount' as const],
      patch: {
        ops: [
          { op: 'setGuests' as const, value: context.guests + 20 },
          { op: 'setGuests' as const, value: MAX_GUESTS },
        ],
      },
      refusal: { reason: 'off-scope' as const },
    };
    const result = checkAskReply(reply, input('add a few guests'));
    expect(result.reply.patch?.ops).toHaveLength(2);
    expect(result.reply.refusal).toEqual({ reason: 'off-scope' });
    const invalid = checkAskReply(
      { ...reply, patch: { ops: [{ op: 'setGuests', value: context.guests }] } },
      input('same guests'),
    );
    expect(invalid.reply.patch).toBeUndefined();
    expect(invalid.corrected).toEqual(['patch']);
  });
});
