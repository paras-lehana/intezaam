/**
 * Catering bases (CST-01) — the ways a celebration's food can be priced.
 *
 * Responsibility: the closed list of food bases — per plate on the tier × caterer-class grid
 * (weddings, milestone parties, family functions), the published party rate per head (first,
 * kids' and teen birthdays), an intimate wedding in the same tier (the 60th, a labelled
 * assumption) or the community's own food-and-prasad line (no published per-visitor price) —
 * with the sources, grade and plain note each basis brings. Which kind uses which basis lives
 * in the one per-kind table, money-model.ts. Boundary: lookups only; catering.ts and
 * cost-check.ts price.
 */
import { KIDS_PARTY_ITEMS_INR, TEEN_BAND_FACTOR } from '../domain/costs.js';
import type { SourceId } from '../domain/sources.js';
import type { Confidence } from '../domain/source-types.js';
import type { NumberRange } from '../domain/units.js';
import { KIND_MONEY } from './money-model.js';
import type { ClassifiedContext } from './types.js';

export const CATERING_BASES = [
  'plate',
  'party',
  'teen-party',
  'intimate-wedding',
  'prasad',
] as const;

export type CateringBasis = (typeof CATERING_BASES)[number];

/** The two bases priced at the kids'-party food rate. */
export type PartyBasis = Extract<CateringBasis, 'party' | 'teen-party'>;

/** No Indian source prices teen parties: the kids' band × 1.2, as for the budget bands (D). */
const PARTY_FACTOR: Readonly<Record<PartyBasis, number>> = {
  party: 1,
  'teen-party': TEEN_BAND_FACTOR,
};

export interface BasisInfo {
  readonly sourceIds: readonly SourceId[];
  readonly confidence: Confidence;
  /** One plain sentence for the cost-check notes. */
  readonly note: string;
}

export const CATERING_BASIS_INFO: Readonly<Record<CateringBasis, BasisInfo>> = {
  plate: {
    sourceIds: ['S-RSA-2026', 'S-VKPLATE-2026'],
    confidence: 'C',
    note: 'Meals are priced per plate for your city tier and caterer class.',
  },
  party: {
    sourceIds: ['S-CHARMBOX-2026'],
    confidence: 'C',
    note: 'Party food is priced at the published kids’-party rate per head, for children and adults alike.',
  },
  'teen-party': {
    sourceIds: ['S-CHARMBOX-2026', 'S-INTEZAAM-D'],
    confidence: 'D',
    note: 'Teen party food is the kids’-party rate × 1.2 (an assumption: no published teen rates).',
  },
  'intimate-wedding': {
    sourceIds: ['S-RSA-2026', 'S-WIKI-SHASHTHIPURTI', 'S-INTEZAAM-D'],
    confidence: 'D',
    note: 'A 60th is priced like an intimate wedding in the same city tier (an assumption: no published 60th rates).',
  },
  prasad: {
    sourceIds: ['S-NOBROKERHOOD-ND', 'S-INTEZAAM-D'],
    confidence: 'D',
    note: 'No published per-visitor price exists for prasad or bhog; the committee sets it, so the food and prasad line is the plan.',
  },
};

/**
 * The catering basis for a classified context, read from the per-kind money table.
 * @example
 * cateringBasis(bengaluruCtx); // 'party'
 */
export function cateringBasis(ctx: Pick<ClassifiedContext, 'kind'>): CateringBasis {
  return KIND_MONEY[ctx.kind].food;
}

/**
 * The party food band per head for a party basis, or null for every other basis.
 * @example
 * partyFoodBand('teen-party'); // { min: 180, max: 600 }
 */
export function partyFoodBand(basis: CateringBasis): NumberRange | null {
  if (basis !== 'party' && basis !== 'teen-party') return null;
  const band = KIDS_PARTY_ITEMS_INR.foodPerHead;
  const factor = PARTY_FACTOR[basis];
  return { min: Math.round(band.min * factor), max: Math.round(band.max * factor) };
}
