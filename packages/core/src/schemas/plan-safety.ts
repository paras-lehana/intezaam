/**
 * Plan contracts, part 4: permissions, crowd safety, risks and the accessibility plan
 * (synthesis §3 H–I, §4.7–4.8).
 *
 * Responsibility: the wire shapes of the permissions checklist, the NDMA crowd checks,
 * the risk radar (severity always as text) and the accessibility and elders plan.
 * Boundary: shapes only; the engines fill them and the UI adds "verify locally".
 */
import { z } from 'zod';
import { ACCESS_ITEM_IDS, ACCESS_NEEDS } from '../domain/accessibility.js';
import { CROWD_CHECK_IDS, CROWD_CLASSES } from '../domain/crowd.js';
import { PERMISSION_IDS } from '../domain/permissions.js';
import { RULE_IDS } from '../domain/rule-ids.js';
import { countSchema, idSchema, labelSchema, lineSchema, traceIdsSchema } from './common.js';
import { MAX_TRACE_SOURCES } from './limits.js';
import { sourceIdSchema } from './trace.js';

export const permissionSchema = z.strictObject({
  id: z.enum(PERMISSION_IDS),
  ruleId: z.enum(RULE_IDS),
  title: labelSchema,
  authority: lineSchema,
  when: lineSchema,
  /** True when this event needs it; false items are shown as "check if this applies". */
  required: z.boolean(),
  /** True when the plan as described breaks a grade-A rule (e.g. PERM-02). */
  blocker: z.boolean(),
  note: lineSchema,
  sourceIds: z.array(sourceIdSchema).max(MAX_TRACE_SOURCES),
  traceIds: traceIdsSchema,
});

export type Permission = z.infer<typeof permissionSchema>;

export const crowdPlanSchema = z.strictObject({
  footfall: countSchema,
  crowdClass: z.enum(CROWD_CLASSES),
  checks: z
    .array(
      z.strictObject({
        id: z.enum(CROWD_CHECK_IDS),
        ruleId: z.enum(RULE_IDS),
        title: labelSchema,
      }),
    )
    .max(CROWD_CHECK_IDS.length),
  traceIds: traceIdsSchema,
});

export type CrowdPlan = z.infer<typeof crowdPlanSchema>;

/**
 * RISK ladder: blocker = a grade-A rule is broken · high = critical time, stretch money,
 * capacity exceeded, uncovered rain risk · medium = peak pressure, thin contingency,
 * missing Jain sunset plan · info = everything else.
 */
export const RISK_SEVERITIES = ['blocker', 'high', 'medium', 'info'] as const;

export type RiskSeverity = (typeof RISK_SEVERITIES)[number];

export const riskSchema = z.strictObject({
  id: idSchema,
  ruleId: z.enum(RULE_IDS),
  severity: z.enum(RISK_SEVERITIES),
  title: labelSchema,
  /** The cause, in context terms. */
  detail: lineSchema,
  fix: lineSchema,
  traceIds: traceIdsSchema,
});

export type Risk = z.infer<typeof riskSchema>;

export const accessibilityPlanSchema = z.strictObject({
  needs: z.array(z.enum(ACCESS_NEEDS)).max(ACCESS_NEEDS.length),
  items: z
    .array(
      z.strictObject({
        id: z.enum(ACCESS_ITEM_IDS),
        ruleId: z.enum(RULE_IDS),
        title: labelSchema,
        detail: lineSchema,
      }),
    )
    .max(ACCESS_ITEM_IDS.length),
  traceIds: traceIdsSchema,
});

export type AccessibilityPlan = z.infer<typeof accessibilityPlanSchema>;
