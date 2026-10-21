/**
 * A read brief, shown back before it touches the form.
 *
 * Responsibility: describe each field the brief reader filled as a "label: value" chip,
 * turn each missing essential into a plain question, and map the validated draft onto the
 * form's context fields — only the fields the brief actually carried, so confirming never
 * wipes what the reader already typed. Boundary: pure; the reader confirms in BriefReview
 * and the form fills itself from the result.
 */
import { formatInr } from '@intezaam/core';
import {
  ACCESS_NEED_LABELS,
  type AccessNeed,
  CATEGORY_PROFILES,
  DIET_PROFILE_INFO,
  EVENT_KIND_PROFILES,
  FAMILY_PROFILES,
  FUNCTION_PROFILES,
  PREMISES_LABELS,
  STYLE_TAG_LABELS,
  TRADITION_PROFILES,
  VENUE_SETTING_LABELS,
} from '@intezaam/core/domain';
import type { BriefDraft, BriefField, EventContext } from '@intezaam/core/schemas';
import { EMPTY_FORM_STATE } from '../../form';
import { formatIsoDate, monthName } from '../common/dates';

export interface BriefChip {
  readonly field: BriefField;
  readonly label: string;
  readonly value: string;
}

export const BRIEF_FIELD_LABELS: Readonly<Record<BriefField, string>> = {
  family: 'Celebration',
  kind: 'Kind',
  tradition: 'Tradition',
  city: 'City',
  guests: 'Guests',
  budget: 'Budget',
  date: 'Date',
  functions: 'Functions',
  venueSetting: 'Venue',
  diet: 'Food',
  alcohol: 'Alcohol',
  accessibility: 'Access needs',
  priorities: 'Priorities',
  cut: 'Cut first',
  styleTags: 'Style',
  households: 'Households',
  days: 'Days',
  premises: 'Where',
};

/** The five essentials the form cannot plan without (synthesis feature #3). */
export const ESSENTIAL_FIELDS = ['family', 'date', 'city', 'guests', 'budget'] as const;

export type EssentialField = (typeof ESSENTIAL_FIELDS)[number];

/** What the form still needs when the brief did not say; optional details are not chased. */
export const MISSING_PROMPTS: Readonly<Record<EssentialField, string>> = {
  family: 'What are you celebrating?',
  date: 'When is it? Pick a date, or tick “Date not fixed yet”.',
  city: 'Which city or town?',
  guests: 'About how many guests?',
  budget: 'What is the budget? Or tick “Estimate it for me”.',
};

/**
 * The questions still open after a brief: one per missing essential, in form order.
 * @example
 * missingPrompts(['budget', 'styleTags']); // ['What is the budget? Or tick “Estimate it for me”.']
 */
export function missingPrompts(missing: readonly BriefField[]): readonly string[] {
  return ESSENTIAL_FIELDS.filter((field) => missing.includes(field)).map(
    (field) => MISSING_PROMPTS[field],
  );
}

const GUESTS = new Intl.NumberFormat('en-IN');

function joined(labels: readonly string[]): string | undefined {
  return labels.length === 0 ? undefined : labels.join(', ');
}

function dateText(draft: BriefDraft): string | undefined {
  if (draft.dateIso !== undefined) return formatIsoDate(draft.dateIso);
  if (draft.month !== undefined) return `${monthName(draft.month)} (pick the day)`;
  return draft.dateFlexible === true ? 'Not fixed yet' : undefined;
}

function dietText(draft: BriefDraft): string | undefined {
  const diet = draft.diet;
  if (diet === undefined) return undefined;
  const parts = [
    diet.menu === undefined ? undefined : DIET_PROFILE_INFO[diet.menu].label,
    diet.jainGuests === true ? 'Jain guests' : undefined,
    diet.halal === true ? 'Halal' : undefined,
  ];
  return joined(parts.filter((part): part is string => part !== undefined));
}

/** How each field reads on its chip; undefined when the brief did not fill it. */
const DESCRIBE: Readonly<Record<BriefField, (draft: BriefDraft) => string | undefined>> = {
  family: (d) => (d.family === undefined ? undefined : FAMILY_PROFILES[d.family].label),
  kind: (d) => (d.kind === undefined ? undefined : EVENT_KIND_PROFILES[d.kind].label),
  tradition: (d) => (d.tradition === undefined ? undefined : TRADITION_PROFILES[d.tradition].label),
  city: (d) => d.city,
  guests: (d) => (d.guests === undefined ? undefined : GUESTS.format(d.guests)),
  budget: (d) => (d.budgetInr === undefined ? undefined : formatInr(d.budgetInr)),
  date: dateText,
  functions: (d) => joined((d.functions ?? []).map((kind) => FUNCTION_PROFILES[kind].label)),
  venueSetting: (d) =>
    d.venueSetting === undefined ? undefined : VENUE_SETTING_LABELS[d.venueSetting],
  diet: dietText,
  alcohol: (d) => (d.alcohol === undefined ? undefined : d.alcohol ? 'Served' : 'Not served'),
  accessibility: (d) => joined((d.accessibility ?? []).map((need) => ACCESS_NEED_LABELS[need])),
  priorities: (d) => joined((d.priorities ?? []).map((key) => CATEGORY_PROFILES[key].label)),
  cut: (d) => (d.cut === undefined ? undefined : CATEGORY_PROFILES[d.cut].label),
  styleTags: (d) => joined((d.styleTags ?? []).map((tag) => STYLE_TAG_LABELS[tag])),
  households: (d) => (d.households === undefined ? undefined : GUESTS.format(d.households)),
  days: (d) => (d.days === undefined ? undefined : `${d.days} ${d.days === 1 ? 'day' : 'days'}`),
  premises: (d) => (d.premises === undefined ? undefined : PREMISES_LABELS[d.premises]),
};

/**
 * The chips for the fields the reader filled, in the order the server listed them.
 * @example
 * briefChips(draft, ['city']); // [{ field: 'city', label: 'City', value: 'Jaipur' }]
 */
export function briefChips(draft: BriefDraft, filled: readonly BriefField[]): readonly BriefChip[] {
  return filled.flatMap((field) => {
    const value = DESCRIBE[field](draft);
    return value === undefined ? [] : [{ field, label: BRIEF_FIELD_LABELS[field], value }];
  });
}

/** Community details travel together: the form's community group needs premises and days. */
function communityFill(draft: BriefDraft): Partial<EventContext> {
  const { premises, days, households } = draft;
  if (premises === undefined && days === undefined && households === undefined) return {};
  const base = EMPTY_FORM_STATE.community;
  return {
    community: {
      premises: premises ?? base.premises,
      days: days ?? Number(base.days),
      ...(households === undefined ? {} : { households }),
    },
  };
}

function accessRecord(needs: readonly AccessNeed[]): Readonly<Record<AccessNeed, boolean>> {
  return {
    elderly: needs.includes('elderly'),
    wheelchair: needs.includes('wheelchair'),
    kids: needs.includes('kids'),
  };
}

/**
 * The form fill for a confirmed brief: only the fields the draft carries.
 * @example
 * draftToFill({ city: 'Jaipur', guests: 300 }); // { city: 'Jaipur', guests: 300 }
 */
export function draftToFill(draft: BriefDraft): Partial<EventContext> {
  const base = EMPTY_FORM_STATE.diet;
  const { diet, accessibility } = draft;
  return {
    ...(draft.family === undefined ? {} : { family: draft.family }),
    ...(draft.kind === undefined ? {} : { kind: draft.kind }),
    ...(draft.tradition === undefined ? {} : { tradition: draft.tradition }),
    ...(draft.anandKaraj === undefined ? {} : { anandKaraj: draft.anandKaraj }),
    ...(draft.city === undefined ? {} : { city: draft.city }),
    ...(draft.guests === undefined ? {} : { guests: draft.guests }),
    ...(draft.budgetInr === undefined ? {} : { budgetInr: draft.budgetInr }),
    ...(draft.dateIso === undefined ? {} : { dateIso: draft.dateIso }),
    ...(draft.dateFlexible === undefined ? {} : { dateFlexible: draft.dateFlexible }),
    ...(draft.functions === undefined ? {} : { functions: draft.functions }),
    ...(draft.venueSetting === undefined ? {} : { venueSetting: draft.venueSetting }),
    ...(draft.alcohol === undefined ? {} : { alcohol: draft.alcohol }),
    ...(draft.priorities === undefined ? {} : { priorities: draft.priorities }),
    ...(draft.cut === undefined ? {} : { cut: draft.cut }),
    ...(draft.styleTags === undefined ? {} : { styleTags: draft.styleTags }),
    ...(draft.language === undefined ? {} : { language: draft.language }),
    ...(accessibility === undefined ? {} : { accessibility: accessRecord(accessibility) }),
    ...communityFill(draft),
    ...(diet === undefined
      ? {}
      : {
          diet: {
            menu: diet.menu ?? base.menu,
            jainGuests: diet.jainGuests ?? base.jainGuests,
            halal: diet.halal ?? base.halal,
            satvik: base.satvik,
          },
        }),
  };
}
