/**
 * City tiers and city anchors (CTX-02) — how local prices scale.
 *
 * Responsibility: the three cost tiers with their multipliers (derived from per-plate
 * midpoints, 04 §1.3) and the eight cities with a published 300-guest mid-range wedding
 * figure, which override the tier when present. Boundary: data only; the gazetteer that
 * maps a typed city name to these is city-table.ts.
 */
import type { SourceId } from './sources.js';
import type { Confidence } from './source-types.js';
import type { NumberRange } from './units.js';
import { lakhRange } from './units.js';

export const CITY_TIERS = ['metro', 'tier2', 'tier3'] as const;

export type CityTier = (typeof CITY_TIERS)[number];

export interface TierProfile {
  readonly label: string;
  readonly labelHi: string;
  /**
   * Cost relative to a metro. Derived from catering per-plate midpoints (metro ₹1,500,
   * tier-2 ₹1,000, tier-3 ₹650; S-RSA-2026), so 1.00 / 0.67 / 0.43 (grade D).
   */
  readonly costMultiplier: number;
  readonly exampleCities: readonly string[];
  readonly sourceId: SourceId;
  readonly confidence: Confidence;
}

export const TIER_PROFILES: Readonly<Record<CityTier, TierProfile>> = {
  metro: {
    label: 'Metro',
    labelHi: 'महानगर',
    costMultiplier: 1,
    exampleCities: ['Mumbai', 'Delhi NCR', 'Bengaluru', 'Hyderabad'],
    sourceId: 'S-RSA-2026',
    confidence: 'D',
  },
  tier2: {
    label: 'Tier-2 city',
    labelHi: 'टियर-2 शहर',
    costMultiplier: 0.67,
    exampleCities: ['Lucknow', 'Pune', 'Ahmedabad', 'Kolkata'],
    sourceId: 'S-RSA-2026',
    confidence: 'D',
  },
  tier3: {
    label: 'Smaller city or town',
    labelHi: 'छोटा शहर या कस्बा',
    costMultiplier: 0.43,
    exampleCities: [],
    sourceId: 'S-RSA-2026',
    confidence: 'D',
  },
};

/** A city we cannot find is priced as tier-2, the middle band, and the trace says so (CTX-02). */
export const UNKNOWN_CITY_TIER: CityTier = 'tier2';

/** Cities with a published wedding cost figure (VK 2026 city cross-check, 04 §1.3). */
export const ANCHOR_CITIES = [
  'mumbai',
  'delhi-ncr',
  'bengaluru',
  'jaipur',
  'hyderabad',
  'chennai',
  'ahmedabad',
  'kolkata',
] as const;

export type AnchorCity = (typeof ANCHOR_CITIES)[number];

export interface CityAnchor {
  readonly label: string;
  /** Mid-range total for the reference wedding below (venue, food, decor, photo, music). */
  readonly midRangeInr: NumberRange;
  readonly referenceGuests: number;
  readonly referenceFunctions: number;
  readonly sourceId: SourceId;
  readonly confidence: Confidence;
}

/** VK 2026: 300 guests, 3 events, mid-range; jewellery, trousseau and rooms excluded. */
const ANCHOR_GUESTS = 300;
const ANCHOR_FUNCTIONS = 3;

function anchor(label: string, minLakh: number, maxLakh: number): CityAnchor {
  return {
    label,
    midRangeInr: lakhRange(minLakh, maxLakh),
    referenceGuests: ANCHOR_GUESTS,
    referenceFunctions: ANCHOR_FUNCTIONS,
    sourceId: 'S-VK-2026',
    confidence: 'C',
  };
}

export const CITY_ANCHORS: Readonly<Record<AnchorCity, CityAnchor>> = {
  mumbai: anchor('Mumbai', 35, 55),
  'delhi-ncr': anchor('Delhi NCR', 32, 52),
  bengaluru: anchor('Bengaluru', 28, 46),
  jaipur: anchor('Jaipur', 28, 48),
  hyderabad: anchor('Hyderabad', 27, 45),
  chennai: anchor('Chennai', 24, 40),
  ahmedabad: anchor('Ahmedabad', 24, 40),
  kolkata: anchor('Kolkata', 20, 36),
};

/** Each extra 100 guests adds roughly ₹2–5 L, depending on the city (S-IMW-2026). */
export const EXTRA_PER_100_GUESTS_INR = lakhRange(2, 5);
