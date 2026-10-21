/**
 * Tests for the narration faithfulness guard (GenAI job 2, reused by jobs 4 and 5).
 *
 * Responsibility: number reading ("₹25 L", "25 lakh" and "₹25,00,000" agree), the allowed
 * set from facts, and the guard: a clean reply survives, an invented number or a wrong
 * script swaps in the template sentence, unknown trace and task ids are dropped, and themes
 * with numbers are removed. Boundary: plans come from the real engine; the scripted reply is
 * the offline narration with one change per test.
 */
import { describe, expect, it } from 'vitest';
import {
  checkNarrationFaithfulness,
  factNumbers,
  isFaithful,
  numbersAllowedBy,
  numbersIn,
} from '../genai/faithfulness.js';
import { narrationPlanBlock } from '../genai/prompts-narration.js';
import { actionTemplate, narrateOffline, reasonTemplate } from '../offline/narrate.js';
import { PALETTE_WORDS, type NarrationModelOutput } from '../schemas/model-outputs.js';
import { planned } from './fixtures/genai-plans.js';

describe('numbersIn / numbersAllowedBy / isFaithful', () => {
  it('reads every way of writing the same amount as one value', () => {
    expect(numbersIn('Budget ₹25 L for 300 guests')).toEqual([2_500_000, 300]);
    expect(numbersIn('₹25,00,000, 25 lakh or 25L')).toEqual([2_500_000]);
    expect(numbersIn('dhai lakh, do sau log')).toEqual([250_000, 200]);
    expect(numbersIn('२ लाख')).toEqual([200_000]);
    expect(numbersIn('300-400 guests and 17.27%')).toEqual([300, 400, 17.27]);
  });

  it('ignores bare number words without a multiplier', () => {
    expect(numbersIn('two days and three vendors')).toEqual([]);
  });

  it('allows every number the facts state', () => {
    const facts = [
      { id: 'F1', section: 'budget' as const, text: 'Total budget ₹25,00,000, ₹8,333 per guest.' },
    ];
    expect([...factNumbers(facts)]).toEqual(expect.arrayContaining([2_500_000, 8_333]));
  });

  it('lets a trusted text allow its digits as written', () => {
    const allowed = numbersAllowedBy('Total ₹25 L');
    expect(allowed.has(25)).toBe(true);
    expect(allowed.has(2_500_000)).toBe(true);
    expect(isFaithful('About ₹25 lakh', allowed)).toBe(true);
    expect(isFaithful('About ₹30 lakh', allowed)).toBe(false);
  });
});

describe('checkNarrationFaithfulness', () => {
  const { plan, context, facts } = planned('jaipur-wedding');
  const fallback = narrateOffline(plan, context);
  const allowed = numbersAllowedBy(narrationPlanBlock(plan, facts));
  const invented = Math.max(...allowed) + 1;

  function check(
    reply: NarrationModelOutput,
    language: 'en' | 'hi' = 'en',
  ): ReturnType<typeof checkNarrationFaithfulness> {
    return checkNarrationFaithfulness(reply, plan, facts, fallback, language);
  }

  it('keeps the offline narration intact: it is faithful by construction', () => {
    expect(check(fallback)).toEqual({ narration: fallback, replaced: [] });
  });

  it('swaps an invented number in the headline or summary for the template', () => {
    const result = check({
      ...fallback,
      headline: `Spend ₹${invented} now`,
      summary: `It costs ${invented} rupees.`,
    });
    expect(result.narration.headline).toBe(fallback.headline);
    expect(result.narration.summary).toBe(fallback.summary);
    expect(result.replaced).toEqual(['headline', 'summary']);
  });

  it('swaps an unfaithful reason or action for its template sentence', () => {
    const [reason] = fallback.reasons;
    const [action] = fallback.actions;
    expect(reason).toBeDefined();
    expect(action).toBeDefined();
    const reply: NarrationModelOutput = {
      ...fallback,
      reasons:
        reason === undefined ? [] : [{ traceId: reason.traceId, text: `Pay ${invented} today.` }],
      actions:
        action === undefined ? [] : [{ taskId: action.taskId, text: `Book ${invented} chairs.` }],
    };
    const result = check(reply);
    const item = plan.trace.find((entry) => entry.id === reason?.traceId);
    const task = plan.timeline.tasks.find((entry) => entry.id === action?.taskId);
    expect(result.narration.reasons[0]?.text).toBe(item === undefined ? '' : reasonTemplate(item));
    expect(result.narration.actions[0]?.text).toBe(task === undefined ? '' : actionTemplate(task));
    expect(result.replaced).toEqual([`reason:${reason?.traceId}`, `action:${action?.taskId}`]);
  });

  it('drops reasons and actions whose ids are not in the plan', () => {
    const result = check({
      ...fallback,
      reasons: [{ traceId: 'invented-trace', text: 'Because.' }],
      actions: [{ taskId: 'invented-task', text: 'Do it.' }],
    });
    expect(result.narration.reasons).toEqual([]);
    expect(result.narration.actions).toEqual([]);
    expect(result.replaced).toEqual(['reason:invented-trace', 'action:invented-task']);
  });

  it('replaces English text when Hindi was asked for, and removes themes with numbers', () => {
    const result = check(
      {
        ...fallback,
        summary: 'यह योजना संतुलित है।',
        themes: [
          { name: 'Gulabi Jaipur', paletteWords: ['pink', 'gold', 'ivory'] },
          { name: '1990s Bollywood', paletteWords: ['red', 'black', 'gold'] },
        ],
      },
      'hi',
    );
    expect(result.narration.summary).toBe('यह योजना संतुलित है।');
    expect(result.replaced).toContain('headline');
    expect(result.narration.themes?.map((theme) => theme.name)).toEqual(['Gulabi Jaipur']);
  });

  it('keeps the first three palette words when a model lists more', () => {
    const words = ['ivory', 'gold', 'rani pink', 'emerald', 'marigold'];
    const result = check(
      { ...fallback, themes: [{ name: 'Rajputana', paletteWords: words }] },
      'en',
    );
    expect(result.narration.themes?.[0]?.paletteWords).toEqual(words.slice(0, PALETTE_WORDS));
  });
});
