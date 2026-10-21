/**
 * Responsibility: a read brief shown back before it touches the form — one "label: value" chip
 * per filled field (every field a brief can fill, worded with core's labels), one plain question
 * per missing essential (optional details never chased), and a form fill that carries only what
 * the brief said, so confirming never wipes typed fields. Boundary: briefs are read by core's
 * offline reader and evidence guard — the server's own offline path — and every expected label
 * comes from core's tables or the form's own empty state, never typed in.
 */
import { describe, expect, it } from 'vitest';
import { formatInr } from '@intezaam/core';
import {
  ACCESS_NEED_LABELS,
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
import { BRIEF_FIELDS, type BriefDraft, type BriefField } from '@intezaam/core/schemas';
import { formatIsoDate, monthName } from '../../../components/features/common/dates';
import {
  BRIEF_FIELD_LABELS,
  ESSENTIAL_FIELDS,
  MISSING_PROMPTS,
  briefChips,
  draftToFill,
  missingPrompts,
} from '../../../components/features/workspace/brief-fill';
import { EMPTY_FORM_STATE } from '../../../components/form';
import { briefResponseFor } from '../plan-fixtures';

/** A Hinglish brief naming the city, guests and budget (a test-owned input). */
const BRIEF = 'Shaadi in Jaipur, 300 log, 25 lakh budget';
const read = briefResponseFor(BRIEF);

/** A brief that filled every field (test-owned inputs; `satisfies` keeps each literal). */
const FULL = {
  family: 'wedding',
  kind: 'wedding',
  tradition: 'punjabi-sikh',
  anandKaraj: true,
  city: 'Amritsar',
  guests: 1200,
  budgetInr: 3_500_000,
  dateIso: '2027-02-14',
  dateFlexible: false,
  functions: ['haldi', 'sangeet', 'reception'],
  venueSetting: 'mixed',
  diet: { menu: 'mixed', jainGuests: true, halal: true },
  alcohol: true,
  accessibility: ['elderly', 'wheelchair'],
  priorities: ['catering', 'decor', 'photo_video'],
  cut: 'gifts',
  styleTags: ['royal', 'floral'],
  households: 1500,
  days: 3,
  premises: 'public',
  language: 'pa',
} satisfies BriefDraft;

const fullChips = briefChips(FULL, BRIEF_FIELDS);

/** A month the brief named without a day. */
const DECEMBER = 12;

function chipValue(field: BriefField, draft: BriefDraft = FULL): string | undefined {
  return briefChips(draft, [field]).at(0)?.value;
}

describe('briefChips', () => {
  it('describes each filled field in the order the reader listed them', () => {
    const chips = briefChips(read.draft, read.filled);
    expect(chips.map((chip) => chip.field)).toEqual(read.filled);
    expect(chips.map((chip) => chip.label)).toEqual(
      read.filled.map((field) => BRIEF_FIELD_LABELS[field]),
    );
    expect(chips.find((chip) => chip.field === 'city')?.value).toBe(read.draft.city);
    expect(chips.find((chip) => chip.field === 'guests')?.value).toBe('300');
    expect(chips.find((chip) => chip.field === 'budget')?.value).toBe('₹25,00,000');
  });

  it('names the celebration with core’s label', () => {
    const family = read.draft.family;
    expect(family).toBeDefined();
    const chip = briefChips(read.draft, read.filled).find((item) => item.field === 'family');
    expect(chip?.value).toBe(family === undefined ? '' : FAMILY_PROFILES[family].label);
  });

  it('skips a listed field the draft does not carry', () => {
    expect(briefChips({}, ['city', 'guests'])).toEqual([]);
    expect(briefChips({}, BRIEF_FIELDS)).toEqual([]);
  });

  it('gives a brief that filled everything one labelled chip per field', () => {
    expect(fullChips.map((chip) => chip.field)).toEqual(BRIEF_FIELDS);
    expect(fullChips.map((chip) => chip.label)).toEqual(
      BRIEF_FIELDS.map((field) => BRIEF_FIELD_LABELS[field]),
    );
  });

  it.each<[BriefField, string]>([
    ['family', FAMILY_PROFILES[FULL.family].label],
    ['kind', EVENT_KIND_PROFILES[FULL.kind].label],
    ['tradition', TRADITION_PROFILES[FULL.tradition].label],
    ['city', FULL.city],
    ['budget', formatInr(FULL.budgetInr)],
    ['date', formatIsoDate(FULL.dateIso)],
    ['venueSetting', VENUE_SETTING_LABELS[FULL.venueSetting]],
    ['cut', CATEGORY_PROFILES[FULL.cut].label],
    ['premises', PREMISES_LABELS[FULL.premises]],
  ])('words the %s chip with core’s label', (field, expected) => {
    expect(chipValue(field)).toBe(expected);
  });

  it.each<[BriefField, readonly string[]]>([
    ['functions', FULL.functions.map((kind) => FUNCTION_PROFILES[kind].label)],
    ['accessibility', FULL.accessibility.map((need) => ACCESS_NEED_LABELS[need])],
    ['priorities', FULL.priorities.map((key) => CATEGORY_PROFILES[key].label)],
    ['styleTags', FULL.styleTags.map((tag) => STYLE_TAG_LABELS[tag])],
  ])('lists the %s picks in the brief’s order', (field, labels) => {
    expect(chipValue(field)?.split(', ')).toEqual(labels);
  });

  it('counts guests and households the Indian way, and days in words', () => {
    expect(chipValue('guests')).toBe(FULL.guests.toLocaleString('en-IN'));
    expect(chipValue('households')).toBe(FULL.households.toLocaleString('en-IN'));
    expect(chipValue('days')).toBe(`${FULL.days} days`);
    expect(chipValue('days', { days: 1 })).toBe('1 day');
  });

  it('spells out the menu and each special need, and skips an empty food answer', () => {
    expect(chipValue('diet')?.split(', ')).toEqual([
      DIET_PROFILE_INFO[FULL.diet.menu].label,
      'Jain guests',
      'Halal',
    ]);
    expect(chipValue('diet', { diet: { jainGuests: true } })).toBe('Jain guests');
    expect(chipValue('diet', { diet: { halal: false } })).toBeUndefined();
  });

  it('says whether alcohol is served either way', () => {
    expect(chipValue('alcohol')).toBe('Served');
    expect(chipValue('alcohol', { alcohol: false })).toBe('Not served');
  });

  it('reads a month without a day, or an open date, and drops a closed one with no day', () => {
    expect(chipValue('date', { month: DECEMBER })).toBe(`${monthName(DECEMBER)} (pick the day)`);
    expect(chipValue('date', { dateFlexible: true })).toBe('Not fixed yet');
    expect(chipValue('date', { dateFlexible: false })).toBeUndefined();
  });
});

describe('missingPrompts', () => {
  it('asks only for missing essentials, in form order', () => {
    expect(missingPrompts(['budget', 'styleTags', 'date'])).toEqual([
      MISSING_PROMPTS.date,
      MISSING_PROMPTS.budget,
    ]);
    expect(missingPrompts([...ESSENTIAL_FIELDS])).toHaveLength(ESSENTIAL_FIELDS.length);
  });

  it('does not ask again for an essential the brief answered', () => {
    expect(read.filled).toContain('city');
    expect(missingPrompts(read.missing)).not.toContain(MISSING_PROMPTS.city);
  });
});

describe('draftToFill', () => {
  it('carries only the fields the brief said', () => {
    const fill = draftToFill(read.draft);
    expect(fill.city).toBe(read.draft.city);
    expect(fill.guests).toBe(read.draft.guests);
    expect(fill.budgetInr).toBe(read.draft.budgetInr);
    expect(fill).not.toHaveProperty('dateIso');
    expect(fill).not.toHaveProperty('diet');
  });

  it('carries every field of a full brief onto the form', () => {
    const { diet, accessibility, households, days, premises, ...direct } = FULL;
    const fill = draftToFill(FULL);
    expect(fill).toMatchObject(direct);
    expect(fill.diet).toEqual({ ...diet, satvik: EMPTY_FORM_STATE.diet.satvik });
    expect(fill.community).toEqual({ premises, days, households });
    expect(fill.accessibility).toEqual({
      elderly: accessibility.includes('elderly'),
      wheelchair: accessibility.includes('wheelchair'),
      kids: false,
    });
  });

  it.each([{ halal: true }, { jainGuests: true }])(
    'keeps the form’s food defaults for what the brief left unsaid (%o)',
    (said) => {
      expect(draftToFill({ diet: said }).diet).toEqual({ ...EMPTY_FORM_STATE.diet, ...said });
    },
  );

  it('fills community details together, with the form’s defaults for the rest', () => {
    const fill = draftToFill({ households: 240 });
    expect(fill.community?.households).toBe(240);
    expect(fill.community?.premises).toBe(EMPTY_FORM_STATE.community.premises);
    expect(fill.community?.days).toBe(Number(EMPTY_FORM_STATE.community.days));
    expect(draftToFill({ premises: FULL.premises }).community).toEqual({
      premises: FULL.premises,
      days: Number(EMPTY_FORM_STATE.community.days),
    });
  });

  it('turns access needs into the form’s three switches', () => {
    expect(draftToFill({ accessibility: ['elderly'] }).accessibility).toEqual({
      elderly: true,
      wheelchair: false,
      kids: false,
    });
  });

  it('passes the Anand Karaj answer through untouched, and fills nothing from a month alone', () => {
    expect(draftToFill({ anandKaraj: true }).anandKaraj).toBe(true);
    expect(draftToFill({})).toEqual({});
    expect(draftToFill({ month: DECEMBER })).toEqual({});
  });
});
