/**
 * Total-cost bands (VER-M) — what a wedding or a birthday typically costs.
 *
 * Responsibility: the wedding cost matrix by city tier × scale × band (metro rows from
 * VK 2026, other tiers derived with the tier multiplier, 04 §1.3), the birthday bands by
 * kind and setting (04 §5.2), the kids'-party item prices and the national averages.
 * Boundary: published ranges are estimates; grade-D rows are labelled in the UI.
 */
import type { CityTier } from './cities.js';
import type { ScaleBand } from './scale.js';
import type { SourceId } from './sources.js';
import type { Confidence } from './source-types.js';
import type { NumberRange, OpenRange } from './units.js';
import { lakh, lakhRange, range } from './units.js';

/** VK's three spending columns. */
export const WEDDING_BANDS = ['budget', 'mid', 'luxury'] as const;

export type WeddingBand = (typeof WEDDING_BANDS)[number];

/**
 * 04 §1.3. Metro rows are VK 2026 (grade C); tier-2 and tier-3 rows are the metro rows ×
 * 0.67 and × 0.43, rounded (grade D). Intimate = VK's 100-guest row, mid = 200, large =
 * the 300 and 400+ rows merged.
 */
export const WEDDING_COST_MATRIX: Readonly<
  Record<CityTier, Record<ScaleBand, Record<WeddingBand, NumberRange>>>
> = {
  metro: {
    intimate: { budget: lakhRange(5, 8), mid: lakhRange(10, 18), luxury: lakhRange(25, 50) },
    mid: { budget: lakhRange(10, 16), mid: lakhRange(20, 35), luxury: lakhRange(45, 90) },
    large: { budget: lakhRange(14, 28), mid: lakhRange(28, 65), luxury: lakhRange(65, 180) },
  },
  tier2: {
    intimate: { budget: lakhRange(3.5, 5.5), mid: lakhRange(6.5, 12), luxury: lakhRange(17, 33) },
    mid: { budget: lakhRange(6.5, 11), mid: lakhRange(13, 23.5), luxury: lakhRange(30, 60) },
    large: { budget: lakhRange(9.5, 19), mid: lakhRange(19, 44), luxury: lakhRange(44, 120) },
  },
  tier3: {
    intimate: { budget: lakhRange(2, 3.5), mid: lakhRange(4.5, 7.5), luxury: lakhRange(11, 21.5) },
    mid: { budget: lakhRange(4.5, 7), mid: lakhRange(8.5, 15), luxury: lakhRange(19, 39) },
    large: { budget: lakhRange(6, 12), mid: lakhRange(12, 28), luxury: lakhRange(28, 77) },
  },
};

/** Guests in the VK row each scale band is read from (large spans 300–400+; grade D). */
export const WEDDING_MATRIX_REFERENCE_GUESTS: Readonly<Record<ScaleBand, number>> = {
  intimate: 100,
  mid: 200,
  large: 300,
};

export const WEDDING_MATRIX_SOURCES: readonly SourceId[] = ['S-VK-2026', 'S-INTEZAAM-D'];

/** VER-M (wedding): Stretch also applies when low-end catering alone exceeds 60% (grade D). */
export const CATERING_STRETCH_SHARE = 0.6;

export const BIRTHDAY_SETTINGS = ['home', 'hall', 'venue', 'premium'] as const;

export type BirthdaySetting = (typeof BIRTHDAY_SETTINGS)[number];

export interface BirthdayBand {
  readonly setting: BirthdaySetting;
  readonly label: string;
  readonly guests: NumberRange;
  readonly inr: OpenRange;
  readonly sourceId: SourceId;
  readonly confidence: Confidence;
}

/** Every published birthday band is a planner-blog estimate (grade C). */
function band(
  setting: BirthdaySetting,
  label: string,
  guests: NumberRange,
  inr: OpenRange,
  sourceId: SourceId,
): BirthdayBand {
  return { setting, label, guests, inr, sourceId, confidence: 'C' };
}

/** 04 §5.2 bands for the kinds that have published ones. */
export const BIRTHDAY_BANDS: Readonly<
  Record<'first-birthday' | 'kids-birthday', readonly BirthdayBand[]>
> = {
  'first-birthday': [
    band('home', 'At home', range(20, 50), { min: 10_000, max: 20_000 }, 'S-VENUELOOK-ND'),
    band(
      'hall',
      'Home or hall, 20–40 guests',
      range(20, 40),
      { min: 15_000, max: 45_000 },
      'S-VENUELOOK-ND',
    ),
    band(
      'venue',
      'Venue with decor and food',
      range(20, 50),
      { min: 25_000, max: 60_000 },
      'S-VENUELOOK-ND',
    ),
  ],
  'kids-birthday': [
    band(
      'home',
      'At home, 10–15 children',
      range(10, 15),
      { min: 5_000, max: 12_000 },
      'S-CHARMBOX-2026',
    ),
    band(
      'hall',
      'Hall, 25–40 children',
      range(25, 40),
      { min: 18_000, max: 45_000 },
      'S-CHARMBOX-2026',
    ),
    band(
      'venue',
      'Themed venue, 30–60 children',
      range(30, 60),
      { min: 50_000, max: 150_000 },
      'S-CHARMBOX-2026',
    ),
    band(
      'premium',
      'Premium, 50–100+ children',
      range(50, 100),
      { min: 150_000, max: null },
      'S-CHARMBOX-2026',
    ),
  ],
};

/** No Indian source covers teens: use kids' bands × 1.2 (04 §5.2, grade D). */
export const TEEN_BAND_FACTOR = 1.2;

/** Milestone adult parties add decor and entertainment at 10–15% each (04 §5.2, grade D). */
export const MILESTONE_EXTRA_SHARE_PCT = range(10, 15);

/** Kids'-party item prices (S-CHARMBOX-2026, grade C). */
export const KIDS_PARTY_ITEMS_INR = {
  cake: range(1_500, 8_000),
  decor: range(2_500, 15_000),
  foodPerHead: range(150, 500),
  returnGiftStandard: range(150, 350),
  returnGiftPremium: range(400, 600),
  photographer: range(2_000, 8_000),
} as const;

/** Buying return gifts close to the date costs 30–40% more per piece (S-CHARMBOX-2026). */
export const LATE_RETURN_GIFT_MARKUP_PCT = range(30, 40);

/** What "average" means (04 §1.4): CAIT's all-India figure suits a typical family best. */
export const WEDDING_AVERAGES_INR = {
  allIndiaCait: lakh(14.1),
  wedMeGoodUsers: lakh(39.5),
  wedMeGoodDestination: lakh(58),
} as const;
