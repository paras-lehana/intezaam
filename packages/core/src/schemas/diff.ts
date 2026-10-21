/**
 * PlanDiff and PlanFact — what changed between two plans, and the numbered facts AI
 * prompts cite.
 *
 * Responsibility: the what-if diff (verdict moves, budget line deltas, new and cleared
 * risks, task and vendor changes, the cheapest fix) and the plan-fact shape that grounds
 * GenAI jobs 2 and 5. Boundary: shapes only; `diffPlans` and `summarisePlanFacts` live
 * in the engine.
 */
import { z } from 'zod';
import { BUDGET_CATEGORIES } from '../domain/budget-categories.js';
import { PLAN_SECTIONS } from '../domain/ideas.js';
import { LEVER_IDS } from '../domain/levers.js';
import { VENDOR_TYPES } from '../domain/vendors.js';
import {
  idSchema,
  inrSchema,
  isoDateSchema,
  labelSchema,
  lineSchema,
  signedInrSchema,
} from './common.js';
import { MAX_RISKS, MAX_TASKS, MAX_VENDORS } from './limits.js';
import { FUNDING_STATUSES, MONEY_STATUSES, TIME_STATUSES } from './plan-money.js';
import { RISK_SEVERITIES } from './plan-safety.js';
import { TASK_STATUSES } from './plan-time.js';

const riskRefSchema = z.strictObject({
  id: idSchema,
  title: labelSchema,
  severity: z.enum(RISK_SEVERITIES),
});

export const TASK_CHANGES = ['added', 'removed', 'status', 'due'] as const;

export const planDiffSchema = z.strictObject({
  verdictChanged: z.boolean(),
  money: z.strictObject({ before: z.enum(MONEY_STATUSES), after: z.enum(MONEY_STATUSES) }),
  time: z.strictObject({ before: z.enum(TIME_STATUSES), after: z.enum(TIME_STATUSES) }),
  funding: z
    .strictObject({
      before: z.enum(FUNDING_STATUSES).optional(),
      after: z.enum(FUNDING_STATUSES).optional(),
    })
    .optional(),
  totalDeltaInr: signedInrSchema,
  budgetChanges: z
    .array(
      z.strictObject({
        category: z.enum(BUDGET_CATEGORIES),
        beforeInr: inrSchema,
        afterInr: inrSchema,
        deltaInr: signedInrSchema,
      }),
    )
    .max(BUDGET_CATEGORIES.length),
  newRisks: z.array(riskRefSchema).max(MAX_RISKS),
  resolvedRisks: z.array(riskRefSchema).max(MAX_RISKS),
  taskChanges: z
    .array(
      z.strictObject({
        id: idSchema,
        title: labelSchema,
        change: z.enum(TASK_CHANGES),
        beforeStatus: z.enum(TASK_STATUSES).optional(),
        afterStatus: z.enum(TASK_STATUSES).optional(),
        beforeDueIso: isoDateSchema.optional(),
        afterDueIso: isoDateSchema.optional(),
      }),
    )
    .max(MAX_TASKS * 2),
  vendorChanges: z
    .array(
      z.strictObject({ vendorType: z.enum(VENDOR_TYPES), change: z.enum(['added', 'removed']) }),
    )
    .max(MAX_VENDORS),
  /** The lever in the new plan that saves the most, if any. */
  cheapestFix: z
    .strictObject({ leverId: z.enum(LEVER_IDS), title: labelSchema, savingInr: inrSchema })
    .optional(),
});

export type PlanDiff = z.infer<typeof planDiffSchema>;

/** One numbered fact from a plan; prompts cite these ids and answers ground on them. */
export const planFactSchema = z.strictObject({
  id: idSchema,
  section: z.enum(PLAN_SECTIONS),
  text: lineSchema,
});

export type PlanFact = z.infer<typeof planFactSchema>;
