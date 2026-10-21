/**
 * RULES — documentation for every rule id, in one table.
 *
 * Responsibility: merge the grouped rule tables into `RULES: Record<RuleId, RuleInfo>`,
 * so a rule id without documentation is a compile error, and expose a lookup the trace
 * builder uses. Boundary: documentation only; the logic lives in the engines.
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

/** Rules whose logic is our own assumption; the UI labels their outputs "assumption". */
const ASSUMPTION_GRADE = 'D';

/**
 * True when a rule's logic is an assumption (grade D) rather than a published rule.
 * @example
 * isAssumptionRule('VEN-04'); // true
 * isAssumptionRule('PERM-02'); // false
 */
export function isAssumptionRule(id: RuleId): boolean {
  return RULES[id].confidence === ASSUMPTION_GRADE;
}
