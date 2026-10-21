/**
 * Budget splits (BUD-01…08) — the starting share of each category, in basis points.
 *
 * Responsibility: the base split per event family (each sums to exactly 10,000 bp = 100%)
 * and per-kind overrides for family functions and the 60th birthday. Boundary: data only;
 * the shifts applied on top are in budget-shifts.ts, and the engine applies both in order.
 */
import type { BudgetCategory } from './budget-categories.js';
import type { EventFamily, EventKind } from './events.js';
import { EVENT_KIND_PROFILES } from './event-kinds.js';
import type { SourceId } from './sources.js';
import type { Confidence } from './source-types.js';

/** 10,000 basis points = 100%. Integers avoid floating-point drift when shares move. */
export const BASIS_POINTS_TOTAL = 10_000;

export type SplitBp = Readonly<Partial<Record<BudgetCategory, number>>>;

export interface SplitRow {
  readonly shares: SplitBp;
  readonly sourceIds: readonly SourceId[];
  readonly confidence: Confidence;
}

/** BUD-01 base splits, verbatim from synthesis §4.4 (each row sums to 10,000). */
export const BUDGET_SPLITS: Readonly<Record<EventFamily, SplitRow>> = {
  // 04 §1.1: our default inside every source's range; jewellery is tracked separately.
  wedding: {
    shares: {
      venue: 2_000,
      catering: 2_500,
      decor: 1_100,
      photo_video: 900,
      attire: 800,
      makeup: 300,
      mehendi: 100,
      entertainment: 400,
      invites: 200,
      gifts: 200,
      transport: 300,
      accommodation: 200,
      rituals: 200,
      contingency: 800,
    },
    sourceIds: ['S-WP-2026', 'S-VK-2026', 'S-IMW-2026'],
    confidence: 'C',
  },
  // 04 §5.1: ChocoCraft ranges; BUD-07 then adds the 10% contingency floor.
  birthday: {
    shares: {
      venue: 2_500,
      catering: 3_300,
      decor: 1_200,
      entertainment: 1_200,
      gifts: 1_000,
      photo_video: 800,
    },
    sourceIds: ['S-CHOCOCRAFT-2025'],
    confidence: 'C',
  },
  // 04 §6.4: NoBrokerHood names the heads; the shares are our assumption.
  community: {
    shares: {
      venue: 2_500,
      decor: 1_500,
      sound_light: 800,
      catering: 2_200,
      rituals: 700,
      cultural_prizes: 800,
      safety_medical: 500,
      contingency: 1_000,
    },
    sourceIds: ['S-NOBROKERHOOD-ND', 'S-NDMA-2014', 'S-INTEZAAM-D'],
    confidence: 'D',
  },
  // Owner's "gathering" row (01 §3.1); venue and catering split 4:5 as in the wedding split.
  'family-function': {
    shares: {
      venue: 2_400,
      catering: 3_100,
      decor: 1_500,
      photo_video: 1_000,
      entertainment: 1_500,
      contingency: 500,
    },
    sourceIds: ['S-OWNER-DEFAULTS'],
    confidence: 'D',
  },
};

const OWNER_ROW = { sourceIds: ['S-OWNER-DEFAULTS'], confidence: 'D' } as const;

/**
 * Kinds whose costs differ from their family's base. Family-function rows are the owner's
 * planner defaults (01 §3.1, venue and catering split 4:5); the 60th birthday weights
 * priests and homam like a small wedding (04 §5.2, grade D).
 */
export const KIND_SPLIT_OVERRIDES: Readonly<Partial<Record<EventKind, SplitRow>>> = {
  'sixtieth-birthday': {
    shares: {
      venue: 2_200,
      catering: 2_800,
      decor: 1_200,
      photo_video: 1_000,
      rituals: 1_500,
      gifts: 500,
      invites: 200,
      contingency: 600,
    },
    sourceIds: ['S-WIKI-SHASHTHIPURTI', 'S-INTEZAAM-D'],
    confidence: 'D',
  },
  engagement: {
    shares: {
      venue: 1_800,
      catering: 2_200,
      decor: 1_500,
      photo_video: 1_200,
      attire: 1_500,
      makeup: 400,
      entertainment: 500,
      gifts: 400,
      contingency: 500,
    },
    ...OWNER_ROW,
  },
  anniversary: {
    shares: {
      venue: 2_200,
      catering: 2_800,
      decor: 1_500,
      photo_video: 1_200,
      attire: 700,
      entertainment: 1_000,
      gifts: 300,
      contingency: 300,
    },
    ...OWNER_ROW,
  },
  'baby-shower': {
    shares: {
      venue: 2_000,
      catering: 2_500,
      decor: 2_000,
      photo_video: 1_000,
      makeup: 400,
      entertainment: 500,
      gifts: 700,
      rituals: 600,
      contingency: 300,
    },
    ...OWNER_ROW,
  },
  'naming-mundan': {
    shares: {
      venue: 2_000,
      catering: 2_500,
      decor: 1_500,
      photo_video: 1_000,
      attire: 400,
      gifts: 800,
      rituals: 1_500,
      contingency: 300,
    },
    ...OWNER_ROW,
  },
  'griha-pravesh': {
    shares: {
      venue: 2_000,
      catering: 2_500,
      decor: 1_500,
      photo_video: 700,
      gifts: 600,
      rituals: 1_800,
      contingency: 900,
    },
    ...OWNER_ROW,
  },
  'home-puja': {
    shares: {
      venue: 1_800,
      catering: 2_200,
      decor: 1_500,
      photo_video: 500,
      gifts: 800,
      rituals: 2_500,
      contingency: 700,
    },
    ...OWNER_ROW,
  },
};

/**
 * The base split for a kind: its override when one exists, else its family's row.
 * @example
 * baseSplitFor('home-puja').shares.rituals; // 2500
 */
export function baseSplitFor(kind: EventKind): SplitRow {
  return KIND_SPLIT_OVERRIDES[kind] ?? BUDGET_SPLITS[EVENT_KIND_PROFILES[kind].family];
}
