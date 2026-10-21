/**
 * Tests for the rule-first Ask answers: common questions answered from the plan by code.
 *
 * Responsibility: each intent is recognised in English, Hinglish or Hindi and answered with
 * the plan's own numbers and sections; empty plan parts get their own sentence; unknown
 * questions return nothing; answers stay within the schema cap. Boundary: plans come from
 * the real engine; edge plans are copies with one part emptied.
 */
import { describe, expect, it } from 'vitest';
import { formatInr, formatLakh } from '../format.js';
import { answerByIntent, ASK_INTENTS } from '../offline/ask-intents.js';
import { MAX_ANSWER_CHARS } from '../schemas/limits.js';
import type { Plan } from '../schemas/plan.js';
import { planned, plannedContext, undatedContext } from './fixtures/genai-plans.js';

describe('answerByIntent', () => {
  const { plan } = planned('jaipur-wedding');

  it('recognises each intent in English, Hinglish or Hindi', () => {
    const questions: Readonly<Record<(typeof ASK_INTENTS)[number], string>> = {
      'next-steps': 'what next?',
      permissions: 'permission chahiye?',
      vendors: 'when to book the caterer',
      headcount: 'kitne log aayenge',
      risks: 'what could go wrong?',
      time: 'कितने दिन बचे हैं',
      food: 'khana kaisa rakhein',
      budget: 'बजट कितना है',
    };
    for (const intent of ASK_INTENTS)
      expect(answerByIntent(questions[intent], plan)?.intent, intent).toBe(intent);
    expect(answerByIntent('hello there', plan)).toBeUndefined();
  });

  it("answers the budget and headcount with the plan's own numbers", () => {
    const budget = answerByIntent('budget kitna hai', plan);
    expect(budget?.answer).toContain(formatLakh(plan.budget.totalInr));
    expect(budget?.answer).toContain(formatInr(plan.budget.perGuestInr));
    expect(budget?.sources).toEqual(['budget', 'verdict']);
    const headcount = answerByIntent('how many plates', plan)?.answer ?? '';
    for (const value of [
      plan.headcount.invited,
      plan.headcount.expected,
      plan.headcount.plateGuarantee,
    ]) {
      expect(headcount).toContain(String(value));
    }
  });

  it('lists required permissions, the top risks, days to go and the food line', () => {
    const required = plan.permissions.filter((permission) => permission.required);
    expect(answerByIntent('any permission needed?', plan)?.answer).toContain(
      required[0]?.title ?? 'no special permission',
    );
    expect(answerByIntent('risks?', plan)?.answer).toContain(
      plan.risks[0]?.title ?? 'No major risks',
    );
    expect(answerByIntent('kitne din bache', plan)?.answer).toContain(
      `${plan.timeline.daysToEvent} days to go`,
    );
    expect(answerByIntent('food menu?', plan)?.answer).toContain(
      formatInr(plan.costCheck.cateringLineInr),
    );
  });

  it('has its own sentence for empty plan parts', () => {
    const empty: Plan = {
      ...plan,
      permissions: [],
      risks: [],
      food: { ...plan.food, counters: [] },
      headcount: { ...plan.headcount, rooms: 0 },
    };
    expect(answerByIntent('permission?', empty)?.answer).toContain('needs no special permission');
    expect(answerByIntent('risks?', empty)?.answer).toBe(
      'No major risks were found for this plan.',
    );
    expect(answerByIntent('food?', empty)?.answer).toContain('one main counter');
    expect(answerByIntent('kitne log', empty)?.answer).not.toContain('rooms');
  });

  it('says the date is open and leaves due dates out for an undated plan', () => {
    const undated = plannedContext(undatedContext('bengaluru-birthday')).plan;
    expect(
      answerByIntent('time left?', undated)?.answer.startsWith('Your date is not fixed yet.'),
    ).toBe(true);
    expect(answerByIntent('what next', undated)?.answer.startsWith('Do these first:')).toBe(true);
    expect(answerByIntent('which vendors', undated)?.answer.startsWith('Book first:')).toBe(true);
  });

  it('keeps every answer within the schema cap', () => {
    for (const question of [
      'what next',
      'permission',
      'vendors',
      'kitne log',
      'risks',
      'time left',
      'food',
      'budget',
    ]) {
      expect((answerByIntent(question, plan)?.answer ?? '').length).toBeLessThanOrEqual(
        MAX_ANSWER_CHARS,
      );
    }
  });
});
