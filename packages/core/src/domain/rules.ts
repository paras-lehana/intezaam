/**
 * RULES — documentation for every rule id, in one table.
 *
 * Responsibility: merge the grouped rule tables into `RULES: Record<RuleId, RuleInfo>`,
 * so a rule id without documentation is a compile error; the trace builder reads each
 * rule's title, summary, grade and sources from it. Boundary: documentation only; the
 * logic lives in the engines.
 */
import type { RuleId } from './rule-ids.js';
import type { RuleInfo } from './rule-info.js';
import { CONTEXT_BUDGET_RULES } from './rules-context-budget.js';
import { DECISION_TIME_RULES } from './rules-decision-time.js';
import { SAFETY_COMMUNITY_RULES } from './rules-safety-community.js';
import { VENDOR_PEOPLE_RULES } from './rules-vendor-people.js';

export const RULES: Readonly<Record<RuleId, RuleInfo>> = {
  ...CONTEXT_BUDGET_RULES,
  ...DECISION_TIME_RULES,
  ...VENDOR_PEOPLE_RULES,
  ...SAFETY_COMMUNITY_RULES,
};
