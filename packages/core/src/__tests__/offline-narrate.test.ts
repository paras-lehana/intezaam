/**
 * Tests for the offline twin of the plan narrator (GenAI job 2).
 *
 * Responsibility: for every sample persona the narration parses with the model-output
 * schema (six to twelve ideas), cites trace items and tasks that exist, uses the verdict's
 * own headline and reasons, passes the faithfulness and idea guards unchanged, and the
 * template sentences read "<rule title>: <effect>" and "<task> (by <date>)". Boundary:
 * plans come from the real engine.
 */
import { describe, expect, it } from 'vitest';
import { RULES } from '../domain/rules.js';
import { checkNarrationFaithfulness } from '../genai/faithfulness.js';
import { ideaConstraintsFor } from '../genai/idea-constraints.js';
import { enforceIdeaConstraints } from '../genai/idea-guard.js';
import { formatShortDate } from '../offline/describe-brief.js';
import { actionTemplate, citedTrace, narrateOffline, reasonTemplate } from '../offline/narrate.js';
import { narrationModelOutputSchema } from '../schemas/model-outputs.js';
import { planned, SAMPLE_IDS } from './fixtures/genai-plans.js';

describe('narrateOffline', () => {
  it('writes a valid, faithful narration for every persona', () => {
    for (const id of SAMPLE_IDS) {
      const { plan, context, facts } = planned(id);
      const narration = narrateOffline(plan, context);
      expect(narrationModelOutputSchema.safeParse(narration).success, id).toBe(true);
      expect(
        checkNarrationFaithfulness(narration, plan, facts, narration, 'en').replaced,
        id,
      ).toEqual([]);
      expect(
        enforceIdeaConstraints(narration.ideas, ideaConstraintsFor(plan, context)).rejected,
        id,
      ).toEqual([]);
    }
  });

  it('cites only trace items and tasks that exist in the plan', () => {
    const { plan, context } = planned('society-ganesh');
    const narration = narrateOffline(plan, context);
    const traceIds = new Set(plan.trace.map((item) => item.id));
    const taskIds = new Set(plan.timeline.tasks.map((task) => task.id));
    for (const reason of narration.reasons) expect(traceIds.has(reason.traceId)).toBe(true);
    for (const action of narration.actions) expect(taskIds.has(action.taskId)).toBe(true);
    expect(narration.headline).toBe(plan.verdict.headline.slice(0, 90));
    expect(narration.summary).toContain(plan.verdict.money.reason);
  });
});

describe('citedTrace', () => {
  it('starts with the verdict trace and lists each item once', () => {
    const { plan } = planned('jaipur-wedding');
    const cited = citedTrace(plan);
    expect(cited[0]?.id).toBe(plan.verdict.money.traceIds[0]);
    expect(new Set(cited.map((item) => item.id)).size).toBe(cited.length);
  });

  it('skips an id the trace does not hold, and a plan with no risks has no warning', () => {
    const { plan, context } = planned('society-ganesh');
    const money = {
      ...plan.verdict.money,
      traceIds: ['missing-trace', ...plan.verdict.money.traceIds],
    };
    const calm = { ...plan, risks: [], verdict: { ...plan.verdict, money } };
    expect(citedTrace(calm).map((item) => item.id)).not.toContain('missing-trace');
    expect(narrateOffline(calm, context).summary).not.toContain('Watch out');
  });
});

describe('reasonTemplate / actionTemplate', () => {
  const { plan } = planned('jaipur-wedding');

  it('says the rule title and its effect', () => {
    const [item] = plan.trace;
    expect(item).toBeDefined();
    if (item !== undefined)
      expect(reasonTemplate(item)).toBe(`${RULES[item.ruleId].title}: ${item.effect}`);
  });

  it('adds the due date when the task has one', () => {
    const dated = plan.timeline.tasks.find((task) => task.dueIso !== undefined);
    if (dated !== undefined)
      expect(actionTemplate(dated)).toBe(
        `${dated.title} (by ${formatShortDate(dated.dueIso ?? '')}).`,
      );
    const [task] = plan.timeline.tasks;
    if (task !== undefined) {
      const { dueIso: _due, ...open } = task;
      expect(actionTemplate(open)).toBe(`${task.title}.`);
    }
  });
});
