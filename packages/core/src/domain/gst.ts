/**
 * GST on event services (CST-06), after the rate changes effective 22 Sep 2025.
 *
 * Responsibility: the published service rates and the default rate for each budget
 * category used in budget arithmetic. Boundary: the real rate depends on the contract
 * (standalone, composite, specified premises), so every figure carries "depends on
 * contract"; categories without a researched rate return null and are flagged, not guessed.
 */
import type { BudgetCategory } from './budget-categories.js';
import type { SourceId } from './sources.js';
import type { Confidence } from './source-types.js';

/** CBIC notifications 15/2025 and 16/2025-Central Tax (Rate), effective 22 Sep 2025. */
export const GST_EFFECTIVE_FROM_ISO = '2025-09-22';

export const GST_SERVICE_KEYS = [
  'outdoor-catering',
  'catering-specified-premises',
  'hotel-rooms-low',
  'hotel-rooms-high',
  'venue-rental',
  'decor-tent-crewed',
  'rental-furniture-lights',
  'photography',
  'event-management',
  'beauty-makeup',
] as const;

export type GstServiceKey = (typeof GST_SERVICE_KEYS)[number];

export interface GstService {
  readonly label: string;
  readonly ratePct: number;
  /** Whether the supplier can claim input tax credit (affects how vendors quote). */
  readonly inputTaxCredit: boolean;
  readonly condition: string;
  readonly sourceId: SourceId;
  readonly confidence: Confidence;
}

export const GST_SERVICES: Readonly<Record<GstServiceKey, GstService>> = {
  'outdoor-catering': {
    label: 'Outdoor or event catering (SAC 9963)',
    ratePct: 5,
    inputTaxCredit: false,
    condition: 'Including a hall or pandal supplied with the food, at a non-hotel premises.',
    sourceId: 'S-TAXGARDEN-2026',
    confidence: 'C',
  },
  'catering-specified-premises': {
    label: 'Catering at a hotel with rooms above ₹7,500 a day',
    ratePct: 18,
    inputTaxCredit: true,
    condition: 'The hotel is a "specified premises" by its actual room value.',
    sourceId: 'S-HNA-2025',
    confidence: 'B',
  },
  'hotel-rooms-low': {
    label: 'Hotel rooms up to ₹7,500 a night',
    ratePct: 5,
    inputTaxCredit: false,
    condition: 'Was 12% before 22 Sep 2025.',
    sourceId: 'S-HNA-2025',
    confidence: 'B',
  },
  'hotel-rooms-high': {
    label: 'Hotel rooms above ₹7,500 a night',
    ratePct: 18,
    inputTaxCredit: true,
    condition: 'Room value per unit per day.',
    sourceId: 'S-HNA-2025',
    confidence: 'B',
  },
  'venue-rental': {
    label: 'Marriage hall, banquet or lawn rental without food',
    ratePct: 18,
    inputTaxCredit: true,
    condition: 'A venue package with decor and services is one composite supply at 18%.',
    sourceId: 'S-BUSY-HALL-ND',
    confidence: 'C',
  },
  'decor-tent-crewed': {
    label: 'Decor, tent, mandap or stage set up by the vendor’s crew',
    ratePct: 18,
    inputTaxCredit: true,
    condition: 'Not changed by the 2025 notifications.',
    sourceId: 'S-TAXGARDEN-2026',
    confidence: 'C',
  },
  'rental-furniture-lights': {
    label: 'Bare hire of chairs, tables, lights and generators',
    ratePct: 18,
    inputTaxCredit: true,
    condition: 'Tent and carpet hire up to ₹2,500 a piece is 5%.',
    sourceId: 'S-TAXGARDEN-2026',
    confidence: 'C',
  },
  photography: {
    label: 'Event photography and videography (SAC 998383)',
    ratePct: 18,
    inputTaxCredit: true,
    condition: 'Unchanged in 2025.',
    sourceId: 'S-BUSY-PHOTO-2026',
    confidence: 'C',
  },
  'event-management': {
    label: 'Event management and planners (SAC 998596)',
    ratePct: 18,
    inputTaxCredit: true,
    condition: 'Planner or event manager fees.',
    sourceId: 'S-BUSY-EVENT-ND',
    confidence: 'C',
  },
  'beauty-makeup': {
    label: 'Beauty services, likely including bridal makeup (group 99972)',
    ratePct: 5,
    inputTaxCredit: false,
    condition: 'Was 18% before 22 Sep 2025; check the artist’s SAC code.',
    sourceId: 'S-HNA-2025',
    confidence: 'B',
  },
};

/**
 * Default service per category for budget arithmetic (default rates, grade D).
 * null = not researched (outfits, gifts, transport, rituals…): shown as "GST not estimated".
 */
export const GST_SERVICE_BY_CATEGORY: Readonly<Record<BudgetCategory, GstServiceKey | null>> = {
  venue: 'venue-rental',
  catering: 'outdoor-catering',
  decor: 'decor-tent-crewed',
  photo_video: 'photography',
  attire: null,
  jewellery: null,
  makeup: 'beauty-makeup',
  mehendi: 'beauty-makeup',
  entertainment: 'event-management',
  invites: null,
  gifts: null,
  transport: null,
  accommodation: 'hotel-rooms-low',
  rituals: null,
  sound_light: 'rental-furniture-lights',
  safety_medical: null,
  cultural_prizes: 'event-management',
  promotion: null,
  volunteers_sanitation: null,
  planner: 'event-management',
  contingency: null,
};

/**
 * The default GST rate for a category, or null when it is not researched.
 * @example
 * gstRateForCategory('catering'); // 5
 * gstRateForCategory('transport'); // null
 */
export function gstRateForCategory(category: BudgetCategory): number | null {
  const key = GST_SERVICE_BY_CATEGORY[category];
  return key === null ? null : GST_SERVICES[key].ratePct;
}
