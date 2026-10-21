/**
 * Tests for the plan-narrator prompt (GenAI job 2).
 *
 * Responsibility: the numbered facts, citable trace items and tasks are fenced as data; the
 * constraints (menu, alcohol, tight money, access, style) are spelled out; the rules forbid
 * rupee amounts and dates in ideas and say cost only in band words; the output language is
 * the user's. Boundary: plans come from the real engine.
 */
import { describe, expect, it } from 'vitest';
import { COST_BANDS } from '../domain/ideas.js';
import { ideaConstraintsFor } from '../genai/idea-constraints.js';
import {
  buildNarrationPrompt,
  UNCONSTRAINED,
  constraintLines,
  narrationPlanBlock,
} from '../genai/prompts-narration.js';
import { citedTrace } from '../offline/narrate.js';
import { nextTasks } from '../offline/task-order.js';
import { NONCE, planned, plannedContext, undatedContext } from './fixtures/genai-plans.js';

describe('buildNarrationPrompt', () => {
  const { plan, context, facts } = planned('jaipur-wedding');
  const constraints = ideaConstraintsFor(plan, context);
  const { systemInstruction, prompt } = buildNarrationPrompt({
    plan,
    facts,
    constraints,
    language: 'hi',
    nonce: NONCE,
  });

  it('fences the facts, trace items and tasks as plan data', () => {
    expect(prompt.startsWith(`<<<PLAN_${NONCE}>>>`)).toBe(true);
    const [firstFact] = facts;
    expect(prompt).toContain(`[${firstFact?.id}] (${firstFact?.section}) ${firstFact?.text}`);
    const [firstTrace] = citedTrace(plan);
    expect(prompt).toContain(`${firstTrace?.id}: ${firstTrace?.title}`);
    const [firstTask] = nextTasks(plan);
    expect(prompt).toContain(`${firstTask?.id}: ${firstTask?.title}`);
  });

  it('spells out the constraints after the fence', () => {
    const fenceEnd = prompt.indexOf(`<<<END_PLAN_${NONCE}>>>`);
    expect(prompt.indexOf('Idea constraints:')).toBeGreaterThan(fenceEnd);
    expect(prompt).toContain(constraintLines(constraints));
    expect(constraintLines(constraints)).toContain(`Menu: ${context.diet.menu}`);
  });

  it('forbids prices and dates in ideas and names the cost words', () => {
    expect(systemInstruction).toContain(
      'Never write rupee amounts, prices, percentages or dates in an idea.',
    );
    expect(systemInstruction).toContain(
      `Cost words (use only these values): ${COST_BANDS.join(', ')}.`,
    );
    expect(systemInstruction).toContain(
      'Every number you write must appear in the numbered plan facts.',
    );
    expect(systemInstruction).toContain('Write every sentence in Hindi.');
  });

  it('shows due dates for dated tasks only', () => {
    const dated = nextTasks(plan).find((task) => task.dueIso !== undefined);
    expect(narrationPlanBlock(plan, facts)).toContain(`${dated?.id}: ${dated?.title} (due `);
    const undated = plannedContext(undatedContext('bengaluru-birthday'));
    const open = nextTasks(undated.plan).find((task) => task.dueIso === undefined);
    if (open !== undefined)
      expect(narrationPlanBlock(undated.plan, undated.facts)).toContain(
        `${open.id}: ${open.title}\n`,
      );
  });

  it('describes a Jain, alcohol-free, open-ended constraint set', () => {
    const lines = constraintLines({
      ...constraints,
      menu: 'jain',
      alcoholAllowed: false,
      needs: [],
      styleTags: [],
    });
    expect(lines).toContain('Menu: jain');
    expect(lines).toContain('Alcohol allowed: false');
    expect(lines).toContain('Access needs: none; style: none');
    const { ageBand: _age, season: _season, tradition: _tradition, ...open } = constraints;
    expect(constraintLines(open)).toContain(`Age band: ${UNCONSTRAINED}; season: ${UNCONSTRAINED}`);
  });
});
