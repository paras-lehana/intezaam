/**
 * Tests for the idea constraints derived from a plan and its context.
 *
 * Responsibility: family, kind and age band come from the plan; the season from its month
 * (rain risk wins); alcohol is never allowed for a Jain menu or a religious occasion; money
 * is tight on a stretch or lean verdict; access needs and style chips pass through.
 * Boundary: plans come from the real engine; expectations are derived from the plan.
 */
import { describe, expect, it } from 'vitest';
import { EVENT_KIND_PROFILES } from '../domain/event-kinds.js';
import { IDEA_SEASONS, ideaConstraintsFor } from '../genai/idea-constraints.js';
import { planned, plannedContext, undatedContext } from './fixtures/genai-plans.js';

describe('ideaConstraintsFor', () => {
  it('copies family, kind, setting and diet from the plan and the context', () => {
    const { plan, context } = planned('bengaluru-birthday');
    const constraints = ideaConstraintsFor(plan, context);
    expect(constraints.family).toBe(plan.contextEcho.family);
    expect(constraints.kind).toBe(plan.contextEcho.kind);
    expect(constraints.ageBand).toBe(EVENT_KIND_PROFILES[plan.contextEcho.kind].ageBand);
    expect(constraints.setting).toBe(plan.contextEcho.setting);
    expect(constraints.menu).toBe(context.diet.menu);
    expect(constraints.styleTags).toEqual(context.styleTags);
  });

  it('says monsoon when the plan sees rain risk, else the season of the month', () => {
    for (const id of ['bengaluru-birthday', 'jaipur-wedding'] as const) {
      const { plan, context } = planned(id);
      const season = ideaConstraintsFor(plan, context).season;
      if (plan.contextEcho.rainRisk) expect(season).toBe('monsoon');
      else if (season !== undefined) expect(IDEA_SEASONS).toContain(season);
    }
    const undated = plannedContext(undatedContext('chennai-60th'));
    const open = ideaConstraintsFor(undated.plan, undated.context);
    if (!undated.plan.contextEcho.rainRisk && undated.plan.contextEcho.season.month === null) {
      expect(open.season).toBeUndefined();
    }
  });

  it('maps hot months to summer and leaves other months and an open date without a season', () => {
    const { plan, context } = planned('jaipur-wedding');
    const echoIn = (month: number | null): typeof plan => ({
      ...plan,
      contextEcho: {
        ...plan.contextEcho,
        rainRisk: false,
        season: { ...plan.contextEcho.season, month },
      },
    });
    expect(ideaConstraintsFor(echoIn(4), context).season).toBe('summer');
    expect(ideaConstraintsFor(echoIn(12), context).season).toBe('winter');
    expect(ideaConstraintsFor(echoIn(8), context).season).toBeUndefined();
    expect(ideaConstraintsFor(echoIn(null), context).season).toBeUndefined();
  });

  it('never allows alcohol for a Jain menu or a religious occasion', () => {
    const party = planned('jaipur-wedding', { alcohol: true });
    expect(ideaConstraintsFor(party.plan, party.context).alcoholAllowed).toBe(true);
    const jain = planned('jaipur-wedding', {
      alcohol: true,
      diet: { ...party.context.diet, menu: 'jain' },
    });
    expect(ideaConstraintsFor(jain.plan, jain.context).alcoholAllowed).toBe(false);
    const ganesh = planned('society-ganesh', { alcohol: true });
    expect(ideaConstraintsFor(ganesh.plan, ganesh.context).alcoholAllowed).toBe(false);
  });

  it('marks money as tight only for stretch or lean verdicts', () => {
    for (const id of ['jaipur-wedding', 'chennai-60th'] as const) {
      const { plan, context } = planned(id);
      const status = plan.verdict.money.status;
      expect(ideaConstraintsFor(plan, context).tight).toBe(
        status === 'stretch' || status === 'lean',
      );
    }
  });

  it('lists only the access needs the context ticked', () => {
    const { plan, context } = planned('chennai-60th');
    const needs = ideaConstraintsFor(plan, context).needs;
    for (const need of needs) expect(context.accessibility[need]).toBe(true);
  });
});
