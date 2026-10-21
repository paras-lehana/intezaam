/**
 * Levers (LEV-01…07) — the costed changes offered when money or funding is short.
 *
 * Responsibility: the closed list of levers, the rule each one implements and its label.
 * Boundary: vocabulary; the verdict engine prices each lever by re-running the plan.
 */
import type { RuleId } from './rule-ids.js';

export const LEVER_IDS = [
  'fewer-guests',
  'off-peak-date',
  'simpler-catering',
  'drop-function',
  'hometown',
  'home-party',
  'fewer-children',
  'diy-decor',
  'find-sponsors',
  'tiered-contribution',
  'trim-programme',
] as const;

export type LeverId = (typeof LEVER_IDS)[number];

export interface LeverInfo {
  readonly ruleId: RuleId;
  readonly label: string;
}

export const LEVERS: Readonly<Record<LeverId, LeverInfo>> = {
  'fewer-guests': { ruleId: 'LEV-01', label: 'Invite fewer guests' },
  'off-peak-date': { ruleId: 'LEV-02', label: 'Move to an off-peak or weekday date' },
  'simpler-catering': { ruleId: 'LEV-03', label: 'Choose a standard multi-cuisine caterer' },
  'drop-function': { ruleId: 'LEV-04', label: 'Drop or merge a function' },
  hometown: { ruleId: 'LEV-05', label: 'Hold it in your hometown' },
  'home-party': { ruleId: 'LEV-06', label: 'Have the party at home' },
  'fewer-children': { ruleId: 'LEV-06', label: 'Cap the number of children' },
  'diy-decor': { ruleId: 'LEV-06', label: 'Do the decor yourselves' },
  'find-sponsors': { ruleId: 'LEV-07', label: 'Find local sponsors' },
  'tiered-contribution': { ruleId: 'LEV-07', label: 'Ask larger flats to give more' },
  'trim-programme': { ruleId: 'LEV-07', label: 'Trim the cultural programme' },
};

/** Ranking: the top three levers by rupees saved are shown. */
export const LEVERS_SHOWN = 3;
