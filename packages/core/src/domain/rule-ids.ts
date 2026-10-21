/**
 * Rule ids — the closed vocabulary of every deterministic decision the planner makes.
 *
 * Responsibility: the ids from the decision-engine design (synthesis §4), grouped the
 * way the rule descriptions are grouped, so every trace item, risk and permission points
 * at exactly one documented rule. Boundary: ids only; titles, summaries and sources are
 * in rules.ts.
 */

/** CTX classifiers, BUD budget split rules and CST cost rules (synthesis §4.3–4.4). */
export const CONTEXT_BUDGET_RULE_IDS = [
  'CTX-01',
  'CTX-02',
  'CTX-03',
  'CTX-04',
  'CTX-05',
  'CTX-06',
  'CTX-07',
  'CTX-08',
  'BUD-01',
  'BUD-02',
  'BUD-03',
  'BUD-04',
  'BUD-05',
  'BUD-06',
  'BUD-07',
  'BUD-08',
  'BUD-09',
  'CST-01',
  'CST-02',
  'CST-03',
  'CST-04',
  'CST-05',
  'CST-06',
] as const;

/** VER verdict axes, LEV levers, TL timeline, DATE date intelligence, FN functions (§4.5–4.6). */
export const DECISION_TIME_RULE_IDS = [
  'VER-M',
  'VER-F',
  'VER-T',
  'LEV-01',
  'LEV-02',
  'LEV-03',
  'LEV-04',
  'LEV-05',
  'LEV-06',
  'LEV-07',
  'TL-01',
  'TL-02',
  'TL-03',
  'TL-04',
  'TL-05',
  'TL-06',
  'TL-07',
  'TL-08',
  'TL-09',
  'TL-10',
  'TL-11',
  'DATE-01',
  'DATE-02',
  'DATE-03',
  'DATE-04',
  'DATE-05',
  'FN-01',
  'FN-02',
  'FN-03',
  'FN-04',
] as const;

/** VEN vendors, HC headcount, FOOD, SPACE, DIET and ACC accessibility rules (§4.6–4.7). */
export const VENDOR_PEOPLE_RULE_IDS = [
  'VEN-01',
  'VEN-02',
  'VEN-03',
  'VEN-04',
  'VEN-05',
  'HC-01',
  'HC-02',
  'HC-03',
  'FOOD-01',
  'SPACE-01',
  'DIET-01',
  'DIET-02',
  'DIET-03',
  'DIET-04',
  'ACC-01',
  'ACC-02',
  'ACC-03',
  'ACC-04',
  'ACC-05',
  'ACC-06',
] as const;

/**
 * PERM permissions, CROWD safety, COM community money (§4.8), RISK, the severity ladder
 * named in §4.2 and §4.8, and READY-01, the readiness score of feature #9 (an addition:
 * the synthesis lists the feature but gives its rule no id).
 */
export const SAFETY_COMMUNITY_RULE_IDS = [
  'PERM-01',
  'PERM-02',
  'PERM-03',
  'PERM-04',
  'PERM-05',
  'PERM-06',
  'PERM-07',
  'PERM-08',
  'CROWD-01',
  'CROWD-02',
  'CROWD-03',
  'CROWD-04',
  'CROWD-05',
  'COM-01',
  'COM-02',
  'COM-03',
  'COM-04',
  'COM-05',
  'RISK',
  'READY-01',
] as const;

export const RULE_IDS = [
  ...CONTEXT_BUDGET_RULE_IDS,
  ...DECISION_TIME_RULE_IDS,
  ...VENDOR_PEOPLE_RULE_IDS,
  ...SAFETY_COMMUNITY_RULE_IDS,
] as const;

export type ContextBudgetRuleId = (typeof CONTEXT_BUDGET_RULE_IDS)[number];
export type DecisionTimeRuleId = (typeof DECISION_TIME_RULE_IDS)[number];
export type VendorPeopleRuleId = (typeof VENDOR_PEOPLE_RULE_IDS)[number];
export type SafetyCommunityRuleId = (typeof SAFETY_COMMUNITY_RULE_IDS)[number];
export type RuleId = (typeof RULE_IDS)[number];
