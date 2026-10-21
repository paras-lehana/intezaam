/**
 * Brief contracts (GenAI job 1): what the model returns for a free-text brief, and the
 * validated draft the form is filled from.
 *
 * Responsibility: the LEAN model output — closed enums only, numbers as the quoted text
 * ("2 lakh", "200 log") so code parses them, and an evidence quote per field that must be
 * a substring of the brief — and the BriefDraft with parsed numbers (synthesis §5 job 1).
 * Boundary: shapes only; the server validates evidence and parses numbers.
 */
import { z } from 'zod';
import { ACCESS_NEEDS } from '../domain/accessibility.js';
import { RANKABLE_CATEGORIES } from '../domain/budget-categories.js';
import { PREMISES, VENUE_SETTINGS } from '../domain/context-options.js';
import { DIET_PROFILES } from '../domain/diet.js';
import { EVENT_FAMILIES, EVENT_KINDS } from '../domain/events.js';
import { FUNCTION_KINDS } from '../domain/functions.js';
import { LANGUAGE_CODES } from '../domain/languages.js';
import { STYLE_TAGS } from '../domain/style.js';
import { TRADITIONS } from '../domain/traditions.js';
import { isoDateSchema } from './common.js';
import { budgetInrSchema, guestCountSchema } from './context.js';
import {
  MAX_CITY_CHARS,
  MAX_EVENT_DAYS,
  MAX_FUNCTIONS,
  MAX_HOUSEHOLDS,
  MAX_PRIORITIES,
  MAX_STYLE_TAGS,
} from './limits.js';

/** Fields a brief can fill; `missing` tells the form which questions to ask. */
export const BRIEF_FIELDS = [
  'family',
  'kind',
  'tradition',
  'city',
  'guests',
  'budget',
  'date',
  'functions',
  'venueSetting',
  'diet',
  'alcohol',
  'accessibility',
  'priorities',
  'cut',
  'styleTags',
  // Community events: flats are not guests, and the premises decide which permissions apply.
  'households',
  'days',
  'premises',
] as const;

export type BriefField = (typeof BRIEF_FIELDS)[number];

/**
 * The closed vocabularies a brief may use, labelled for the prompt. One table feeds both the
 * prompt and this schema's enums, so the model is never offered a value the schema rejects.
 */
export const BRIEF_VOCABULARIES = {
  'Event families': EVENT_FAMILIES,
  'Event kinds': EVENT_KINDS,
  Traditions: TRADITIONS,
  Functions: FUNCTION_KINDS,
  'Venue settings': VENUE_SETTINGS,
  'Diet menus': DIET_PROFILES,
  'Access needs': ACCESS_NEEDS,
  'Priority categories': RANKABLE_CATEGORIES,
  'Style tags': STYLE_TAGS,
  Languages: LANGUAGE_CODES,
  'Evidence fields': BRIEF_FIELDS,
} as const satisfies Record<string, readonly string[]>;

const MONTHS_PER_YEAR = 12;
/** Number phrases are short ("2.5 lakh", "around 200 log"). */
const MAX_NUMBER_TEXT_CHARS = 60;
/** An evidence quote is a phrase from the brief, not a paragraph. */
const MAX_EVIDENCE_CHARS = 160;
const MAX_UNDERSTOOD_CHARS = 200;

const briefDietSchema = z.strictObject({
  menu: z.enum(DIET_PROFILES).optional(),
  jainGuests: z.boolean().optional(),
  halal: z.boolean().optional(),
});

/** Fields shared by the model output and the validated draft. */
const sharedBriefFields = {
  family: z.enum(EVENT_FAMILIES).optional(),
  kind: z.enum(EVENT_KINDS).optional(),
  /** Only when the brief states it; never inferred from names or the city. */
  tradition: z.enum(TRADITIONS).optional(),
  /**
   * Punjabi or Sikh weddings: true only when the brief says Sikh, Anand Karaj or gurdwara,
   * false when it says Punjabi alone (09 §5.2: only true triggers the gurdwara-only rule).
   */
  anandKaraj: z.boolean().optional(),
  city: z.string().trim().min(1).max(MAX_CITY_CHARS).optional(),
  dateIso: isoDateSchema.optional(),
  /** A month without a day ("December") keeps the date open but informs the season. */
  month: z.number().int().min(1).max(MONTHS_PER_YEAR).optional(),
  dateFlexible: z.boolean().optional(),
  functions: z.array(z.enum(FUNCTION_KINDS)).max(MAX_FUNCTIONS).optional(),
  venueSetting: z.enum(VENUE_SETTINGS).optional(),
  diet: briefDietSchema.optional(),
  alcohol: z.boolean().optional(),
  accessibility: z.array(z.enum(ACCESS_NEEDS)).max(ACCESS_NEEDS.length).optional(),
  priorities: z.array(z.enum(RANKABLE_CATEGORIES)).max(MAX_PRIORITIES).optional(),
  cut: z.enum(RANKABLE_CATEGORIES).optional(),
  styleTags: z.array(z.enum(STYLE_TAGS)).max(MAX_STYLE_TAGS).optional(),
  /** Community events: in the society's own compound (private) or on public land. */
  premises: z.enum(PREMISES).optional(),
  language: z.enum(LANGUAGE_CODES).optional(),
  /** Hindi typed in Latin script: drafts default to Hinglish rather than Devanagari. */
  hinglish: z.boolean().optional(),
};

export const briefEvidenceSchema = z.strictObject({
  field: z.enum(BRIEF_FIELDS),
  /** Must be found verbatim in the brief, or the field is dropped. */
  quote: z.string().trim().min(1).max(MAX_EVIDENCE_CHARS),
});

export const briefModelOutputSchema = z.strictObject({
  ...sharedBriefFields,
  /** The guest phrase as written; code parses the number. */
  guestsText: z.string().trim().min(1).max(MAX_NUMBER_TEXT_CHARS).optional(),
  /** The budget phrase as written; code parses the rupees ("2 lakh" → 200000). */
  budgetText: z.string().trim().min(1).max(MAX_NUMBER_TEXT_CHARS).optional(),
  /** Community events: the households phrase as written ("150 flats"); code parses it. */
  householdsText: z.string().trim().min(1).max(MAX_NUMBER_TEXT_CHARS).optional(),
  /** Community events: the length as written ("10 days", "5 din"); code parses it. */
  daysText: z.string().trim().min(1).max(MAX_NUMBER_TEXT_CHARS).optional(),
  evidence: z.array(briefEvidenceSchema).max(BRIEF_FIELDS.length * 2),
  missing: z.array(z.enum(BRIEF_FIELDS)).max(BRIEF_FIELDS.length),
  /** One line the UI shows: "A 300-guest wedding in Jaipur in late November". */
  understood: z.string().trim().max(MAX_UNDERSTOOD_CHARS),
});

export type BriefModelOutput = z.infer<typeof briefModelOutputSchema>;

/** The validated draft: evidence checked, numbers parsed by code, ready to fill the form. */
export const briefDraftSchema = z.strictObject({
  ...sharedBriefFields,
  guests: guestCountSchema.optional(),
  budgetInr: budgetInrSchema.optional(),
  households: z.number().int().min(1).max(MAX_HOUSEHOLDS).optional(),
  days: z.number().int().min(1).max(MAX_EVENT_DAYS).optional(),
});

export type BriefDraft = z.infer<typeof briefDraftSchema>;
