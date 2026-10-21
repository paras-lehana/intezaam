/**
 * Budget categories — the lines every plan's money is split into.
 *
 * Responsibility: one closed list of categories covering weddings, birthdays, community
 * events and family functions (BUD-01), each with English and Hindi
 * labels and a cost type that says whether it grows with guests.
 * Boundary: labels and cost types only; shares are in budget-splits.ts.
 */

export const BUDGET_CATEGORIES = [
  'venue',
  'catering',
  'decor',
  'photo_video',
  'attire',
  'jewellery',
  'makeup',
  'mehendi',
  'entertainment',
  'invites',
  'gifts',
  'transport',
  'accommodation',
  'rituals',
  'sound_light',
  'safety_medical',
  'cultural_prizes',
  'promotion',
  'volunteers_sanitation',
  'planner',
  'contingency',
] as const;

export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];

/** Whether a line scales with headcount (re-priced when guests change) or stays fixed. */
export const COST_TYPES = ['fixed', 'per-guest', 'mixed'] as const;

export type CostType = (typeof COST_TYPES)[number];

export interface CategoryProfile {
  readonly label: string;
  readonly labelHi: string;
  readonly costType: CostType;
}

export const CATEGORY_PROFILES: Readonly<Record<BudgetCategory, CategoryProfile>> = {
  venue: { label: 'Venue and rentals', labelHi: 'वेन्यू और किराया', costType: 'mixed' },
  catering: { label: 'Food and catering', labelHi: 'खान-पान', costType: 'per-guest' },
  decor: { label: 'Decor and flowers', labelHi: 'सजावट', costType: 'fixed' },
  photo_video: { label: 'Photo and video', labelHi: 'फ़ोटो और वीडियो', costType: 'fixed' },
  attire: { label: 'Outfits', labelHi: 'पहनावा', costType: 'fixed' },
  jewellery: { label: 'Jewellery', labelHi: 'गहने', costType: 'fixed' },
  makeup: { label: 'Makeup and hair', labelHi: 'मेकअप और हेयर', costType: 'fixed' },
  mehendi: { label: 'Mehendi', labelHi: 'मेहंदी', costType: 'fixed' },
  entertainment: { label: 'Music and entertainment', labelHi: 'मनोरंजन', costType: 'fixed' },
  invites: { label: 'Invitations', labelHi: 'निमंत्रण', costType: 'per-guest' },
  gifts: { label: 'Return gifts and favours', labelHi: 'उपहार', costType: 'per-guest' },
  transport: { label: 'Guest transport', labelHi: 'यातायात', costType: 'per-guest' },
  accommodation: { label: 'Guest rooms', labelHi: 'ठहरने की व्यवस्था', costType: 'per-guest' },
  rituals: { label: 'Priest and rituals', labelHi: 'पंडित और रस्में', costType: 'fixed' },
  sound_light: { label: 'Sound, light and power', labelHi: 'साउंड और लाइट', costType: 'fixed' },
  safety_medical: {
    label: 'Permits, safety and first aid',
    labelHi: 'अनुमति और सुरक्षा',
    costType: 'fixed',
  },
  cultural_prizes: {
    label: 'Performances and prizes',
    labelHi: 'कार्यक्रम और पुरस्कार',
    costType: 'fixed',
  },
  promotion: { label: 'Promotion and printing', labelHi: 'प्रचार और छपाई', costType: 'fixed' },
  volunteers_sanitation: {
    label: 'Volunteers, sanitation and waste',
    labelHi: 'स्वयंसेवक और सफ़ाई',
    costType: 'mixed',
  },
  planner: { label: 'Planner fee', labelHi: 'प्लानर शुल्क', costType: 'fixed' },
  contingency: { label: 'Contingency', labelHi: 'आकस्मिक निधि', costType: 'mixed' },
};

/**
 * Categories a user may rank in their top three or pick to cut (BUD-05). Contingency is
 * excluded because it is a floor, not a preference; planner and jewellery are opt-in toggles.
 */
export const RANKABLE_CATEGORIES = [
  'venue',
  'catering',
  'decor',
  'photo_video',
  'attire',
  'makeup',
  'mehendi',
  'entertainment',
  'invites',
  'gifts',
  'transport',
  'accommodation',
  'rituals',
  'sound_light',
  'safety_medical',
  'cultural_prizes',
  'promotion',
  'volunteers_sanitation',
] as const;

export type RankableCategory = (typeof RANKABLE_CATEGORIES)[number];
