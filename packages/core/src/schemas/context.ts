/**
 * EventContext — everything the user tells us about the celebration.
 *
 * Responsibility: the strict input contract the form, the brief reader, the API and the
 * engines share (SPEC-MVP "SCHEMAS", synthesis §3 A): family and kind, date or "not
 * fixed", city, guests, budget or "estimate it for me", functions, setting, diet,
 * priorities, style, accessibility, help level, sound plan and the birthday and community
 * extras. Cross-field rules (kind belongs to family, functions allowed for the family,
 * cut not among priorities…) are checked here once, and the two free-text fields (city,
 * title) leave the schema sanitised and PII-redacted. Boundary: shape, consistency and that
 * text clean-up only; the date window relative to today is checked in requests.ts.
 */
import { z } from 'zod';
import { ACCESS_NEEDS } from '../domain/accessibility.js';
import { BUDGET_CATEGORIES, RANKABLE_CATEGORIES } from '../domain/budget-categories.js';
import { CITY_TIERS } from '../domain/cities.js';
import { FLAT_SIZES } from '../domain/community.js';
import { HELP_LEVELS, PREMISES, VENUE_SETTINGS } from '../domain/context-options.js';
import { DIET_PROFILES } from '../domain/diet.js';
import { EVENT_KIND_PROFILES } from '../domain/event-kinds.js';
import { EVENT_FAMILIES, EVENT_KINDS } from '../domain/events.js';
import { FUNCTION_KINDS, functionAllowedFor } from '../domain/functions.js';
import { LANGUAGE_CODES } from '../domain/languages.js';
import { STYLE_TAGS } from '../domain/style.js';
import { TRADITIONS } from '../domain/traditions.js';
import { hhmmSchema, isoDateSchema, shareSchema, userTextFieldSchema } from './common.js';
import {
  MAX_AGE_YEARS,
  MAX_AREA_SQFT,
  MAX_BUDGET_INR,
  MAX_CITY_CHARS,
  MAX_EVENT_DAYS,
  MAX_FOOTFALL,
  MAX_FUNCTIONS,
  MAX_GUESTS,
  MAX_HOUSEHOLDS,
  MAX_PRIORITIES,
  MAX_STYLE_TAGS,
  MAX_TITLE_CHARS,
  MAX_VOLUNTEERS,
  MIN_GUESTS,
} from './limits.js';

export const guestCountSchema = z.number().int().min(MIN_GUESTS).max(MAX_GUESTS);

/**
 * A city as typed. Security: a city outside the gazetteer is echoed into the plan trace and
 * the narration and draft prompts, so it is sanitised and redacted here, once, for all of them.
 */
export const cityTextSchema = userTextFieldSchema(MAX_CITY_CHARS);

/** Money the user types: whole rupees, positive, capped against typos. */
export const budgetInrSchema = z.number().int().min(1).max(MAX_BUDGET_INR);

/** Offsets (sponsors, RWA fund, tickets) may be zero. */
const offsetInrSchema = z.number().int().min(0).max(MAX_BUDGET_INR);

export const dietChoiceSchema = z.strictObject({
  menu: z.enum(DIET_PROFILES),
  /** Some guests eat Jain: adds a Jain counter served before sunset (DIET-01). */
  jainGuests: z.boolean(),
  /** Halal meat needed (DIET-02); Nikah and Walima always need it. */
  halal: z.boolean(),
  /** A no-onion, no-garlic option (DIET-03). */
  satvik: z.boolean(),
});

export type DietChoice = z.infer<typeof dietChoiceSchema>;

/** The noise and fireworks plan behind PERM-01/02/03/07. */
export const soundPlanSchema = z.strictObject({
  amplified: z.boolean(),
  /** When amplified sound stops (HH:MM, 24-hour; 00:00–05:59 means after midnight). */
  endHhmm: hhmmSchema,
  nearSilenceZone: z.boolean(),
  crackers: z.boolean(),
});

export type SoundPlan = z.infer<typeof soundPlanSchema>;

export const birthdayExtrasSchema = z.strictObject({
  age: z.number().int().min(0).max(MAX_AGE_YEARS).optional(),
  kidsCount: z.number().int().min(0).max(MAX_GUESTS).optional(),
});

export type BirthdayExtras = z.infer<typeof birthdayExtrasSchema>;

export const communityExtrasSchema = z.strictObject({
  premises: z.enum(PREMISES),
  days: z.number().int().min(1).max(MAX_EVENT_DAYS),
  households: z.number().int().min(1).max(MAX_HOUSEHOLDS).optional(),
  /** Households per flat size, for a tiered contribution (COM-02). */
  flatTiers: z.record(z.enum(FLAT_SIZES), z.number().int().min(0).max(MAX_HOUSEHOLDS)).optional(),
  /** Expected total footfall; guests is the count fed at the meals. */
  footfall: z.number().int().min(1).max(MAX_FOOTFALL).optional(),
  sponsorsInr: offsetInrSchema.optional(),
  rwaFundInr: offsetInrSchema.optional(),
  ticketsInr: offsetInrSchema.optional(),
  volunteers: z.number().int().min(0).max(MAX_VOLUNTEERS).optional(),
});

export type CommunityExtras = z.infer<typeof communityExtrasSchema>;

/** The fields without cross-field checks, for callers that need `.pick()` or `.partial()`. */
export const eventContextFieldsSchema = z.strictObject({
  family: z.enum(EVENT_FAMILIES),
  kind: z.enum(EVENT_KINDS),
  title: userTextFieldSchema(MAX_TITLE_CHARS).optional(),
  tradition: z.enum(TRADITIONS).optional(),
  /**
   * Punjabi or Sikh weddings: true = an Anand Karaj (gurdwara-only ceremony), false = not
   * one, absent = not said (the plan then words the gurdwara rule as "if").
   */
  anandKaraj: z.boolean().optional(),
  dateIso: isoDateSchema.optional(),
  /** "Not fixed yet": the timeline switches to undated mode (TL-05). */
  dateFlexible: z.boolean(),
  city: cityTextSchema,
  /** Overrides the gazetteer tier (CTX-02); absent = derived. */
  tier: z.enum(CITY_TIERS).optional(),
  destination: z.boolean(),
  guests: guestCountSchema,
  /** Absent = "estimate it for me" (feature #5). */
  budgetInr: budgetInrSchema.optional(),
  /** Empty = use the kind's (or tradition's) default functions. */
  functions: z.array(z.enum(FUNCTION_KINDS)).max(MAX_FUNCTIONS),
  guestsByFunction: z.partialRecord(z.enum(FUNCTION_KINDS), guestCountSchema).optional(),
  venueSetting: z.enum(VENUE_SETTINGS),
  areaSqft: z.number().int().min(1).max(MAX_AREA_SQFT).optional(),
  diet: dietChoiceSchema,
  alcohol: z.boolean(),
  priorities: z.array(z.enum(RANKABLE_CATEGORIES)).max(MAX_PRIORITIES),
  cut: z.enum(RANKABLE_CATEGORIES).optional(),
  /** Categories switched off; their share is spread pro rata (BUD-06). */
  disabledCategories: z.array(z.enum(BUDGET_CATEGORIES)).max(BUDGET_CATEGORIES.length),
  styleTags: z.array(z.enum(STYLE_TAGS)).max(MAX_STYLE_TAGS),
  accessibility: z.record(z.enum(ACCESS_NEEDS), z.boolean()),
  helpLevel: z.enum(HELP_LEVELS),
  toggles: z.strictObject({ jewellery: z.boolean(), planner: z.boolean() }),
  /** Share of guests travelling in (HC-01, BUD-04, CST-05). */
  outstationShare: shareSchema,
  sound: soundPlanSchema.optional(),
  birthday: birthdayExtrasSchema.optional(),
  community: communityExtrasSchema.optional(),
  language: z.enum(LANGUAGE_CODES),
});

type ContextFields = z.infer<typeof eventContextFieldsSchema>;

interface Issue {
  readonly path: (string | number)[];
  readonly message: string;
}

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

/** Every cross-field rule, as data: each returns the issue it finds or null. */
const CONTEXT_CHECKS: readonly ((ctx: ContextFields) => Issue | null)[] = [
  (ctx) =>
    EVENT_KIND_PROFILES[ctx.kind].family === ctx.family
      ? null
      : { path: ['kind'], message: 'That kind of event does not belong to the chosen event type.' },
  (ctx) =>
    ctx.dateFlexible || ctx.dateIso !== undefined
      ? null
      : { path: ['dateIso'], message: 'Pick a date, or tick "not fixed yet".' },
  (ctx) =>
    hasDuplicates(ctx.functions)
      ? { path: ['functions'], message: 'Each function can be listed once.' }
      : null,
  (ctx) =>
    ctx.functions.every((kind) => functionAllowedFor(kind, ctx.family))
      ? null
      : { path: ['functions'], message: 'One of the functions does not fit this event type.' },
  (ctx) =>
    Object.keys(ctx.guestsByFunction ?? {}).every((key) =>
      ctx.functions.some((kind) => kind === key),
    )
      ? null
      : { path: ['guestsByFunction'], message: 'Guest counts are only for functions you picked.' },
  (ctx) =>
    hasDuplicates(ctx.priorities) || hasDuplicates(ctx.styleTags)
      ? { path: ['priorities'], message: 'Each priority and style can be picked once.' }
      : null,
  (ctx) =>
    ctx.cut !== undefined && ctx.priorities.includes(ctx.cut)
      ? { path: ['cut'], message: 'The category to cut cannot also be a top priority.' }
      : null,
  (ctx) =>
    ctx.birthday !== undefined && ctx.family !== 'birthday'
      ? { path: ['birthday'], message: 'Birthday details apply to birthdays only.' }
      : null,
  (ctx) =>
    ctx.community !== undefined && ctx.family !== 'community'
      ? { path: ['community'], message: 'Community details apply to community events only.' }
      : null,
];

/** The user's celebration, validated field by field and across fields. */
export const eventContextSchema = eventContextFieldsSchema.superRefine((ctx, refinement) => {
  for (const check of CONTEXT_CHECKS) {
    const issue = check(ctx);
    if (issue !== null) refinement.addIssue({ code: 'custom', ...issue });
  }
});

export type EventContext = z.infer<typeof eventContextSchema>;
