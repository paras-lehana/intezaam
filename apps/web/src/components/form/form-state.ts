/**
 * The planner form's state and its two-way mapping to an EventContext.
 *
 * Responsibility: hold what the inputs show (numbers as typed text, '' for "nothing chosen
 * yet"), fill the state from a whole or partial context (a sample, a read brief, an applied
 * change) and turn it back into the object `eventContextSchema` validates. Context fields
 * the form has no control for (title, tier override, toggles…) pass through from the last
 * fill, so a filled context comes back out unchanged. Boundary: no validation here
 * (form-validation.ts) and no React.
 */
import type {
  AccessNeed,
  EventFamily,
  EventKind,
  FunctionKind,
  HelpLevel,
  LanguageCode,
  Premises,
  RankableCategory,
  StyleTag,
  Tradition,
  VenueSetting,
} from '@intezaam/core/domain';
import { DEFAULT_LANGUAGE } from '@intezaam/core/domain';
import type { DietChoice, EventContext } from '@intezaam/core/schemas';

export interface SoundState {
  readonly amplified: boolean;
  readonly endHhmm: string;
  readonly nearSilenceZone: boolean;
  readonly crackers: boolean;
}

export interface BirthdayState {
  readonly age: string;
  readonly kidsCount: string;
}

export interface CommunityState {
  readonly premises: Premises;
  readonly days: string;
  readonly households: string;
  readonly footfall: string;
  readonly sponsorsInr: string;
  readonly rwaFundInr: string;
  readonly ticketsInr: string;
  readonly volunteers: string;
}

/**
 * Whether a Punjabi or Sikh wedding is an Anand Karaj. Three answers, because "not said"
 * differs from "no": unsaid keeps the gurdwara rule as an "if", no drops it (09 §5.2).
 */
export const ANAND_KARAJ_CHOICES = ['unsaid', 'yes', 'no'] as const;
export type AnandKarajChoice = (typeof ANAND_KARAJ_CHOICES)[number];

/** The context value each answer sends (absent for "not said"). */
export const ANAND_KARAJ_VALUES: Readonly<Record<AnandKarajChoice, boolean | undefined>> = {
  unsaid: undefined,
  yes: true,
  no: false,
};

export interface PlannerFormState {
  readonly family: EventFamily | '';
  readonly kind: EventKind | '';
  readonly dateIso: string;
  readonly dateFlexible: boolean;
  readonly city: string;
  readonly guests: string;
  readonly budget: string;
  readonly estimateBudget: boolean;
  readonly tradition: Tradition | '';
  /** Sent only for a Punjabi or Sikh wedding (anandKarajPart in form-context.ts). */
  readonly anandKaraj: AnandKarajChoice;
  readonly functions: readonly FunctionKind[];
  readonly venueSetting: VenueSetting;
  readonly areaSqft: string;
  readonly diet: DietChoice;
  readonly alcohol: boolean;
  readonly priorities: readonly RankableCategory[];
  readonly cut: RankableCategory | '';
  readonly styleTags: readonly StyleTag[];
  readonly accessibility: Readonly<Record<AccessNeed, boolean>>;
  readonly helpLevel: HelpLevel;
  readonly language: LanguageCode;
  /** Percent of guests travelling in, as typed (the context stores a 0–1 share). */
  readonly outstationPct: string;
  readonly destination: boolean;
  readonly sound: SoundState;
  readonly birthday: BirthdayState;
  readonly community: CommunityState;
  /** The last context the form was filled from; fields without a control pass through. */
  readonly base: Partial<EventContext>;
}

/** 10 pm is when the Noise Rules 2000 night ban on amplified sound begins. */
const DEFAULT_SOUND_END = '22:00';
const PERCENT = 100;
/** Two decimals of a percent keep shares such as 0.07 exact on the way back (7 → 0.07). */
const PERCENT_PRECISION = 100;

/** The form opens empty: the five essentials are blank; optional details hold neutral defaults. */
export const EMPTY_FORM_STATE: PlannerFormState = {
  family: '',
  kind: '',
  dateIso: '',
  dateFlexible: false,
  city: '',
  guests: '',
  budget: '',
  estimateBudget: false,
  tradition: '',
  anandKaraj: 'unsaid',
  functions: [],
  venueSetting: 'indoor',
  areaSqft: '',
  diet: { menu: 'veg', jainGuests: false, halal: false, satvik: false },
  alcohol: false,
  priorities: [],
  cut: '',
  styleTags: [],
  accessibility: { elderly: false, wheelchair: false, kids: false },
  helpLevel: 'family',
  language: DEFAULT_LANGUAGE,
  outstationPct: '0',
  destination: false,
  sound: { amplified: false, endHhmm: DEFAULT_SOUND_END, nearSilenceZone: false, crackers: false },
  birthday: { age: '', kidsCount: '' },
  community: {
    premises: 'private',
    days: '1',
    households: '',
    footfall: '',
    sponsorsInr: '',
    rwaFundInr: '',
    ticketsInr: '',
    volunteers: '',
  },
  base: {},
};

function text(value: number | undefined, fallback: string): string {
  return value === undefined ? fallback : String(value);
}

function anandKarajChoice(
  value: boolean | undefined,
  fallback: AnandKarajChoice,
): AnandKarajChoice {
  if (value === undefined) return fallback;
  return value ? 'yes' : 'no';
}

function percentText(share: number | undefined, fallback: string): string {
  return share === undefined
    ? fallback
    : String(Math.round(share * PERCENT * PERCENT_PRECISION) / PERCENT_PRECISION);
}

/**
 * Fills the form from a context. `complete` (a sample or an applied change) replaces every
 * field, so an absent budget means "estimate it for me"; a partial context (a read brief)
 * only overwrites the fields it carries.
 * @example
 * fillState(EMPTY_FORM_STATE, { city: 'Pune' }, false).city; // 'Pune'
 */
export function fillState(
  state: PlannerFormState,
  ctx: Partial<EventContext>,
  complete: boolean,
): PlannerFormState {
  const from = complete ? EMPTY_FORM_STATE : state;
  const community = ctx.community;
  return {
    ...from,
    family: ctx.family ?? from.family,
    kind: ctx.kind ?? from.kind,
    dateIso: ctx.dateIso ?? from.dateIso,
    dateFlexible: ctx.dateFlexible ?? from.dateFlexible,
    city: ctx.city ?? from.city,
    guests: text(ctx.guests, from.guests),
    budget: text(ctx.budgetInr, from.budget),
    estimateBudget: ctx.budgetInr === undefined ? complete || from.estimateBudget : false,
    tradition: ctx.tradition ?? from.tradition,
    anandKaraj: anandKarajChoice(ctx.anandKaraj, from.anandKaraj),
    functions: ctx.functions ?? from.functions,
    venueSetting: ctx.venueSetting ?? from.venueSetting,
    areaSqft: text(ctx.areaSqft, from.areaSqft),
    diet: ctx.diet ?? from.diet,
    alcohol: ctx.alcohol ?? from.alcohol,
    priorities: ctx.priorities ?? from.priorities,
    cut: ctx.cut ?? from.cut,
    styleTags: ctx.styleTags ?? from.styleTags,
    accessibility: { ...from.accessibility, ...ctx.accessibility },
    helpLevel: ctx.helpLevel ?? from.helpLevel,
    language: ctx.language ?? from.language,
    outstationPct: percentText(ctx.outstationShare, from.outstationPct),
    destination: ctx.destination ?? from.destination,
    sound: ctx.sound ?? from.sound,
    birthday: {
      age: text(ctx.birthday?.age, from.birthday.age),
      kidsCount: text(ctx.birthday?.kidsCount, from.birthday.kidsCount),
    },
    community: {
      premises: community?.premises ?? from.community.premises,
      days: text(community?.days, from.community.days),
      households: text(community?.households, from.community.households),
      footfall: text(community?.footfall, from.community.footfall),
      sponsorsInr: text(community?.sponsorsInr, from.community.sponsorsInr),
      rwaFundInr: text(community?.rwaFundInr, from.community.rwaFundInr),
      ticketsInr: text(community?.ticketsInr, from.community.ticketsInr),
      volunteers: text(community?.volunteers, from.community.volunteers),
    },
    base: complete ? ctx : { ...state.base, ...ctx },
  };
}
