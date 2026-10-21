/**
 * The planner form's fields as error targets: keys, order, messages and element ids.
 *
 * Responsibility: map every EventContext path the schema can complain about to the one
 * visible field that owns it (a closed Record, so a new context field cannot go unmapped),
 * give each field a plain-language message, and fix the order errors are visited in.
 * Boundary: no validation logic (form-validation.ts) and no rendering.
 */
import type { EventContext } from '@intezaam/core/schemas';
import { MAX_GUESTS } from '@intezaam/core/schemas';
import type { PlannerFormState } from './form-state';

/** Visible fields, in the order the form shows them (the first invalid one gets focus). */
export const FIELD_KEYS = [
  'family',
  'date',
  'city',
  'guests',
  'budget',
  'tradition',
  'functions',
  'birthday',
  'community',
  'venue',
  'travel',
  'diet',
  'priorities',
  'style',
  'access',
  'sound',
  'help',
  'language',
  'form',
] as const;

export type FieldKey = (typeof FIELD_KEYS)[number];

export type FieldErrors = Readonly<Partial<Record<FieldKey, string>>>;

/** Fields inside the "More details" disclosure, which must open before one can take focus. */
export const DETAIL_FIELDS: ReadonlySet<FieldKey> = new Set<FieldKey>([
  'tradition',
  'functions',
  'birthday',
  'community',
  'venue',
  'travel',
  'diet',
  'priorities',
  'style',
  'access',
  'sound',
  'help',
  'language',
]);

const GUEST_LIMIT_TEXT = MAX_GUESTS.toLocaleString('en-IN');

/** Messages for schema issues that carry no sentence of their own (wrong type, out of range). */
export const FIELD_MESSAGES: Readonly<Record<FieldKey, string>> = {
  family: 'Choose what you are celebrating.',
  date: 'Pick a date, or tick “Date not fixed yet”.',
  city: 'Type the city or town.',
  guests: `Enter the number of guests, from 1 to ${GUEST_LIMIT_TEXT}.`,
  budget: 'Enter the budget in rupees, or tick “Estimate it for me”.',
  tradition: 'Choose a tradition from the list, or leave it blank.',
  functions: 'Check the functions you picked.',
  birthday: 'Check the age and the number of children (whole numbers).',
  community: 'Check the community details: days and amounts are whole numbers.',
  venue: 'Check the venue setting and area (a whole number of square feet).',
  travel: 'Enter the share of guests travelling in as a percent from 0 to 100.',
  diet: 'Check the food choices.',
  priorities: 'Pick up to three priorities, and a different category to cut.',
  style: 'Pick up to five styles.',
  access: 'Check the accessibility needs.',
  sound: 'Enter the time the music stops, for example 22:00.',
  help: 'Choose who is doing the planning.',
  language: 'Choose a language from the list.',
  form: 'Some details could not be used. Check the form and try again.',
};

/** Which field owns each top-level context path. */
const PATH_TO_FIELD: Readonly<Record<keyof EventContext, FieldKey>> = {
  family: 'family',
  kind: 'family',
  title: 'form',
  tradition: 'tradition',
  anandKaraj: 'tradition',
  dateIso: 'date',
  dateFlexible: 'date',
  city: 'city',
  tier: 'city',
  destination: 'travel',
  guests: 'guests',
  budgetInr: 'budget',
  functions: 'functions',
  guestsByFunction: 'functions',
  venueSetting: 'venue',
  areaSqft: 'venue',
  diet: 'diet',
  alcohol: 'diet',
  priorities: 'priorities',
  cut: 'priorities',
  disabledCategories: 'form',
  styleTags: 'style',
  accessibility: 'access',
  helpLevel: 'help',
  toggles: 'form',
  outstationShare: 'travel',
  sound: 'sound',
  birthday: 'birthday',
  community: 'community',
  language: 'language',
};

function isContextKey(key: PropertyKey): key is keyof EventContext {
  return typeof key === 'string' && Object.hasOwn(PATH_TO_FIELD, key);
}

/**
 * The field that owns a schema issue's path; unknown paths go to the form-level summary.
 * @example
 * fieldForPath(['budgetInr']); // 'budget'
 */
export function fieldForPath(path: readonly PropertyKey[]): FieldKey {
  const [head] = path;
  return head !== undefined && isContextKey(head) ? PATH_TO_FIELD[head] : 'form';
}

/**
 * The element id of a field's wrapper (focus moves to the first control inside it).
 * @example
 * plannerFieldId('city'); // 'planner-field-city'
 */
export function plannerFieldId(field: FieldKey): string {
  return `planner-field-${field}`;
}

/** What every form section receives: the state, a patcher, the errors and the field to glow. */
export interface SectionProps {
  readonly state: PlannerFormState;
  readonly update: (patch: Partial<PlannerFormState>) => void;
  readonly errors: FieldErrors;
  readonly attention: FieldKey | null;
}
