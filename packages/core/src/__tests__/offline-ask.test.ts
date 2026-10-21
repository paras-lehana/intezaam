/**
 * Tests for the offline twin of Ask (GenAI job 5).
 *
 * Responsibility: refusals come first, then a validated change request, then an intent
 * answer; `askByRules` answers only refusals and change requests (a configured model answers
 * everything else) and `askOffline` adds the intent answer, then points to the What-if
 * panel; every reply parses with the model-output schema. Boundary: plans come from the
 * real engine.
 */
import { describe, expect, it } from 'vitest';
import { askByRules, askOffline, REFUSAL_ANSWERS } from '../offline/ask.js';
import { askModelOutputSchema } from '../schemas/model-outputs.js';
import { planned, TODAY } from './fixtures/genai-plans.js';

describe('askByRules / askOffline', () => {
  const { plan, context } = planned('society-ganesh');

  it('refuses before anything else, even when the question also asks for a change', () => {
    const reply = askByRules('Please pay the decorator and add 50 guests', plan, context, TODAY);
    expect(reply).toEqual({
      answer: REFUSAL_ANSWERS['booking-or-payment'],
      sources: [],
      refusal: { reason: 'booking-or-payment' },
    });
  });

  it('turns a change request into a validated patch the user can apply', () => {
    const reply = askOffline('add 50 guests', plan, context, TODAY);
    expect(reply.patch).toEqual({ ops: [{ op: 'setGuests', value: context.guests + 50 }] });
    expect(reply.answer).toContain('Press Apply');
  });

  it('answers a common question by intent offline, and leaves it to a configured model', () => {
    expect(askByRules('kitne log aayenge?', plan, context, TODAY)).toBeUndefined();
    expect(askOffline('kitne log aayenge?', plan, context, TODAY).sources).toEqual(['headcount']);
  });

  it('leaves an open question to the model, and offline points to the What-if panel', () => {
    expect(
      askByRules('Can we make it more fun for teenagers?', plan, context, TODAY),
    ).toBeUndefined();
    const reply = askOffline('Can we make it more fun for teenagers?', plan, context, TODAY);
    expect(reply.answer).toContain('What-if panel');
    expect(reply.sources).toEqual([]);
  });

  it('returns replies that parse with the model-output schema', () => {
    for (const question of [
      'pay the advance',
      'add 50 guests',
      'budget?',
      'tell me a joke',
      'Is a police case likely?',
    ]) {
      expect(
        askModelOutputSchema.safeParse(askOffline(question, plan, context, TODAY)).success,
        question,
      ).toBe(true);
    }
  });
});
