/**
 * Form state → the candidate EventContext the schema validates.
 *
 * Responsibility: turn typed text into numbers, drop optional parts the user left empty
 * (a birthday with no age, sound with nothing ticked), attach the family-specific extras
 * only for that family, and carry through the context fields the form has no control for.
 * Boundary: builds an unvalidated object; `eventContextSchema` decides whether it is valid,
 * so a typo such as "2O0" guests reaches the schema as not-a-number and is reported, not guessed.
 */
import type { EventContext } from '@intezaam/core/schemas';
import { ANAND_KARAJ_VALUES, type PlannerFormState } from './form-state';

const PERCENT = 100;

/** Rupee and digit-group characters people type ("₹25,00,000"); the rest must be a number. */
const NUMBER_DECORATION = /[₹,\s]/g;

/**
 * Typed text as a number: '' is "not given" (undefined); anything else that is not a
 * number becomes NaN so validation can say so.
 * @example
 * parseTypedNumber('25,00,000'); // 2500000
 * parseTypedNumber(''); // undefined
 */
export function parseTypedNumber(value: string): number | undefined {
  const cleaned = value.replace(NUMBER_DECORATION, '');
  return cleaned === '' ? undefined : Number(cleaned);
}

/** Drops keys whose value is undefined, so optional fields are absent rather than undefined. */
function compact(record: Readonly<Record<string, unknown>>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

/** Context fields without a form control, taken from the last fill. */
function carried(base: Partial<EventContext>, state: PlannerFormState): Record<string, unknown> {
  const guestsByFunction =
    base.guestsByFunction === undefined
      ? undefined
      : Object.fromEntries(
          Object.entries(base.guestsByFunction).filter(([kind]) =>
            state.functions.some((chosen) => chosen === kind),
          ),
        );
  return compact({
    title: base.title,
    tier: base.tier,
    guestsByFunction,
    toggles: base.toggles ?? { jewellery: false, planner: false },
    disabledCategories: base.disabledCategories ?? [],
  });
}

function birthdayPart(state: PlannerFormState): Record<string, unknown> | undefined {
  if (state.family !== 'birthday') return undefined;
  const part = compact({
    age: parseTypedNumber(state.birthday.age),
    kidsCount: parseTypedNumber(state.birthday.kidsCount),
  });
  return Object.keys(part).length === 0 ? undefined : part;
}

function communityPart(state: PlannerFormState): Record<string, unknown> | undefined {
  if (state.family !== 'community') return undefined;
  const { community } = state;
  return compact({
    premises: community.premises,
    days: parseTypedNumber(community.days),
    households: parseTypedNumber(community.households),
    footfall: parseTypedNumber(community.footfall),
    sponsorsInr: parseTypedNumber(community.sponsorsInr),
    rwaFundInr: parseTypedNumber(community.rwaFundInr),
    ticketsInr: parseTypedNumber(community.ticketsInr),
    volunteers: parseTypedNumber(community.volunteers),
    flatTiers: state.base.community?.flatTiers,
  });
}

/** The Anand Karaj answer belongs to a Punjabi or Sikh wedding only (the engine's gurdwara rule). */
function anandKarajPart(state: PlannerFormState): boolean | undefined {
  const sikhWedding = state.family === 'wedding' && state.tradition === 'punjabi-sikh';
  return sikhWedding ? ANAND_KARAJ_VALUES[state.anandKaraj] : undefined;
}

/** Sound matters only once something is ticked; otherwise the plan has no sound line. */
function soundPart(state: PlannerFormState): PlannerFormState['sound'] | undefined {
  const { sound } = state;
  return sound.amplified || sound.crackers || sound.nearSilenceZone ? sound : undefined;
}

/**
 * The candidate context for `eventContextSchema.safeParse`.
 * @example
 * contextInputFromState(state)['guests']; // 300 when the guests box says "300"
 */
export function contextInputFromState(state: PlannerFormState): Record<string, unknown> {
  const outstation = parseTypedNumber(state.outstationPct);
  return compact({
    ...carried(state.base, state),
    family: state.family === '' ? undefined : state.family,
    kind: state.kind === '' ? undefined : state.kind,
    tradition: state.tradition === '' ? undefined : state.tradition,
    anandKaraj: anandKarajPart(state),
    dateIso: state.dateFlexible || state.dateIso === '' ? undefined : state.dateIso,
    dateFlexible: state.dateFlexible,
    city: state.city,
    destination: state.destination,
    guests: parseTypedNumber(state.guests),
    budgetInr: state.estimateBudget ? undefined : parseTypedNumber(state.budget),
    functions: [...state.functions],
    venueSetting: state.venueSetting,
    areaSqft: parseTypedNumber(state.areaSqft),
    diet: { ...state.diet },
    alcohol: state.alcohol,
    priorities: [...state.priorities],
    cut: state.cut === '' ? undefined : state.cut,
    styleTags: [...state.styleTags],
    accessibility: { ...state.accessibility },
    helpLevel: state.helpLevel,
    outstationShare: outstation === undefined ? 0 : outstation / PERCENT,
    sound: soundPart(state),
    birthday: birthdayPart(state),
    community: communityPart(state),
    language: state.language,
  });
}
