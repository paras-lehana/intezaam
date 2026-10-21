/**
 * Plan contracts, part 3: vendors, headcount, food, space and the community toolkit
 * (synthesis §3 E, F, H; §4.6–4.8).
 *
 * Responsibility: the wire shapes of per-vendor checklists, the headcount forecast, the
 * food plan, the venue space check and the community contribution, ledger and volunteer
 * roster. Boundary: shapes only; the engines fill them.
 */
import { z } from 'zod';
import { BUDGET_CATEGORIES } from '../domain/budget-categories.js';
import { FLAT_SIZES, VOLUNTEER_ROLES } from '../domain/community.js';
import { DIET_RULE_KEYS } from '../domain/diet.js';
import { SPACE_LAYOUTS } from '../domain/space.js';
import { VENDOR_GROUPS, VENDOR_TYPES } from '../domain/vendors.js';
import {
  countSchema,
  idSchema,
  inrSchema,
  isoDateSchema,
  labelSchema,
  lineSchema,
  shareSchema,
  traceIdsSchema,
} from './common.js';
import { MAX_GST_PCT } from './limits.js';
import { paymentMilestoneSchema } from './plan-money.js';

export const VENDOR_STATUSES = ['to-contact', 'quoted', 'booked', 'paid'] as const;

/** Checklist list lengths: the playbook has at most six questions per vendor. */
const MAX_CHECKLIST_ITEMS = 12;
/** The longest wedding lead in the sources is 12 months; 24 leaves room for edits. */
const MAX_LEAD_MONTHS = 24;

export const vendorChecklistSchema = z.strictObject({
  vendorType: z.enum(VENDOR_TYPES),
  label: labelSchema,
  group: z.enum(VENDOR_GROUPS),
  bookByIso: isoDateSchema.optional(),
  leadMonths: z.number().min(0).max(MAX_LEAD_MONTHS),
  budgetCategory: z.enum(BUDGET_CATEGORIES),
  budgetInr: inrSchema.optional(),
  gstPct: z.number().min(0).max(MAX_GST_PCT).nullable(),
  questions: z.array(lineSchema).max(MAX_CHECKLIST_ITEMS),
  getInWriting: z.array(lineSchema).max(MAX_CHECKLIST_ITEMS),
  redFlags: z.array(lineSchema).max(MAX_CHECKLIST_ITEMS),
  payments: z.array(paymentMilestoneSchema).max(3),
  /** VEN-05: a Google Maps search the user runs; never a named business. */
  mapsUrl: z.url(),
  status: z.enum(VENDOR_STATUSES),
  traceIds: traceIdsSchema,
});

export type VendorChecklist = z.infer<typeof vendorChecklistSchema>;

export const headcountSchema = z.strictObject({
  invited: countSchema,
  expected: countSchema,
  attendanceRate: shareSchema,
  plateGuarantee: countSchema,
  cookFor: countSchema,
  /** HC-02: plates above this count are likely wasted. */
  wasteWarningAbove: countSchema,
  outstationGuests: countSchema,
  rooms: countSchema,
  /** HC-03: kids' parties order extra return gifts. */
  returnGiftsToOrder: countSchema.optional(),
  traceIds: traceIdsSchema,
});

export type Headcount = z.infer<typeof headcountSchema>;

export const FOOD_COUNTERS = ['veg', 'non-veg', 'jain', 'halal', 'satvik', 'mocktails'] as const;

export const foodPlanSchema = z.strictObject({
  gramsPerAdult: z.strictObject({ min: countSchema, max: countSchema }),
  totalKg: z.strictObject({ min: z.number().min(0), max: z.number().min(0) }),
  counters: z.array(z.enum(FOOD_COUNTERS)).max(FOOD_COUNTERS.length),
  rules: z
    .array(
      z.strictObject({
        key: z.enum(DIET_RULE_KEYS),
        title: labelSchema,
        items: z.array(lineSchema).max(MAX_CHECKLIST_ITEMS),
      }),
    )
    .max(DIET_RULE_KEYS.length),
  traceIds: traceIdsSchema,
});

export type FoodPlan = z.infer<typeof foodPlanSchema>;

export const SPACE_STATUSES = ['ok', 'tight', 'over', 'unknown'] as const;

export const spaceCheckSchema = z.strictObject({
  areaSqft: countSchema.optional(),
  layout: z.enum(SPACE_LAYOUTS),
  sqftPerGuest: z.number().min(0),
  capacity: countSchema.optional(),
  status: z.enum(SPACE_STATUSES),
  traceIds: traceIdsSchema,
});

export type SpaceCheck = z.infer<typeof spaceCheckSchema>;

/** A seed ledger: one expected collection per source and one spend line per budget head. */
const MAX_LEDGER_ROWS = 40;
const MAX_SPONSOR_IDEAS = 8;

export const communityPlanSchema = z.strictObject({
  footfall: countSchema,
  contribution: z.strictObject({
    mode: z.enum(['flat', 'tiered']),
    plannedInr: inrSchema,
    sponsorsInr: inrSchema,
    rwaFundInr: inrSchema,
    ticketsInr: inrSchema,
    /** Planned spend minus every offset, never below zero. */
    netInr: inrSchema,
    households: countSchema.optional(),
    perHouseholdInr: inrSchema.optional(),
    tiers: z
      .array(
        z.strictObject({
          size: z.enum(FLAT_SIZES),
          weight: z.number().min(0),
          households: countSchema,
          perHouseholdInr: inrSchema,
        }),
      )
      .max(FLAT_SIZES.length),
    roundingInr: inrSchema,
  }),
  ledgerSeed: z
    .array(
      z.strictObject({
        id: idSchema,
        label: labelSchema,
        kind: z.enum(['collected', 'spent']),
        amountInr: inrSchema,
        category: z.enum(BUDGET_CATEGORIES).optional(),
      }),
    )
    .max(MAX_LEDGER_ROWS),
  volunteers: z
    .array(
      z.strictObject({
        role: z.enum(VOLUNTEER_ROLES),
        label: labelSchema,
        duty: lineSchema,
        count: countSchema,
      }),
    )
    .max(VOLUNTEER_ROLES.length),
  sponsorIdeas: z.array(lineSchema).max(MAX_SPONSOR_IDEAS),
  traceIds: traceIdsSchema,
});

export type CommunityPlan = z.infer<typeof communityPlanSchema>;
