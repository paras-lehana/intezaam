/**
 * Tests for offline idea selection.
 *
 * Responsibility: every persona gets six to eight ideas that keep the hard rules (family,
 * diet and alcohol flags, no splurge when money is tight), mixed across categories; a
 * matching style chip ranks an idea first; the count is honoured; a context that few ideas
 * fit is topped up to the minimum without breaking a hard rule. Boundary: constraints come
 * from real plans, then one field is changed per test.
 */
import { describe, expect, it } from 'vitest';
import { ideaConstraintsFor, type IdeaConstraints } from '../genai/idea-constraints.js';
import { forbiddenFoodFlags } from '../genai/idea-guard.js';
import { IDEAS_LIBRARY, OFFLINE_IDEA_COUNT, selectIdeas } from '../offline/ideas/select-ideas.js';
import type { LibraryIdea } from '../offline/ideas/idea-types.js';
import { MIN_IDEAS } from '../schemas/limits.js';
import { planned, SAMPLE_IDS } from './fixtures/genai-plans.js';

function keepsHardRules(idea: LibraryIdea, constraints: IdeaConstraints): boolean {
  const forbidden = forbiddenFoodFlags(constraints);
  return (
    idea.fit.families.includes(constraints.family) &&
    !(idea.fit.contains ?? []).some((flag) => forbidden.includes(flag)) &&
    !(constraints.tight && idea.costBand === 'splurge')
  );
}

describe('selectIdeas', () => {
  it('gives every persona six to eight varied ideas that keep the hard rules', () => {
    for (const id of SAMPLE_IDS) {
      const { plan, context } = planned(id);
      const constraints = ideaConstraintsFor(plan, context);
      const ideas = selectIdeas(constraints);
      expect(ideas.length, id).toBeGreaterThanOrEqual(MIN_IDEAS);
      expect(ideas.length, id).toBeLessThanOrEqual(OFFLINE_IDEA_COUNT);
      for (const idea of ideas)
        expect(keepsHardRules(idea, constraints), `${id}: ${idea.title}`).toBe(true);
      expect(new Set(ideas.map((idea) => idea.category)).size, id).toBeGreaterThanOrEqual(3);
    }
  });

  it('never offers a Jain, alcohol-free event any meat, egg, onion, root vegetable or bar', () => {
    const { plan, context } = planned('jaipur-wedding');
    const jain: IdeaConstraints = {
      ...ideaConstraintsFor(plan, context),
      menu: 'jain',
      alcoholAllowed: false,
    };
    for (const idea of selectIdeas(jain, IDEAS_LIBRARY.length))
      expect(idea.fit.contains ?? []).toEqual([]);
  });

  it('ranks an idea matching the chosen style chip first in its category', () => {
    const { plan, context } = planned('jaipur-wedding');
    const base = ideaConstraintsFor(plan, context);
    const styled = IDEAS_LIBRARY.find(
      (idea) =>
        idea.fit.styles !== undefined &&
        idea.fit.families.includes(base.family) &&
        keepsHardRules(idea, base),
    );
    const [style] = styled?.fit.styles ?? [];
    expect(style).toBeDefined();
    if (styled !== undefined && style !== undefined) {
      const { season: _season, ...anySeason } = base;
      const ideas = selectIdeas({ ...anySeason, styleTags: [style] }, IDEAS_LIBRARY.length);
      const first = ideas.find((idea) => idea.category === styled.category);
      expect(first?.fit.styles ?? []).toContain(style);
    }
  });

  it('honours the count and tops up to the minimum when few ideas fit', () => {
    const { plan, context } = planned('bengaluru-birthday');
    const base = ideaConstraintsFor(plan, context);
    expect(selectIdeas(base, 2)).toHaveLength(2);
    const narrow = selectIdeas({ ...base, ageBand: 'teen', setting: 'home' }, MIN_IDEAS);
    expect(narrow.length).toBeGreaterThanOrEqual(
      Math.min(MIN_IDEAS, IDEAS_LIBRARY.filter((idea) => keepsHardRules(idea, base)).length),
    );
    for (const idea of narrow) expect(keepsHardRules(idea, base)).toBe(true);
  });
});
