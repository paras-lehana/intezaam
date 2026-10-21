/**
 * Tests for the idea guard (GenAI job 2): code-enforced limits on every idea.
 *
 * Responsibility: forbidden food flags per menu (Jain five, veg two, satvik adds onion and
 * garlic, alcohol unless allowed); violations by diet, negations that are allowed, money or
 * dates, links or contacts; and the filter, which attaches the cost band and the YouTube
 * link and drops splurges when money is tight. Boundary: constraints come from a real plan.
 */
import { describe, expect, it } from 'vitest';
import { ideaConstraintsFor, type IdeaConstraints } from '../genai/idea-constraints.js';
import {
  enforceIdeaConstraints,
  forbiddenFoodFlags,
  hasLinkOrContact,
  ideaViolation,
} from '../genai/idea-guard.js';
import { buildYoutubeSearchUrl } from '../integrations/google-links.js';
import type { NarrationModelOutput } from '../schemas/model-outputs.js';
import { planned } from './fixtures/genai-plans.js';

type ModelIdea = NarrationModelOutput['ideas'][number];

const { plan, context } = planned('jaipur-wedding');
const base: IdeaConstraints = { ...ideaConstraintsFor(plan, context), tight: false, satvik: false };

function idea(title: string, effort: ModelIdea['effort'] = 'low'): ModelIdea {
  return {
    category: 'menu',
    title,
    description: `${title} for the guests.`,
    whyItFits: { signal: 'diet', text: 'Fits the menu.' },
    effort,
    eco: false,
    youtubeQuery: title,
  };
}

describe('forbiddenFoodFlags', () => {
  it('forbids by menu, satvik and alcohol', () => {
    expect(forbiddenFoodFlags({ ...base, menu: 'jain', alcoholAllowed: false })).toEqual([
      'meat',
      'egg',
      'onion-garlic',
      'root-veg',
      'alcohol',
    ]);
    expect(forbiddenFoodFlags({ ...base, menu: 'veg', alcoholAllowed: true })).toEqual([
      'meat',
      'egg',
    ]);
    expect(
      forbiddenFoodFlags({ ...base, menu: 'veg', satvik: true, alcoholAllowed: true }),
    ).toEqual(['meat', 'egg', 'onion-garlic']);
    expect(
      forbiddenFoodFlags({ ...base, menu: 'mixed', satvik: true, alcoholAllowed: true }),
    ).toEqual([]);
    expect(forbiddenFoodFlags({ ...base, menu: 'non-veg', alcoholAllowed: false })).toEqual([
      'alcohol',
    ]);
  });
});

describe('ideaViolation / hasLinkOrContact', () => {
  const jain = forbiddenFoodFlags({ ...base, menu: 'jain', alcoholAllowed: false });

  it('names the broken diet rule in English, Hinglish or Hindi', () => {
    expect(ideaViolation('Chicken tikka counter', jain)).toBe('diet:meat');
    expect(ideaViolation('Anda bhurji station', jain)).toBe('diet:egg');
    expect(ideaViolation('Pyaz kachori', jain)).toBe('diet:onion-garlic');
    expect(ideaViolation('आलू टिक्की चाट', jain)).toBe('diet:root-veg');
    expect(ideaViolation('Signature cocktails', jain)).toBe('diet:alcohol');
  });

  it('allows negated mentions and alcohol-free wording', () => {
    expect(ideaViolation('A no-onion, no-garlic bhog', jain)).toBeUndefined();
    expect(ideaViolation('Alcohol-free mocktail bar', jain)).toBeUndefined();
    expect(ideaViolation('बिना प्याज की थाली', jain)).toBeUndefined();
  });

  it('refuses prices, dates, links and contacts', () => {
    expect(ideaViolation('Flowers for ₹20,000', [])).toBe('money-or-date');
    expect(ideaViolation('Decor on 25 Nov', [])).toBe('money-or-date');
    expect(ideaViolation('Save 10% on decor', [])).toBe('money-or-date');
    expect(ideaViolation('See www.decor.example', [])).toBe('link-or-contact');
    expect(hasLinkOrContact('Call +91 98765 43210')).toBe(true);
    expect(hasLinkOrContact('Ask [PHONE] for a quote')).toBe(true);
    expect(hasLinkOrContact('Marigold torans at the gate')).toBe(false);
  });
});

describe('enforceIdeaConstraints', () => {
  it('keeps allowed ideas with a cost band and a YouTube search link', () => {
    const result = enforceIdeaConstraints([idea('Marigold torans', 'med')], base);
    expect(result.rejected).toEqual([]);
    expect(result.ideas[0]?.costBand).toBe('within');
    expect(result.ideas[0]?.youtubeUrl).toBe(buildYoutubeSearchUrl('Marigold torans'));
  });

  it('uses a curated band when given, else the effort band', () => {
    const bands = new Map([['Marigold torans', 'saves' as const]]);
    expect(
      enforceIdeaConstraints([idea('Marigold torans', 'high')], base, bands).ideas[0]?.costBand,
    ).toBe('saves');
    expect(
      enforceIdeaConstraints([idea('Mirror selfie wall', 'high')], base).ideas[0]?.costBand,
    ).toBe('splurge');
  });

  it('drops diet breaks and splurges when money is tight, with reasons', () => {
    const tight: IdeaConstraints = { ...base, menu: 'veg', tight: true };
    const result = enforceIdeaConstraints(
      [idea('Mutton biryani'), idea('Drone show', 'high'), idea('Rangoli')],
      tight,
    );
    expect(result.ideas.map((kept) => kept.title)).toEqual(['Rangoli']);
    expect(result.rejected).toEqual([
      { title: 'Mutton biryani', reason: 'diet:meat' },
      { title: 'Drone show', reason: 'splurge-when-tight' },
    ]);
  });
});
