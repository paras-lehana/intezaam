/**
 * Tests for engine/facts.ts — summarisePlanFacts, the numbered facts prompts cite.
 *
 * Responsibility: prove facts are numbered F1… in order, schema-valid and clipped, that each
 * plan section contributes its facts (verdict, every budget line, levers, cash flow, tasks,
 * functions, vendors, people, permissions, crowd, risks, access, community), and that every
 * rupee figure in a fact is copied from the plan. Boundary: expectations read the plan.
 */
import { describe, expect, it } from 'vitest';
import { MAX_TASK_FACTS, summarisePlanFacts } from '../engine/facts.js';
import { formatInr } from '../format.js';
import { planFactSchema } from '../schemas/diff.js';
import type { Plan } from '../schemas/plan.js';
import {
  community,
  homePuja,
  planOf,
  sample,
  undated,
  wedding,
} from './fixtures/engine-contexts.js';

const texts = (plan: Plan, section: string): string[] =>
  summarisePlanFacts(plan)
    .filter((fact) => fact.section === section)
    .map((fact) => fact.text);

describe('summarisePlanFacts', () => {
  const plan = planOf(wedding());
  const facts = summarisePlanFacts(plan);

  it('numbers schema-valid facts F1, F2, … in order', () => {
    facts.forEach((fact, index) => {
      expect(fact.id).toBe(`F${index + 1}`);
      expect(planFactSchema.safeParse(fact).success).toBe(true);
    });
    expect(facts[0]?.text).toBe(`Verdict: ${plan.verdict.headline}.`);
  });

  it('states every budget line with its rupees from the plan', () => {
    const budget = texts(plan, 'budget');
    for (const line of plan.budget.lines) {
      expect(
        budget.some((text) => text.startsWith(`${line.label}: ${formatInr(line.amountInr)}`)),
      ).toBe(true);
    }
    expect(budget.some((text) => text.startsWith('Food bottom-up'))).toBe(true);
  });

  it('covers levers, cash flow, tasks, functions, vendors and people', () => {
    expect(texts(plan, 'levers')).toHaveLength(plan.levers.length);
    expect(texts(plan, 'payments')).toHaveLength(plan.payments.cashflow.length);
    expect(texts(plan, 'timeline')[0]).toBe(`${plan.timeline.daysToEvent} days to the event.`);
    expect(texts(plan, 'functions')).toHaveLength(plan.functions.length);
    expect(texts(plan, 'vendors')).toHaveLength(plan.vendors.length);
    expect(texts(plan, 'headcount')[0]).toContain(`${plan.headcount.invited} invited`);
    expect(texts(plan, 'space')[0]).toContain('not checked');
    expect(texts(plan, 'accessibility')[0]).toContain('Access needs');
  });

  it('caps the task facts and lists urgent work first', () => {
    const tasks = texts(plan, 'timeline').filter((text) =>
      /: (due \d{4}-\d{2}-\d{2}|undated) \([a-z-]+\)\.$/.test(text),
    );
    const open = plan.timeline.tasks.filter((task) => task.status !== 'after-event');
    expect(open.length).toBeGreaterThan(MAX_TASK_FACTS);
    expect(tasks).toHaveLength(MAX_TASK_FACTS);
    expect(tasks[0]).toMatch(/\((urgent|fallback|do-now)\)/);
  });

  it('words an open date, a checked venue and no access needs', () => {
    const open = planOf(
      undated(
        homePuja({
          areaSqft: 2_000,
          accessibility: { elderly: false, wheelchair: false, kids: false },
        }),
      ),
    );
    expect(texts(open, 'timeline')[0]).toBe('Date not fixed yet.');
    expect(texts(open, 'space')[0]).toContain('The venue holds about');
    expect(texts(open, 'accessibility')[0]).toBe('No special access needs given.');
  });

  it('adds funding and the household contribution for community events', () => {
    const ganesh = planOf(community());
    expect(texts(ganesh, 'verdict').some((text) => text.startsWith('Funding:'))).toBe(true);
    const share = ganesh.community?.contribution.perHouseholdInr ?? 0;
    expect(texts(ganesh, 'community')[0]).toContain(`${formatInr(share)} per household`);
    const open = planOf(community({ community: { premises: 'public', days: 1 } }));
    expect(texts(open, 'community')[0]).toContain('households not given');
  });

  it('says when the plan breaks a hard rule', () => {
    const jaipur = planOf(sample('jaipur-wedding'));
    const blocked = jaipur.permissions.some((permission) => permission.blocker);
    const permissions = texts(jaipur, 'permissions');
    expect(permissions.some((text) => text.includes('the plan breaks this rule'))).toBe(blocked);
    expect(permissions.some((text) => /needed|check if it applies/.test(text))).toBe(true);
  });
});
