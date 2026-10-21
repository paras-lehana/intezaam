/**
 * Idea scope for the offline board: what an idea must suit beyond the shared idea
 * constraints — the event kind and tradition, the community occasion and the budget line
 * the user chose to cut (feature #29; GENAI_ARCHITECTURE.md, job 2 fallback).
 *
 * Responsibility: read the occasion from the event title with the festival vocabulary
 * (so "Society Ganesh utsav" is a Ganesh utsav), name the budget line each idea is paid
 * from, and decide whether an idea suits the event (kind, tradition, occasion, cut line) or
 * matches its own tradition or occasion (which ranks it first). Boundary: pure; selection
 * and ranking live in select-ideas.ts.
 */
import type { RankableCategory } from '../../domain/budget-categories.js';
import type { CommunityOccasion } from '../../domain/community-occasions.js';
import type { IdeaCategory } from '../../domain/ideas.js';
import type { IdeaConstraints } from '../../genai/idea-constraints.js';
import type { EventContext } from '../../schemas/context.js';
import type { Plan } from '../../schemas/plan.js';
import { buildPhraseIndex, findPhrases, tokenise } from '../tokens.js';
import { FESTIVAL_ANCHORS, FESTIVAL_KEYS } from '../vocab/festivals.js';
import { phrases } from '../vocab/word-list.js';
import type { LibraryIdea } from './idea-types.js';

/** What the board knows about the event that the idea constraints do not carry. */
export interface IdeaScope {
  readonly occasion?: CommunityOccasion;
  /** The budget line the user asked to cut: ideas paid from it are left out. */
  readonly cut?: RankableCategory;
}

/**
 * The budget line each idea category is usually paid from (the vendor taxonomy's
 * categories, domain/vendors.ts: decorator → decor, caterer → catering, DJ or entertainer →
 * entertainment, return gifts → gifts). An idea paid elsewhere names its own `budgetLine`.
 */
export const IDEA_BUDGET_LINES: Readonly<Record<IdeaCategory, RankableCategory>> = {
  theme: 'decor',
  decor: 'decor',
  menu: 'catering',
  activity: 'entertainment',
  music: 'entertainment',
  favours: 'gifts',
};

/** Festival names that are community occasions ("ganpati", "onam", "garba"), by occasion. */
const OCCASION_NAMES = buildPhraseIndex<CommunityOccasion>(
  FESTIVAL_KEYS.flatMap((key) => {
    const { names, occasion } = FESTIVAL_ANCHORS[key];
    return occasion === undefined ? [] : phrases(names).map((name) => [name, occasion] as const);
  }),
);

/**
 * The community occasion a title names, if any.
 * @example
 * occasionNamed('Society Ganesh utsav'); // 'ganesh-utsav'
 */
export function occasionNamed(title: string): CommunityOccasion | undefined {
  return findPhrases(tokenise(title).tokens, OCCASION_NAMES)[0]?.value;
}

/**
 * The scope of a plan's idea board: its occasion (from the title) and the cut line.
 * @example
 * ideaScopeFor(plan, context).cut; // 'entertainment' for the Chennai 60th sample
 */
export function ideaScopeFor(plan: Plan, context: EventContext): IdeaScope {
  const occasion = occasionNamed(context.title ?? plan.title);
  return {
    ...(occasion === undefined ? {} : { occasion }),
    ...(context.cut === undefined ? {} : { cut: context.cut }),
  };
}

/**
 * The budget line an idea is paid from.
 * @example
 * ideaBudgetLine({ ...idea, category: 'music' }); // 'entertainment'
 */
export function ideaBudgetLine(idea: LibraryIdea): RankableCategory {
  return idea.budgetLine ?? IDEA_BUDGET_LINES[idea.category];
}

/**
 * True when a regional or occasion idea belongs to this event's tradition or occasion.
 * @example
 * matchesTradition(onamSadya, constraints, { occasion: 'onam' }); // true
 */
export function matchesTradition(
  idea: LibraryIdea,
  constraints: IdeaConstraints,
  scope: IdeaScope,
): boolean {
  const { traditions, occasions } = idea.fit;
  const tradition = constraints.tradition;
  const occasion = scope.occasion;
  return (
    (tradition !== undefined && (traditions ?? []).includes(tradition)) ||
    (occasion !== undefined && (occasions ?? []).includes(occasion))
  );
}

/**
 * True when an idea suits the event: its kind, a tradition it is not wrong for, its own
 * tradition or occasion when it is regional, and a budget line the user did not cut.
 * @example
 * suitsEvent(garbaWorkshop, ganeshConstraints, { occasion: 'ganesh-utsav' }); // false
 */
export function suitsEvent(
  idea: LibraryIdea,
  constraints: IdeaConstraints,
  scope: IdeaScope,
): boolean {
  const fit = idea.fit;
  const tradition = constraints.tradition;
  const regional = fit.traditions !== undefined || fit.occasions !== undefined;
  return (
    (fit.kinds === undefined || fit.kinds.includes(constraints.kind)) &&
    !(tradition !== undefined && (fit.avoidTraditions ?? []).includes(tradition)) &&
    !(scope.cut !== undefined && ideaBudgetLine(idea) === scope.cut) &&
    (!regional || matchesTradition(idea, constraints, scope))
  );
}
