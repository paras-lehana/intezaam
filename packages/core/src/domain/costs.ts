/**
 * Total-cost bands (VER-M) — what a wedding or a birthday typically costs.
 *
 * Responsibility: the wedding spending columns the money bands are keyed by (the VK rows
 * themselves live with the money engine), the catering stretch share, the birthday bands by
 * kind and setting, the teen factor, the kids'-party item prices and the late
 * return-gift markup the birthday task quotes. Boundary: published ranges are estimates;
 * grade-D rows are labelled in the UI.
 */
import type { SourceId } from './sources.js';
import type { Confidence } from './source-types.js';
import type { NumberRange, OpenRange } from './units.js';
import { range } from './units.js';

/** VK's three spending columns; the money bands and levers are keyed by them. */
export const WEDDING_BANDS = ['budget', 'mid', 'luxury'] as const;

export type WeddingBand = (typeof WEDDING_BANDS)[number];

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

/** Party bands for the kinds that have published ones. */
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

/** No Indian source covers teens: use kids' bands × 1.2 (grade D). */
export const TEEN_BAND_FACTOR = 1.2;

/** Kids'-party item prices (S-CHARMBOX-2026, grade C). */
export const KIDS_PARTY_ITEMS_INR = {
  cake: range(1_500, 8_000),
  decor: range(2_500, 15_000),
  foodPerHead: range(150, 500),
  returnGiftStandard: range(150, 350),
  returnGiftPremium: range(400, 600),
  photographer: range(2_000, 8_000),
} as const;

/** BIR task: buying return gifts close to the date costs 30–40% more per piece (S-CHARMBOX-2026). */
export const LATE_RETURN_GIFT_MARKUP_PCT = range(30, 40);
