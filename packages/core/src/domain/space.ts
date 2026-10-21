/**
 * Space per guest (SPACE-01) — how many people a hall or lawn really holds.
 *
 * Responsibility: square feet per guest for each seating layout and the share of floor
 * lost to stage, bars and aisles, from published capacity guides (04 §8.3).
 * Boundary: planning estimates only; local fire rules set the legal occupancy.
 */
import type { SourceId } from './sources.js';
import type { Confidence } from './source-types.js';
import type { NumberRange } from './units.js';
import { range } from './units.js';

export const SPACE_LAYOUTS = [
  'banquet-rounds',
  'theatre',
  'standing',
  'reception-mixed',
  'reception-dance',
] as const;

export type SpaceLayout = (typeof SPACE_LAYOUTS)[number];

export interface SpaceLayoutProfile {
  readonly label: string;
  readonly sqftPerGuest: NumberRange;
  /** The value the capacity check uses; the middle of the published range. */
  readonly defaultSqftPerGuest: number;
  readonly sourceId: SourceId;
  readonly confidence: Confidence;
}

export const SPACE_LAYOUT_PROFILES: Readonly<Record<SpaceLayout, SpaceLayoutProfile>> = {
  'banquet-rounds': {
    label: 'Seated at round tables',
    sqftPerGuest: range(10, 12),
    defaultSqftPerGuest: 11,
    sourceId: 'S-ARABIA-ND',
    confidence: 'C',
  },
  theatre: {
    label: 'Rows of chairs (ceremony, puja, satsang)',
    sqftPerGuest: range(6, 10),
    defaultSqftPerGuest: 8,
    sourceId: 'S-ARABIA-ND',
    confidence: 'C',
  },
  standing: {
    label: 'Standing or walking around (mela, procession)',
    sqftPerGuest: range(5, 7),
    defaultSqftPerGuest: 6,
    sourceId: 'S-SOCIALTABLES-ND',
    confidence: 'C',
  },
  'reception-mixed': {
    label: 'Reception, part seated and part standing',
    sqftPerGuest: range(8, 8),
    defaultSqftPerGuest: 8,
    sourceId: 'S-SOCIALTABLES-ND',
    confidence: 'C',
  },
  'reception-dance': {
    label: 'Reception with a dance floor',
    sqftPerGuest: range(9, 9),
    defaultSqftPerGuest: 9,
    sourceId: 'S-SOCIALTABLES-ND',
    confidence: 'C',
  },
};

/** Subtract 15% of the floor for stage, bars and aisles before dividing (04 §8.3). */
export const USABLE_FLOOR_SHARE = 0.85;

/** 1 m² = 10.764 sq ft, for users who know their hall in square metres. */
export const SQFT_PER_SQM = 10.764;

/** A dancer needs about 4.5 sq ft; 33–50% of guests dance at once (04 §8.3, grade C). */
export const DANCE_FLOOR_SQFT_PER_DANCER = 4.5;
export const DANCING_GUEST_SHARE = range(0.33, 0.5);

/**
 * SPACE-01 capacity: floor(area × 0.85 ÷ sq ft per guest).
 * @example
 * layoutCapacity(3000, 'banquet-rounds'); // 231
 */
export function layoutCapacity(areaSqft: number, layout: SpaceLayout): number {
  return Math.floor(
    (areaSqft * USABLE_FLOOR_SHARE) / SPACE_LAYOUT_PROFILES[layout].defaultSqftPerGuest,
  );
}
