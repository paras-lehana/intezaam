/**
 * Rule documentation, part 1: classifiers (CTX), budget split (BUD) and cost (CST).
 *
 * Responsibility: the title, summary, grade and sources of each rule in synthesis
 * §4.3–4.4, shown in every "Why this?" disclosure. Summaries that quote a number read it
 * from its domain table, so the text cannot drift from what the engine prices with.
 * Boundary: documentation only; the logic lives in the engines that cite these ids.
 */
import { SERVICE_CHARGE_PCT } from './catering.js';
import type { RuleInfo } from './rule-info.js';
import { ruleInfo } from './rule-info.js';
import type { ContextBudgetRuleId } from './rule-ids.js';
import { OFF_PEAK_SAVING_PCT } from './seasons.js';

export const CONTEXT_BUDGET_RULES: Readonly<Record<ContextBudgetRuleId, RuleInfo>> = {
  'CTX-01': ruleInfo(
    'Event family',
    'Taken from the form, or from brief keywords such as roka, mundan or katha.',
    'D',
    ['S-OWNER-DEFAULTS'],
  ),
  'CTX-02': ruleInfo(
    'City tier and anchor',
    'The city gazetteer gives the tier; a published city figure overrides the tier when one exists.',
    'C',
    ['S-RSA-2026', 'S-VK-2026', 'S-INTEZAAM-D'],
  ),
  'CTX-03': ruleInfo(
    'Scale band',
    'Under 100 guests is intimate, 100–300 is mid-size and over 300 is large.',
    'D',
    ['S-VK-2026'],
  ),
  'CTX-04': ruleInfo(
    'Season and weekday',
    'November–February is peak season, July–September is off-peak and Monday–Thursday counts as a weekday.',
    'C',
    ['S-WMG-2025', 'S-CAIT-2025', 'S-RSA-2026'],
  ),
  'CTX-05': ruleInfo(
    'Lead time',
    'Days from today to the event, with a month counted as 30.4375 days.',
    'D',
    ['S-OWNER-DEFAULTS'],
  ),
  'CTX-06': ruleInfo(
    'Crowd class',
    'Expected footfall up to 200, 201–500, 501–1,000 or over 1,000 sets the crowd-safety checks.',
    'A',
    ['S-NDMA-2014'],
  ),
  'CTX-07': ruleInfo(
    'Rain risk',
    "Outdoor events in the city's wet months are rain-risk: June–September everywhere, October–December too where the northeast monsoon reaches (Tamil Nadu, Puducherry, Kerala, Andhra Pradesh, south interior Karnataka), and October in Bengaluru.",
    'A',
    ['S-IMD-2020', 'S-IMD-NEM-2026', 'S-TRIBUNE-2025', 'S-CITIZENMATTERS-2016'],
  ),
  'CTX-08': ruleInfo(
    'Calendar rules apply by tradition',
    'Muhurat, Chaturmas and Kharmas apply to Hindu traditions only, never to a Nikah or a church wedding.',
    'B',
    ['S-WIKI-ICMA', 'S-WIKI-CHATURMAS'],
  ),
  'BUD-01': ruleInfo(
    'Base split',
    'Each event family starts from a published split of the budget across categories, in basis points.',
    'C',
    ['S-WP-2026', 'S-VK-2026', 'S-IMW-2026', 'S-CHOCOCRAFT-2025', 'S-NOBROKERHOOD-ND'],
  ),
  'BUD-02': ruleInfo(
    'Scale shift',
    'Small weddings move share from catering and venue to photos and outfits; large weddings the reverse.',
    'D',
    ['S-VK-2026', 'S-INTEZAAM-D'],
  ),
  'BUD-03': ruleInfo(
    'Destination shift',
    'A destination wedding moves 8 points from decor and guest rooms into the venue and travel.',
    'D',
    ['S-WP-2026', 'S-INTEZAAM-D'],
  ),
  'BUD-04': ruleInfo(
    'Outstation guests',
    'When most guests travel in, guest rooms rise to 8–10% of the budget.',
    'C',
    ['S-WP-2026'],
  ),
  'BUD-05': ruleInfo(
    'Your priorities',
    'Each of your top three categories gains 3 points, taken first from the category you chose to cut.',
    'D',
    ['S-INTEZAAM-D'],
  ),
  'BUD-06': ruleInfo(
    'Optional lines',
    'Switched-off categories are spread pro rata; jewellery takes 15% of the total and a planner 5–10%.',
    'B',
    ['S-CAIT-2025', 'S-VK-2026'],
  ),
  'BUD-07': ruleInfo(
    'Contingency floor',
    'The buffer never falls below 8% for weddings, 10% for parties and community events, and never to 0.',
    'C',
    ['S-WP-2026', 'S-CHARMBOX-2026', 'S-VK-2026'],
  ),
  'BUD-08': ruleInfo(
    'Party at home',
    'A birthday at home keeps 5% for the venue and spreads the rest pro rata.',
    'D',
    ['S-INTEZAAM-D'],
  ),
  'BUD-09': ruleInfo(
    'Exact rupees',
    'Shares are rounded down to whole rupees and the remainder goes to contingency, so lines add up exactly.',
    'D',
    ['S-OWNER-DEFAULTS'],
  ),
  'CST-01': ruleInfo(
    'Per-plate price',
    'Veg plates cost ₹1,200–1,800 in metros, ₹800–1,200 in tier-2 and ₹500–800 in tier-3 cities; non-veg is 1.35 times veg.',
    'C',
    ['S-RSA-2026', 'S-VKPLATE-2026'],
  ),
  'CST-02': ruleInfo(
    'Service charge on plates',
    `Caterers add a service charge of ${SERVICE_CHARGE_PCT.community}% (community), ${SERVICE_CHARGE_PCT.standard}% (standard) or ${SERVICE_CHARGE_PCT.premium}% (premium) to the plate price; GST is added once, under CST-06.`,
    'C',
    ['S-VKPLATE-2026'],
  ),
  'CST-03': ruleInfo(
    'Off-peak saving',
    `Off-peak or weekday dates take ${OFF_PEAK_SAVING_PCT.min}% off venue, catering and decor.`,
    'C',
    ['S-RSA-2026'],
  ),
  'CST-04': ruleInfo(
    'Meal per function',
    'Lunch or dinner is priced per plate, hi-tea at ₹400–1,200 and late snacks at ₹200–600 a head.',
    'C',
    ['S-VKPLATE-2026', 'S-RSA-2026'],
  ),
  'CST-05': ruleInfo(
    'Guest rooms',
    'Outstation guests share rooms two to a room at an assumed nightly rate, plus 5% GST up to ₹7,500 a room.',
    'D',
    ['S-OWNER-DEFAULTS', 'S-HNA-2025'],
  ),
  'CST-06': ruleInfo(
    'GST',
    'Default rates since 22 Sep 2025: catering 5%, venue, decor, photo and entertainment 18%, makeup 5%; depends on the contract.',
    'B',
    ['S-CBIC-2025', 'S-HNA-2025', 'S-TAXGARDEN-2026'],
  ),
};
