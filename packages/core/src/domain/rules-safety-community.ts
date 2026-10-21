/**
 * Rule documentation, part 4: permissions (PERM), crowd safety (CROWD), community money
 * (COM), the risk severity ladder (RISK) and the readiness score (READY-01).
 *
 * Responsibility: the title, summary, grade and sources of each rule in synthesis §4.8.
 * Boundary: documentation only; every permission says "verify locally" in the UI.
 */
import type { RuleInfo } from './rule-info.js';
import { ruleInfo } from './rule-info.js';
import type { SafetyCommunityRuleId } from './rule-ids.js';

export const SAFETY_COMMUNITY_RULES: Readonly<Record<SafetyCommunityRuleId, RuleInfo>> = {
  'PERM-01': ruleInfo(
    'Loudspeaker permission',
    'Any amplified sound in the open needs written permission from the designated authority.',
    'A',
    ['S-NOISE-RULE5-ND'],
  ),
  'PERM-02': ruleInfo(
    'Night sound ban',
    'Outdoor amplified sound is not allowed from 10 pm to 6 am; a state festival exemption allows up to midnight on at most 15 days a year.',
    'A',
    ['S-NOISE-RULE5-ND'],
  ),
  'PERM-03': ruleInfo(
    'Silence zone',
    'Within about 100 m of a hospital, school or court the limits are 50 dB by day and 40 dB at night (verify the radius).',
    'A',
    ['S-SILENCE-ZONE-2000', 'S-NOISE-SCHEDULE-2022'],
  ),
  'PERM-04': ruleInfo(
    'Pandal on public land',
    'Municipal permission plus a police and traffic NOC; some states run a single window.',
    'B',
    ['S-BMC-2026', 'S-SAHAJ-2026'],
  ),
  'PERM-05': ruleInfo(
    'Procession and immersion',
    'A procession or visarjan needs its own route and timing permission.',
    'C',
    ['S-IMMERSION-2026'],
  ),
  'PERM-06': ruleInfo(
    'Fire safety',
    'A pandal, stage, cooking or generator needs fire clearance, extinguishers, isolated fuel and covered cables.',
    'B',
    ['S-MONEYLIFE-2017', 'S-THEPRINT-2026', 'S-NDMA-2014'],
  ),
  'PERM-07': ruleInfo(
    'Firecrackers',
    "Delhi-NCR: green, PESO-certified crackers only. Elsewhere: reduced-emission crackers in the court's slot for the occasion. Check this year's state or district order.",
    'A',
    ['S-SCCONLINE-2018', 'S-LEAFLET-2025'],
  ),
  'PERM-08': ruleInfo(
    'Society approval',
    "An event inside a gated society needs the RWA committee's approval before funds are collected.",
    'C',
    ['S-NOBROKERHOOD-ND'],
  ),
  'CROWD-01': ruleInfo(
    'Exits and first aid',
    'Always keep exits unobstructed and a first-aid post open.',
    'A',
    ['S-NDMA-2014'],
  ),
  'CROWD-02': ruleInfo(
    'Crowd-control staff',
    'Above 200 people, visible crowd-control staff who can talk to each other and to the crowd.',
    'A',
    ['S-NDMA-2014'],
  ),
  'CROWD-03': ruleInfo(
    'Queues, PA and CCTV',
    'Above 500 people, holding areas and queues, a PA system, CCTV and a missing-children booth.',
    'A',
    ['S-NDMA-2014'],
  ),
  'CROWD-04': ruleInfo(
    'Ambulance and drill',
    'Above 1,000 people, an ambulance on standby with a clear route and a mock drill.',
    'A',
    ['S-NDMA-2014'],
  ),
  'CROWD-05': ruleInfo(
    'Food stalls',
    'Stalls on one side with a 3–4 m gap after every 5–6 stalls; licensed vendors only.',
    'A',
    ['S-NDMA-2014'],
  ),
  'COM-01': ruleInfo(
    'Flat contribution',
    'Per household = (planned spend − sponsors − RWA fund − tickets) ÷ households, rounded up.',
    'D',
    ['S-NOBROKERHOOD-ND'],
  ),
  'COM-02': ruleInfo(
    'Tiered contribution',
    'Larger flats pay more: weights 0.75, 1.0 and 1.25 by flat size, which you can edit.',
    'D',
    ['S-INTEZAAM-D'],
  ),
  'COM-03': ruleInfo(
    'Ledger',
    'Collected minus spent gives the surplus or deficit; keep a receipt for every entry.',
    'C',
    ['S-NOBROKERHOOD-ND'],
  ),
  'COM-04': ruleInfo(
    'Volunteers',
    'One crowd marshal per 100 attendees plus fixed roles for funds, food, first aid, sound and help desk.',
    'D',
    ['S-NDMA-2014', 'S-NOBROKERHOOD-ND'],
  ),
  'COM-05': ruleInfo(
    'Charity receipts',
    "Before promising tax-deductible receipts, verify the receiving trust's 80G/12A status.",
    'D',
    ['S-INTEZAAM-D'],
  ),
  RISK: ruleInfo(
    'Risk severity',
    'Blocker when a grade-A rule is broken; high, medium or info by impact. Severity is always shown in words and an icon.',
    'D',
    ['S-INTEZAAM-D'],
  ),
  'READY-01': ruleInfo(
    'Readiness score',
    'Points for core vendors booked, permissions done, contingency intact and days left, out of 100.',
    'D',
    ['S-INTEZAAM-D'],
  ),
};
