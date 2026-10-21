/**
 * The shape of one curated idea in the offline ideas library (feature #29, GENAI_ARCHITECTURE.md
 * job 2 fallback).
 *
 * Responsibility: an idea in the same fields the model returns (category, title,
 * description, why it fits, effort, eco, YouTube query) plus what code needs to filter it —
 * the families, kinds and ages it suits, the traditions or community occasions it belongs to,
 * the style chips, seasons and settings it fits, the food it contains (so Jain and vegetarian
 * menus filter it), the budget line it is paid from (so the user's "cut" line filters it) and
 * its cost band relative to that line. Boundary: types only; the rows live in the
 * neighbouring library files.
 */
import type { RankableCategory } from '../../domain/budget-categories.js';
import type { CommunityOccasion } from '../../domain/community-occasions.js';
import type { VenueSetting } from '../../domain/context-options.js';
import type { AgeBand, EventFamily, EventKind } from '../../domain/events.js';
import type { CostBand, EffortLevel, IdeaCategory, SignalKey } from '../../domain/ideas.js';
import type { StyleTag } from '../../domain/style.js';
import type { Tradition } from '../../domain/traditions.js';
import type { IdeaSeason } from '../../genai/idea-constraints.js';

/** What an idea's food or drink contains, for the Jain, vegetarian and alcohol filters. */
export const FOOD_FLAGS = ['meat', 'egg', 'onion-garlic', 'root-veg', 'alcohol'] as const;

export type FoodFlag = (typeof FOOD_FLAGS)[number];

export interface IdeaFit {
  readonly families: readonly EventFamily[];
  /** Only these event kinds (e.g. a 60th birthday), when set. */
  readonly kinds?: readonly EventKind[];
  /**
   * A regional idea: shown only when the event's tradition is listed here or its occasion is
   * listed in `occasions` (an Onam sadya never reaches a Ganesh utsav), and ranked first then.
   */
  readonly traditions?: readonly Tradition[];
  /** An occasion idea (Garba for Navratri): same rule as `traditions`, either one matching. */
  readonly occasions?: readonly CommunityOccasion[];
  /** A pan-Indian idea that does not suit these traditions (a Bollywood night at a Tamil 60th). */
  readonly avoidTraditions?: readonly Tradition[];
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
  /** The budget line that pays for it, when not the category's usual one (IDEA_BUDGET_LINES). */
  readonly budgetLine?: RankableCategory;
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
