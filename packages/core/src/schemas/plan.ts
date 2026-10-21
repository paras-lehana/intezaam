/**
 * Plan — the deterministic planner's complete output, and the wire contract every
 * screen, export and AI prompt reads.
 *
 * Responsibility: compose the plan from its parts (context echo, verdict, money, time,
 * vendors, people, safety, community) plus the trace and the deduplicated sources every
 * trace item cites (SPEC-API `buildPlan`). Boundary: shapes only; `buildPlan` parses its
 * result through `planSchema` before returning it.
 */
import { z } from 'zod';
import { CALENDAR_PAUSE_IDS } from '../domain/seasons.js';
import { ANCHOR_CITIES, CITY_TIERS } from '../domain/cities.js';
import { VENUE_SETTINGS } from '../domain/context-options.js';
import { CROWD_CLASSES } from '../domain/crowd.js';
import { EVENT_FAMILIES, EVENT_KINDS } from '../domain/events.js';
import { FUNCTION_KINDS } from '../domain/functions.js';
import { LANGUAGE_CODES } from '../domain/languages.js';
import { SCALE_BANDS } from '../domain/scale.js';
import { TRADITIONS } from '../domain/traditions.js';
import { countSchema, inrSchema, isoDateSchema, labelSchema } from './common.js';
import {
  MAX_CITY_CHARS,
  MAX_FUNCTIONS,
  MAX_RISKS,
  MAX_SOURCES,
  MAX_TRACE_ITEMS,
  MAX_VENDORS,
} from './limits.js';
import {
  budgetSchema,
  costCheckSchema,
  gstSummarySchema,
  leverSchema,
  paymentsSchema,
  readinessSchema,
  verdictSchema,
} from './plan-money.js';
import {
  communityPlanSchema,
  foodPlanSchema,
  headcountSchema,
  spaceCheckSchema,
  vendorChecklistSchema,
} from './plan-people.js';
import {
  accessibilityPlanSchema,
  crowdPlanSchema,
  permissionSchema,
  riskSchema,
} from './plan-safety.js';
import { planFunctionSchema, runSheetSchema, timelineSchema } from './plan-time.js';
import { sourceRefSchema, traceItemSchema } from './trace.js';

const MONTHS_PER_YEAR = 12;

/** How the tier was decided (CTX-02): the user's override, the gazetteer, or the default. */
export const TIER_SOURCES = ['override', 'gazetteer', 'unknown-city'] as const;

/** The normalised context the plan was computed from, with every derived classification. */
export const contextEchoSchema = z.strictObject({
  family: z.enum(EVENT_FAMILIES),
  kind: z.enum(EVENT_KINDS),
  tradition: z.enum(TRADITIONS).optional(),
  cityName: z.string().min(1).max(MAX_CITY_CHARS),
  state: z.string().max(MAX_CITY_CHARS).optional(),
  tier: z.enum(CITY_TIERS),
  tierSource: z.enum(TIER_SOURCES),
  anchor: z.enum(ANCHOR_CITIES).optional(),
  scale: z.enum(SCALE_BANDS),
  dateIso: isoDateSchema.optional(),
  daysToEvent: z.number().int().nullable(),
  season: z.strictObject({
    peak: z.boolean(),
    offPeak: z.boolean(),
    weekday: z.boolean(),
    month: z.number().int().min(1).max(MONTHS_PER_YEAR).nullable(),
    pauses: z.array(z.enum(CALENDAR_PAUSE_IDS)).max(CALENDAR_PAUSE_IDS.length),
  }),
  rainRisk: z.boolean(),
  crowdClass: z.enum(CROWD_CLASSES),
  setting: z.enum(VENUE_SETTINGS),
  guests: countSchema,
  functions: z.array(z.enum(FUNCTION_KINDS)).max(MAX_FUNCTIONS),
  budgetInr: inrSchema,
  budgetSource: z.enum(['user', 'estimate']),
  budgetPerGuestInr: inrSchema,
  language: z.enum(LANGUAGE_CODES),
});

export type ContextEcho = z.infer<typeof contextEchoSchema>;

/** Couple hashtags (feature #31) are short; ten suggestions are plenty. */
const MAX_HASHTAGS = 10;
const HASHTAG = /^#[\p{L}\p{N}_]{2,40}$/u;
/** At most one lever per lever id (LEVER_IDS has eleven). */
const MAX_LEVERS = 11;
/** One permission per id (eight PERM rules). */
const MAX_PERMISSIONS = 8;

export const planSchema = z.strictObject({
  /** The `todayIso` the plan was computed for; every relative date is anchored to it. */
  todayIso: isoDateSchema,
  title: labelSchema,
  contextEcho: contextEchoSchema,
  verdict: verdictSchema,
  readiness: readinessSchema,
  budget: budgetSchema,
  costCheck: costCheckSchema,
  gst: gstSummarySchema,
  levers: z.array(leverSchema).max(MAX_LEVERS),
  payments: paymentsSchema,
  headcount: headcountSchema,
  food: foodPlanSchema,
  space: spaceCheckSchema,
  timeline: timelineSchema,
  functions: z.array(planFunctionSchema).max(MAX_FUNCTIONS),
  runSheet: z.array(runSheetSchema).max(MAX_FUNCTIONS),
  vendors: z.array(vendorChecklistSchema).max(MAX_VENDORS),
  permissions: z.array(permissionSchema).max(MAX_PERMISSIONS),
  crowd: crowdPlanSchema,
  risks: z.array(riskSchema).max(MAX_RISKS),
  accessibility: accessibilityPlanSchema,
  community: communityPlanSchema.optional(),
  hashtags: z.array(z.string().regex(HASHTAG)).max(MAX_HASHTAGS).optional(),
  trace: z.array(traceItemSchema).max(MAX_TRACE_ITEMS),
  /** Every source any trace item cites, once each. */
  sources: z.array(sourceRefSchema).max(MAX_SOURCES),
});

export type Plan = z.infer<typeof planSchema>;
