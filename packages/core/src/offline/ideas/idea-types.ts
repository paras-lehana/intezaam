/**
 * The shape of one curated idea in the offline ideas library (feature #29, synthesis §5
 * job 2 fallback).
 *
 * Responsibility: an idea in the same fields the model returns (category, title,
 * description, why it fits, effort, eco, YouTube query) plus what code needs to filter it —
 * the families and ages it suits, the style chips, seasons and settings it fits, the food it
 * contains (so Jain and vegetarian menus filter it) and its cost band relative to the
 * category's budget line. Boundary: types and the `idea` helper only; the rows live in the
 * neighbouring library files.
 */
import type { VenueSetting } from '../../domain/context-options.js';
import type { AgeBand, EventFamily } from '../../domain/events.js';
import type { CostBand, EffortLevel, IdeaCategory, SignalKey } from '../../domain/ideas.js';
import type { StyleTag } from '../../domain/style.js';
import type { IdeaSeason } from '../../genai/idea-constraints.js';

/** What an idea's food or drink contains, for the Jain, vegetarian and alcohol filters. */
export const FOOD_FLAGS = ['meat', 'egg', 'onion-garlic', 'root-veg', 'alcohol'] as const;

export type FoodFlag = (typeof FOOD_FLAGS)[number];

export interface IdeaFit {
  readonly families: readonly EventFamily[];
  readonly ages?: readonly AgeBand[];
  readonly styles?: readonly StyleTag[];
  readonly seasons?: readonly IdeaSeason[];
  readonly settings?: readonly VenueSetting[];
  readonly contains?: readonly FoodFlag[];
}

export interface LibraryIdea {
  readonly category: IdeaCategory;
  readonly title: string;
  readonly description: string;
  /** The context signal the idea fits and the one-line reason shown as "why this fits you". */
  readonly why: readonly [SignalKey, string];
  readonly effort: EffortLevel;
  readonly eco: boolean;
  readonly costBand: CostBand;
  readonly youtubeQuery: string;
  readonly fit: IdeaFit;
}

/** Every family, for ideas that suit any celebration. */
export const ANY_FAMILY: readonly EventFamily[] = [
  'wedding',
  'birthday',
  'community',
  'family-function',
];
