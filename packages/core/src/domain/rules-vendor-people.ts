/**
 * Rule documentation, part 3: vendors (VEN), headcount (HC), food, space, diet and
 * accessibility (ACC).
 *
 * Responsibility: the title, summary, grade and sources of each VEN, HC, FOOD, SPACE,
 * DIET and ACC rule. Summaries that quote a number read it from its domain table. Boundary:
 * documentation only; the logic lives in the engines.
 */
import {
  COOK_FOR_FACTOR,
  PARENTS_MISSING_RSVPS_PCT,
  PLATE_GUARANTEE_FACTOR,
  RETURN_GIFT_BUFFER_PCT,
  WASTE_WARNING_FACTOR,
  WEDDING_FOOD_WASTE_PCT,
} from './headcount.js';
import type { RuleInfo } from './rule-info.js';
import { ruleInfo } from './rule-info.js';
import type { VendorPeopleRuleId } from './rule-ids.js';
import { factorAsPercent, rangeText } from './units.js';
import { OBSERVED_ADVANCE_PCT } from './vendor-playbook.js';

export const VENDOR_PEOPLE_RULES: Readonly<Record<VendorPeopleRuleId, RuleInfo>> = {
  'VEN-01': ruleInfo(
    'Vendors you need',
    'Your event family, functions, tradition and choices decide the vendor list, ordered by how often families book each.',
    'B',
    ['S-WWI-2021', 'S-INTEZAAM-D'],
  ),
  'VEN-02': ruleInfo(
    'Book-by date',
    "Each vendor's book-by date comes from its lead time before your event.",
    'C',
    ['S-IMW-2026', 'S-MANYAVAR-2024'],
  ),
  'VEN-03': ruleInfo(
    'Vendor playbook',
    'Questions to ask, what to get in writing and red flags for each vendor type.',
    'C',
    ['S-VKPLATE-2026', 'S-RSA-2026', 'S-NOISE-RULE5-ND', 'S-INTEZAAM-D'],
  ),
  'VEN-04': ruleInfo(
    'Payment milestones',
    `No industry standard exists (listings ask ${rangeText(OBSERVED_ADVANCE_PCT)}% up front); we assume 30% on booking, 40% a month before and 30% on delivery.`,
    'D',
    ['S-VENDOR-ADVANCE-2026', 'S-LAWRATO-ND'],
  ),
  'VEN-05': ruleInfo(
    'No vendor names',
    'Vendors are found through map searches you run yourself; we never list or rank businesses.',
    'D',
    ['S-INTEZAAM-D'],
  ),
  'HC-01': ruleInfo(
    'Expected guests',
    'About 80% of invited guests attend in town and 65% at a destination; you can change both.',
    'D',
    ['S-WW-ATTENDANCE-ND'],
  ),
  'HC-02': ruleInfo(
    'Plates',
    `Guarantee ${factorAsPercent(PLATE_GUARANTEE_FACTOR)}% of expected plates and cook for ${factorAsPercent(COOK_FOR_FACTOR)}%; above ${factorAsPercent(WASTE_WARNING_FACTOR)}% expect waste, as ${rangeText(WEDDING_FOOD_WASTE_PCT)}% of wedding food is already thrown away.`,
    'C',
    ['S-HASSANCHEF-2026', 'S-DTE-2018'],
  ),
  'HC-03': ruleInfo(
    "Kids' party counts",
    `Order ${rangeText(RETURN_GIFT_BUFFER_PCT)}% more return gifts than confirmed children; in one poll ${PARENTS_MISSING_RSVPS_PCT}% of hosts did not hear back from every guest.`,
    'C',
    ['S-CHARMBOX-2026', 'S-QUIRKS-ND'],
  ),
  'FOOD-01': ruleInfo(
    'Food quantity',
    '600–750 g of food per adult per sitting; children eat about half.',
    'C',
    ['S-HASSANCHEF-2026'],
  ),
  'SPACE-01': ruleInfo(
    'Venue capacity',
    'Capacity is 85% of the floor area divided by the space each guest needs for the layout.',
    'C',
    ['S-ARABIA-ND', 'S-SOCIALTABLES-ND'],
  ),
  'DIET-01': ruleInfo(
    'Jain food',
    'No meat, eggs, root vegetables, honey or mushrooms; a separate counter; served before sunset; no alcohol.',
    'B',
    ['S-WIKI-JAIN-DIET'],
  ),
  'DIET-02': ruleInfo(
    'Halal food',
    'Mandatory for Nikah and Walima catering; ask the caterer for certification.',
    'B',
    ['S-WIKI-HALAL'],
  ),
  'DIET-03': ruleInfo(
    'Vegetarian and satvik',
    'Separate counters, staff and utensils, with a no-onion, no-garlic option.',
    'C',
    ['S-VKPLATE-2026'],
  ),
  'DIET-04': ruleInfo(
    'Gurdwara food',
    'Plan vegetarian food at the gurdwara (langar practice; verify).',
    'D',
    ['S-INTEZAAM-D'],
  ),
  'ACC-01': ruleInfo(
    'Ramps',
    'Ramp gradient 1:12 for runs up to about 6 m, clear width 1,200 mm.',
    'A',
    ['S-GKTODAY-2021'],
  ),
  'ACC-02': ruleInfo(
    'Accessible toilet',
    'At least one accessible toilet on the ground floor.',
    'A',
    ['S-SCPD-2025'],
  ),
  'ACC-03': ruleInfo('Step-free route', 'A step-free route from drop-off to seating.', 'D', [
    'S-INTEZAAM-D',
  ]),
  'ACC-04': ruleInfo(
    'Seating for elders',
    'Reserved seats near the stage, exits and toilets, away from the speakers.',
    'D',
    ['S-INTEZAAM-D'],
  ),
  'ACC-05': ruleInfo('First aid', 'A first-aid post and a clear route for an ambulance.', 'A', [
    'S-NDMA-2014',
  ]),
  'ACC-06': ruleInfo(
    'Safe paths',
    'Lit paths and covered cables remove trip hazards after dark.',
    'A',
    ['S-NDMA-2014'],
  ),
};
