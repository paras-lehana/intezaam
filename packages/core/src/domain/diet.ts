/**
 * Diet profiles and caterer rules (DIET-01…04).
 *
 * Responsibility: the menu profiles the user picks (and what each does to the per-plate
 * price) plus the checklist rules a caterer must follow for Jain, halal, satvik,
 * gurdwara, alcohol-free and kids/elderly guests (04 §8.7). Boundary: rules as text for
 * checklists; the engines decide when each applies.
 */
import type { RuleId } from './rule-ids.js';
import type { SourceId } from './sources.js';
import type { Confidence } from './source-types.js';

/** The main menu. Jain guests and halal needs are separate flags on the context. */
export const DIET_PROFILES = ['veg', 'jain', 'mixed', 'non-veg'] as const;

export type DietProfile = (typeof DIET_PROFILES)[number];

export interface DietProfileInfo {
  readonly label: string;
  readonly labelHi: string;
  /** True when plates are priced at the non-veg rate (veg × NONVEG_MULTIPLIER, CST-01). */
  readonly nonVegPricing: boolean;
}

export const DIET_PROFILE_INFO: Readonly<Record<DietProfile, DietProfileInfo>> = {
  veg: { label: 'Vegetarian', labelHi: 'शाकाहारी', nonVegPricing: false },
  jain: { label: 'Jain', labelHi: 'जैन', nonVegPricing: false },
  mixed: { label: 'Veg and non-veg', labelHi: 'शाकाहारी और मांसाहारी', nonVegPricing: true },
  'non-veg': { label: 'Mostly non-veg', labelHi: 'मांसाहारी', nonVegPricing: true },
};

export const DIET_RULE_KEYS = [
  'jain',
  'halal',
  'veg-satvik',
  'gurdwara',
  'no-alcohol',
  'kids-elderly',
] as const;

export type DietRuleKey = (typeof DIET_RULE_KEYS)[number];

export interface DietRule {
  readonly ruleId: RuleId;
  readonly title: string;
  readonly items: readonly string[];
  readonly sourceId: SourceId;
  readonly confidence: Confidence;
}

export const DIET_RULES: Readonly<Record<DietRuleKey, DietRule>> = {
  jain: {
    ruleId: 'DIET-01',
    title: 'Jain counter',
    items: [
      'No meat, fish, eggs, honey, mushrooms or yeast.',
      'No root vegetables: potato, onion, garlic, carrot or lotus stem.',
      'Serve the Jain meal before sunset (chauvihar).',
      'Keep a separate counter and utensils; curd set the same day.',
    ],
    sourceId: 'S-WIKI-JAIN-DIET',
    confidence: 'B',
  },
  halal: {
    ruleId: 'DIET-02',
    title: 'Halal catering',
    items: [
      'Meat must be halal for Muslim guests; mandatory for Nikah and Walima catering.',
      'Ask the caterer for a halal certificate.',
    ],
    sourceId: 'S-WIKI-HALAL',
    confidence: 'B',
  },
  'veg-satvik': {
    ruleId: 'DIET-03',
    title: 'Vegetarian and satvik',
    items: [
      'Separate veg and non-veg counters, serving staff and utensils.',
      'Offer a no-onion, no-garlic option for satvik guests (it may cost slightly more).',
    ],
    sourceId: 'S-VKPLATE-2026',
    confidence: 'C',
  },
  gurdwara: {
    ruleId: 'DIET-04',
    title: 'Food at the gurdwara',
    items: ['Plan vegetarian food at the gurdwara, in keeping with langar practice (verify).'],
    sourceId: 'S-INTEZAAM-D',
    confidence: 'D',
  },
  'no-alcohol': {
    ruleId: 'DIET-01',
    title: 'Alcohol-free',
    items: ['Jain and many religious events serve no alcohol; plan a mocktail counter.'],
    sourceId: 'S-WIKI-JAIN-DIET',
    confidence: 'B',
  },
  'kids-elderly': {
    ruleId: 'DIET-03',
    title: 'Children and elders',
    items: [
      'Keep mild, low-spice and soft options.',
      'Label common allergens: nuts, dairy and gluten.',
    ],
    sourceId: 'S-INTEZAAM-D',
    confidence: 'D',
  },
};
