/**
 * Idea selection for the offline narrator: the curated library filtered and ranked by the
 * code-computed constraints (feature #29; GENAI_ARCHITECTURE.md, job 2 fallback).
 *
 * Responsibility: keep the ideas that suit the event family and kind, its tradition and
 * occasion (regional ideas only for their own), the diet and alcohol rule (the same
 * forbidden food flags the idea guard uses) and the user's cut line, drop splurges when
 * money is tight, prefer the age band, season and setting, rank the family's own tradition
 * first and then by how many of the user's signals an idea matches (style chips, season,
 * setting, eco) and pick across categories so the board is varied.
 * Boundary: pure; returns library ideas — the narrator turns them into model-shaped ideas.
 */
import { IDEA_CATEGORIES, type IdeaCategory } from '../../domain/ideas.js';
import { MIN_IDEAS } from '../../schemas/limits.js';
import type { IdeaConstraints } from '../../genai/idea-constraints.js';
import { forbiddenFoodFlags } from '../../genai/idea-guard.js';
import { BIRTHDAY_IDEAS } from './library-birthday.js';
import { COMMUNITY_IDEAS } from './library-community.js';
import { FAMILY_IDEAS } from './library-family.js';
import { REGIONAL_IDEAS } from './library-regional.js';
import { SHARED_IDEAS } from './library-shared.js';
import { WEDDING_IDEAS } from './library-wedding.js';
import { matchesTradition, suitsEvent, type IdeaScope } from './idea-scope.js';
import type { LibraryIdea } from './idea-types.js';

/** The whole curated library (about 90 ideas). */
export const IDEAS_LIBRARY: readonly LibraryIdea[] = [
  ...WEDDING_IDEAS,
  ...BIRTHDAY_IDEAS,
  ...COMMUNITY_IDEAS,
  ...FAMILY_IDEAS,
  ...REGIONAL_IDEAS,
  ...SHARED_IDEAS,
];

/** The board shows eight ideas: within the six-to-twelve the narration contract allows. */
export const OFFLINE_IDEA_COUNT = 8;
/** The family's own tradition or occasion is the strongest signal: it outranks a style chip. */
const TRADITION_MATCH_POINTS = 3;
/** A style chip is the strongest personal signal, so it weighs twice a season or setting match. */
const STYLE_MATCH_POINTS = 2;
const SIGNAL_MATCH_POINTS = 1;
/** Weddings have no age band; their ideas are written for adults. */
const DEFAULT_AGE_BAND = 'adult';

/**
 * Hard rules no idea may break: the family, the kind, tradition, occasion and cut line, the
 * diet and alcohol rule, and tight money.
 */
function allowed(
  idea: LibraryIdea,
  constraints: IdeaConstraints,
  scope: IdeaScope,
  forbidden: ReadonlySet<string>,
): boolean {
  return (
    idea.fit.families.includes(constraints.family) &&
    suitsEvent(idea, constraints, scope) &&
    !(idea.fit.contains ?? []).some((flag) => forbidden.has(flag)) &&
    !(constraints.tight && idea.costBand === 'splurge')
  );
}

/** Soft fit: the age band, season and setting the idea was written for. */
function fits(idea: LibraryIdea, constraints: IdeaConstraints): boolean {
  const fit = idea.fit;
  const age = constraints.ageBand ?? DEFAULT_AGE_BAND;
  return (
    (fit.ages === undefined || fit.ages.includes(age)) &&
    (fit.seasons === undefined ||
      (constraints.season !== undefined && fit.seasons.includes(constraints.season))) &&
    (fit.settings === undefined || fit.settings.includes(constraints.setting))
  );
}

function score(idea: LibraryIdea, constraints: IdeaConstraints, scope: IdeaScope): number {
  const styles = (idea.fit.styles ?? []).filter((tag) =>
    constraints.styleTags.includes(tag),
  ).length;
  const signals = [
    idea.fit.seasons !== undefined,
    idea.fit.settings !== undefined,
    idea.eco,
    idea.fit.ages !== undefined,
  ].filter(Boolean).length;
  const own = matchesTradition(idea, constraints, scope) ? TRADITION_MATCH_POINTS : 0;
  return own + styles * STYLE_MATCH_POINTS + signals * SIGNAL_MATCH_POINTS;
}

/**
 * The best-fitting ideas for the constraints and the event's scope, varied across categories.
 * @example
 * selectIdeas(constraints, 8, { occasion: 'ganesh-utsav' }).length; // up to 8
 */
export function selectIdeas(
  constraints: IdeaConstraints,
  count = OFFLINE_IDEA_COUNT,
  scope: IdeaScope = {},
): LibraryIdea[] {
  const forbidden: ReadonlySet<string> = new Set(forbiddenFoodFlags(constraints));
  // Efficiency: one filter and one stable sort over about 90 rows.
  const permitted = IDEAS_LIBRARY.filter((idea) => allowed(idea, constraints, scope, forbidden));
  const ranked = permitted
    .filter((idea) => fits(idea, constraints))
    .sort((a, b) => score(b, constraints, scope) - score(a, constraints, scope));
  const queues = new Map<IdeaCategory, LibraryIdea[]>(
    IDEA_CATEGORIES.map((category) => [
      category,
      ranked.filter((idea) => idea.category === category),
    ]),
  );
  const picked: LibraryIdea[] = [];
  // Round-robin across categories so the board mixes decor, menu, music, activities and gifts.
  while (picked.length < count && picked.length < ranked.length) {
    for (const category of IDEA_CATEGORIES) {
      const next = queues.get(category)?.shift();
      if (next !== undefined && picked.length < count) picked.push(next);
    }
  }
  // The narration contract needs at least six ideas: top up with permitted ideas whose
  // age, season or setting fit is looser, never with ones that break a hard rule (and never
  // beyond the count asked for).
  const topUp = permitted.filter((idea) => !picked.includes(idea));
  return [...picked, ...topUp.slice(0, Math.max(0, Math.min(count, MIN_IDEAS) - picked.length))];
}
