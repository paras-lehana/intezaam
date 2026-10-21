/**
 * Plan contracts, part 1: verdict, readiness, budget, cost check, GST, levers and
 * payments.
 *
 * Responsibility: the wire shapes of the money side of a plan — the two-axis verdict
 * (plus funding for community events), budget lines that always sum to the total,
 * per-function slices, the bottom-up cost check, GST, costed levers and the payment
 * calendar. Every item carries trace ids. Boundary: shapes only; engines fill them.
 */
import { z } from 'zod';
import { BUDGET_CATEGORIES, COST_TYPES } from '../domain/budget-categories.js';
import { BASIS_POINTS_TOTAL } from '../domain/budget-splits.js';
import { FUNCTION_KINDS } from '../domain/functions.js';
import { LEVER_IDS } from '../domain/levers.js';
import { RULE_IDS } from '../domain/rule-ids.js';
import { PAYMENT_DUE_RULES } from '../domain/vendor-playbook.js';
import { VENDOR_TYPES } from '../domain/vendors.js';
import {
  countSchema,
  inrEstimateSchema,
  inrRangeSchema,
  inrSchema,
  isoDateSchema,
  labelSchema,
  lineSchema,
  monthKeySchema,
  signedInrSchema,
  traceIdsSchema,
} from './common.js';
import { MAX_CASHFLOW_MONTHS, MAX_FUNCTIONS, MAX_GST_PCT, MAX_VENDORS } from './limits.js';
import { contextPatchSchema } from './patch.js';

/**
 * Money axis, cheapest first. `home-style` sits between Stretch and Lean: a wedding below
 * the published budget rows that still works with a local caterer.
 */
export const MONEY_STATUSES = ['stretch', 'home-style', 'lean', 'balanced', 'premium'] as const;
export const TIME_STATUSES = ['on-track', 'compressed', 'critical'] as const;
export const FUNDING_STATUSES = ['funded', 'gap', 'surplus'] as const;

export type MoneyStatus = (typeof MONEY_STATUSES)[number];
export type TimeStatus = (typeof TIME_STATUSES)[number];
export type FundingStatus = (typeof FUNDING_STATUSES)[number];

const PERCENT_MAX = 100;

export const verdictSchema = z.strictObject({
  money: z.strictObject({
    status: z.enum(MONEY_STATUSES),
    reason: lineSchema,
    traceIds: traceIdsSchema,
  }),
  time: z.strictObject({
    status: z.enum(TIME_STATUSES),
    reason: lineSchema,
    traceIds: traceIdsSchema,
  }),
  /** VER-F: community events only. */
  funding: z
    .strictObject({
      status: z.enum(FUNDING_STATUSES),
      gapInr: inrSchema,
      surplusInr: inrSchema,
      reason: lineSchema,
      traceIds: traceIdsSchema,
    })
    .optional(),
  headline: labelSchema,
  /** What the plan as described is likely to cost (bands or bottom-up). */
  estimateInr: inrEstimateSchema,
});

export type Verdict = z.infer<typeof verdictSchema>;

export const READINESS_FACTORS = ['core-vendors', 'permissions', 'contingency', 'time'] as const;

export const readinessSchema = z.strictObject({
  score: z.number().int().min(0).max(PERCENT_MAX),
  factors: z
    .array(
      z.strictObject({
        key: z.enum(READINESS_FACTORS),
        label: labelSchema,
        points: countSchema,
        max: countSchema,
      }),
    )
    .max(READINESS_FACTORS.length),
  traceIds: traceIdsSchema,
});

export type Readiness = z.infer<typeof readinessSchema>;

export const budgetLineSchema = z.strictObject({
  category: z.enum(BUDGET_CATEGORIES),
  label: labelSchema,
  amountInr: inrSchema,
  shareBp: z.number().int().min(0).max(BASIS_POINTS_TOTAL),
  costType: z.enum(COST_TYPES),
  perGuestInr: inrSchema.optional(),
  /** Default GST rate (CST-06); null = not researched, shown as "GST not estimated". */
  gstPct: z.number().min(0).max(MAX_GST_PCT).nullable(),
  /** True when the user ranked this category in their top three (BUD-05). */
  priority: z.boolean(),
  traceIds: traceIdsSchema,
});

export type BudgetLine = z.infer<typeof budgetLineSchema>;

export const functionBudgetSchema = z.strictObject({
  functionKind: z.enum(FUNCTION_KINDS),
  label: labelSchema,
  guests: countSchema,
  amountInr: inrSchema,
  perGuestInr: inrSchema,
  lines: z
    .array(z.strictObject({ category: z.enum(BUDGET_CATEGORIES), amountInr: inrSchema }))
    .max(BUDGET_CATEGORIES.length),
  traceIds: traceIdsSchema,
});

export type FunctionBudget = z.infer<typeof functionBudgetSchema>;

export const budgetSchema = z.strictObject({
  totalInr: inrSchema,
  source: z.enum(['user', 'estimate']),
  jewelleryInr: inrSchema,
  contingencyInr: inrSchema,
  perGuestInr: inrSchema,
  lines: z.array(budgetLineSchema).max(BUDGET_CATEGORIES.length),
  byFunction: z.array(functionBudgetSchema).max(MAX_FUNCTIONS),
  traceIds: traceIdsSchema,
});

export type PlanBudget = z.infer<typeof budgetSchema>;

/** CST-01…05: the bottom-up check of the catering line and rooms. */
export const costCheckSchema = z.strictObject({
  perPlateInr: inrRangeSchema,
  plates: countSchema,
  taxesServicePct: z.number().min(0).max(PERCENT_MAX),
  cateringInr: inrEstimateSchema,
  roomsInr: inrSchema,
  cateringLineInr: inrSchema,
  /** Catering line minus the mid estimate; negative means the line is short. */
  gapInr: signedInrSchema,
  status: z.enum(['covered', 'short']),
  notes: z.array(lineSchema).max(8),
  traceIds: traceIdsSchema,
});

export type CostCheck = z.infer<typeof costCheckSchema>;

export const gstSummarySchema = z.strictObject({
  effectiveFromIso: isoDateSchema,
  totalInr: inrSchema,
  note: lineSchema,
  lines: z
    .array(
      z.strictObject({
        category: z.enum(BUDGET_CATEGORIES),
        ratePct: z.number().min(0).max(MAX_GST_PCT).nullable(),
        gstInr: inrSchema,
      }),
    )
    .max(BUDGET_CATEGORIES.length),
  traceIds: traceIdsSchema,
});

export type GstSummary = z.infer<typeof gstSummarySchema>;

export const leverSchema = z.strictObject({
  id: z.enum(LEVER_IDS),
  ruleId: z.enum(RULE_IDS),
  title: labelSchema,
  detail: lineSchema,
  savingInr: inrSchema,
  newMoneyStatus: z.enum(MONEY_STATUSES),
  /** "Apply" sends this patch through the what-if engine. */
  patch: contextPatchSchema.optional(),
  traceIds: traceIdsSchema,
});

export type Lever = z.infer<typeof leverSchema>;

export const paymentMilestoneSchema = z.strictObject({
  vendorType: z.enum(VENDOR_TYPES),
  key: z.enum(['advance', 'mid', 'balance']),
  label: labelSchema,
  pct: z.number().int().min(0).max(PERCENT_MAX),
  amountInr: inrSchema,
  due: z.enum(PAYMENT_DUE_RULES),
  /** Absent when undated (no event date, or "on delivery"). */
  dueIso: isoDateSchema.optional(),
});

export type PaymentMilestone = z.infer<typeof paymentMilestoneSchema>;

/** Three milestones per vendor (VEN-04). */
const MILESTONES_PER_VENDOR = 3;

export const paymentsSchema = z.strictObject({
  milestones: z.array(paymentMilestoneSchema).max(MAX_VENDORS * MILESTONES_PER_VENDOR),
  cashflow: z
    .array(
      z.strictObject({
        monthIso: monthKeySchema,
        amountInr: inrSchema,
        vendorTypes: z.array(z.enum(VENDOR_TYPES)).max(MAX_VENDORS),
      }),
    )
    .max(MAX_CASHFLOW_MONTHS),
  /** The 30/40/30 schedule is a grade-D assumption the UI labels. */
  assumption: z.boolean(),
  checklist: z.array(lineSchema).max(8),
  traceIds: traceIdsSchema,
});

export type Payments = z.infer<typeof paymentsSchema>;
