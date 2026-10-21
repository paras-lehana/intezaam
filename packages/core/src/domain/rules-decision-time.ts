/**
 * Rule documentation, part 2: verdict (VER), levers (LEV), timeline (TL), dates (DATE)
 * and functions (FN).
 *
 * Responsibility: the title, summary, grade and sources of each rule in synthesis
 * §4.5–4.6. Summaries that quote a number read it from its domain table, so the text and
 * the engines cannot drift apart. Boundary: documentation only; the logic lives in the engines.
 */
import type { RuleInfo } from './rule-info.js';
import { ruleInfo } from './rule-info.js';
import type { DecisionTimeRuleId } from './rule-ids.js';
import { OFF_PEAK_SAVING_PCT, PEAK_BOOKING_LEAD_MONTHS } from './seasons.js';
import { rangeText } from './units.js';

export const DECISION_TIME_RULES: Readonly<Record<DecisionTimeRuleId, RuleInfo>> = {
  'VER-M': ruleInfo(
    'Money verdict',
    'Budget per guest against the city or tier band: below the budget band is Stretch, then Lean, Balanced or Premium.',
    'C',
    ['S-VK-2026', 'S-CHARMBOX-2026', 'S-INTEZAAM-D'],
  ),
  'VER-F': ruleInfo(
    'Funding verdict',
    'Planned spend minus contributions, sponsors and the RWA fund: Funded, a gap or a surplus.',
    'D',
    ['S-NOBROKERHOOD-ND'],
  ),
  'VER-T': ruleInfo(
    'Time verdict',
    'On track when every core task fits its lead time, Compressed when some do not, Critical below the minimum workable lead.',
    'D',
    ['S-IMW-2026', 'S-BMC-2026', 'S-INTEZAAM-D'],
  ),
  'LEV-01': ruleInfo(
    'Fewer guests',
    'Cutting guests to what the budget covers saves their plates, favours and transport.',
    'C',
    ['S-VK-2026', 'S-RSA-2026'],
  ),
  'LEV-02': ruleInfo(
    'Off-peak or weekday date',
    `An off-peak or weekday date saves ${rangeText(OFF_PEAK_SAVING_PCT)}% on venue, catering and decor.`,
    'C',
    ['S-RSA-2026', 'S-ZOLA-ND'],
  ),
  'LEV-03': ruleInfo(
    'Simpler catering',
    'Moving from a hotel in-house menu to a standard multi-cuisine caterer lowers the per-plate band.',
    'C',
    ['S-VKPLATE-2026'],
  ),
  'LEV-04': ruleInfo(
    'Drop or merge a function',
    "Removes that function's meal and its share of fixed costs.",
    'D',
    ['S-INTEZAAM-D'],
  ),
  'LEV-05': ruleInfo(
    'Hometown instead of destination',
    'Reverses the destination shift in the budget split.',
    'D',
    ['S-WP-2026'],
  ),
  'LEV-06': ruleInfo(
    'Smaller party',
    'A party at home, a cap on the number of children or DIY decor.',
    'C',
    ['S-CHARMBOX-2026'],
  ),
  'LEV-07': ruleInfo(
    'Close the funding gap',
    'Sponsors needed for the gap, a tiered contribution, or a smaller cultural programme.',
    'D',
    ['S-NOBROKERHOOD-ND'],
  ),
  'TL-01': ruleInfo(
    'Task templates',
    'Each event family has its own task list with published booking lead times.',
    'C',
    ['S-IMW-2026', 'S-MANYAVAR-2024', 'S-CHARMBOX-2026', 'S-BEVY-ND'],
  ),
  'TL-02': ruleInfo('Due dates', 'Each task is due its lead time before the event date.', 'D', [
    'S-OWNER-DEFAULTS',
  ]),
  'TL-03': ruleInfo(
    'Compressed timeline',
    'Overdue tasks become urgent, longest lead first, packed into the days left in 1–3-day steps.',
    'D',
    ['S-OWNER-DEFAULTS', 'S-IMW-2026'],
  ),
  'TL-04': ruleInfo(
    'Too late for this task',
    'A task with a minimum lead (custom outfits need two months) is swapped for a fallback when time is short.',
    'D',
    ['S-OWNER-DEFAULTS'],
  ),
  'TL-05': ruleInfo(
    'Date not fixed',
    'Tasks stay undated and "Choose your date" comes first.',
    'D',
    ['S-OWNER-DEFAULTS'],
  ),
  'TL-06': ruleInfo(
    'Re-planning',
    'Tasks you have finished are never moved when the plan changes.',
    'D',
    ['S-OWNER-DEFAULTS'],
  ),
  'TL-07': ruleInfo(
    'Dependencies',
    'Budget, then venue, then date-bound vendors, then invitations, then counts and seating.',
    'C',
    ['S-MANYAVAR-2024', 'S-INTEZAAM-D'],
  ),
  'TL-08': ruleInfo(
    'Buffers',
    'Final fitting at least 30 days out, vendor reconfirmation at 30 and 7 days, final headcount at 7 days.',
    'C',
    ['S-MANYAVAR-2024', 'S-OWNER-DEFAULTS'],
  ),
  'TL-09': ruleInfo(
    'Tradition tasks',
    'Muhurat from your priest, Nikah paperwork, church banns, gurdwara booking, 60th-birthday priest.',
    'B',
    ['S-WIKI-NIKAH', 'S-WIKI-BANNS', 'S-WIKI-ANAND-KARAJ', 'S-WIKI-SHASHTHIPURTI'],
  ),
  'TL-10': ruleInfo(
    'Community permissions timeline',
    'Pandal permission with the police and traffic NOC (BMC 2026 pattern: applications open 31 days before the festival, close the day before, valid until the day after it ends); procession separately; fire clearance before the structure.',
    'B',
    ['S-BMC-2026', 'S-IMMERSION-2026', 'S-MONEYLIFE-2017'],
  ),
  'TL-11': ruleInfo(
    'After the event',
    'Thank-yous, final payments, budget against actual and accounts for contributors.',
    'C',
    ['S-GIFTLIST-ND', 'S-BEVY-ND'],
  ),
  'DATE-01': ruleInfo(
    'Peak season',
    `November–February dates fill ${rangeText(PEAK_BOOKING_LEAD_MONTHS)} months ahead.`,
    'C',
    ['S-IMW-2026', 'S-WMG-2025'],
  ),
  'DATE-02': ruleInfo(
    'Muhurat dates (indicative)',
    'Curated November–December 2026 dates with their sources; always confirm with your pandit.',
    'C',
    ['S-AZA-MUHURAT-2026', 'S-WEDFOCUS-2026'],
  ),
  'DATE-03': ruleInfo(
    'Chaturmas and Kharmas',
    'Hindu weddings pause from late July to about 20 November 2026 and in the Kharmas months; practice varies by region.',
    'C',
    ['S-SMARTPUJA-2026', 'S-SMARTPUJA-KHARMAS-2026', 'S-WIKI-CHATURMAS'],
  ),
  'DATE-04': ruleInfo(
    'Other faiths',
    'Muhurat rules are off; a church wedding is held between 6 am and 7 pm unless special permission is given.',
    'B',
    ['S-WIKI-ICMA'],
  ),
  'DATE-05': ruleInfo(
    'Festival clash',
    'Within a day of a major festival, vendors are scarcer and dearer.',
    'D',
    ['S-WIKI-DIWALI', 'S-DRIK-2027', 'S-INTEZAAM-D'],
  ),
  'FN-01': ruleInfo(
    'Function sequence',
    'Your tradition sets the functions, their day offsets and default start times.',
    'B',
    ['S-WIKI-HINDU-WEDDING', 'S-WIKI-TELUGU', 'S-OWNER-DEFAULTS'],
  ),
  'FN-02': ruleInfo(
    'Budget per function',
    "Per-guest lines follow each function's guest count; fixed lines follow function weights.",
    'D',
    ['S-INTEZAAM-D'],
  ),
  'FN-03': ruleInfo(
    'Run sheet',
    'Vendors arrive ahead of the start: decor 3 hours, makeup 2.5 hours, catering 1.5 hours, music 1 hour.',
    'D',
    ['S-OWNER-DEFAULTS'],
  ),
  'FN-04': ruleInfo(
    'Rest day',
    'Keep at least one rest day between a late sangeet and an early-morning muhurat.',
    'D',
    ['S-INTEZAAM-D'],
  ),
};
