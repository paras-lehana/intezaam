/**
 * Idea vocabularies (feature #29, GenAI job 2) — the closed keys ideas are written in.
 *
 * Responsibility: idea categories, the cost bands code attaches (never rupee amounts in
 * model text), the context signals an idea may say it fits, effort levels and the plan
 * sections answers cite. Boundary: vocabulary only; the curated library and the model
 * prompt live with the GenAI code.
 */

export const IDEA_CATEGORIES = ['theme', 'decor', 'menu', 'activity', 'music', 'favours'] as const;

export type IdeaCategory = (typeof IDEA_CATEGORIES)[number];

/** Cost bands relative to the category's budget line; code assigns them, the model never prices. */
export const COST_BANDS = ['saves', 'within', 'splurge'] as const;

export type CostBand = (typeof COST_BANDS)[number];

export const COST_BAND_LABELS: Readonly<Record<CostBand, string>> = {
  saves: 'Saves money',
  within: 'Within your budget line',
  splurge: 'A splurge',
};

/** The context signal an idea's "why this fits you" line points at. */
export const SIGNAL_KEYS = [
  'budget',
  'guests',
  'season',
  'setting',
  'diet',
  'age-band',
  'style',
  'tradition',
  'accessibility',
  'city',
  'eco',
] as const;

export type SignalKey = (typeof SIGNAL_KEYS)[number];

export const EFFORT_LEVELS = ['low', 'med', 'high'] as const;

export type EffortLevel = (typeof EFFORT_LEVELS)[number];

/** Parts of a plan an answer or a fact can point to (GenAI job 5 `sources`). */
export const PLAN_SECTIONS = [
  'verdict',
  'budget',
  'levers',
  'payments',
  'timeline',
  'functions',
  'vendors',
  'headcount',
  'food',
  'space',
  'permissions',
  'crowd',
  'risks',
  'accessibility',
  'community',
  'ideas',
] as const;

export type PlanSection = (typeof PLAN_SECTIONS)[number];
