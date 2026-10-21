/**
 * Tests for the curated ideas library (data integrity).
 *
 * Responsibility: about eighty ideas with unique titles, text within the narration limits,
 * no prices, dates, links or contacts, food flags that match the text (an idea that mentions
 * egg must say it contains egg, so the diet filter can trust the tags), and enough ideas for
 * every family and category. Boundary: data checks only; selection is tested separately.
 */
import { describe, expect, it } from 'vitest';
import { EVENT_FAMILIES } from '../domain/events.js';
import { IDEA_CATEGORIES } from '../domain/ideas.js';
import { ideaViolation } from '../genai/idea-guard.js';
import { FOOD_FLAGS } from '../offline/ideas/idea-types.js';
import { IDEAS_LIBRARY } from '../offline/ideas/select-ideas.js';
import { modelIdeaSchema } from '../schemas/model-outputs.js';
import { MIN_IDEAS } from '../schemas/limits.js';

/** Synthesis §5 job 2: "about 80 entries". */
const LIBRARY_SIZE = 80;

function textOf(idea: (typeof IDEAS_LIBRARY)[number]): string {
  return [idea.title, idea.description, idea.why[1], idea.youtubeQuery].join(' ');
}

describe('IDEAS_LIBRARY', () => {
  it('holds about eighty ideas with unique titles', () => {
    expect(IDEAS_LIBRARY.length).toBeGreaterThanOrEqual(LIBRARY_SIZE);
    expect(new Set(IDEAS_LIBRARY.map((idea) => idea.title)).size).toBe(IDEAS_LIBRARY.length);
  });

  it('fits the model-output idea shape', () => {
    for (const idea of IDEAS_LIBRARY) {
      const shaped = {
        category: idea.category,
        title: idea.title,
        description: idea.description,
        whyItFits: { signal: idea.why[0], text: idea.why[1] },
        effort: idea.effort,
        eco: idea.eco,
        youtubeQuery: idea.youtubeQuery,
      };
      expect(modelIdeaSchema.safeParse(shaped).success, idea.title).toBe(true);
    }
  });

  it('carries no prices, dates, links or contacts', () => {
    for (const idea of IDEAS_LIBRARY)
      expect(ideaViolation(textOf(idea), []), idea.title).toBeUndefined();
  });

  it('declares every food its text mentions', () => {
    for (const idea of IDEAS_LIBRARY) {
      const undeclared = FOOD_FLAGS.filter((flag) => !(idea.fit.contains ?? []).includes(flag));
      expect(ideaViolation(textOf(idea), undeclared), idea.title).toBeUndefined();
    }
  });

  it('offers enough ideas for every family and every category', () => {
    for (const family of EVENT_FAMILIES) {
      expect(
        IDEAS_LIBRARY.filter((idea) => idea.fit.families.includes(family)).length,
        family,
      ).toBeGreaterThanOrEqual(MIN_IDEAS);
    }
    for (const category of IDEA_CATEGORIES) {
      expect(
        IDEAS_LIBRARY.some((idea) => idea.category === category),
        category,
      ).toBe(true);
    }
  });
});
