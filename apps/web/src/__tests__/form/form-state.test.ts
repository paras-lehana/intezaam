/**
 * Responsibility: form state ↔ context — every core sample survives context → form → context
 * unchanged, partial fills only touch what they carry, family extras stay with their family,
 * and typed numbers parse the way people write them. Boundary: fixtures are derived from
 * core's sampleContext(), so a new sample is covered automatically.
 */
import { describe, expect, it } from 'vitest';
import { SAMPLE_IDS, sampleContext } from '@intezaam/core/domain';
import { eventContextSchema } from '@intezaam/core/schemas';
import { contextInputFromState, parseTypedNumber } from '../../components/form/form-context';
import {
  ANAND_KARAJ_CHOICES,
  ANAND_KARAJ_VALUES,
  EMPTY_FORM_STATE,
  fillState,
} from '../../components/form/form-state';
import { TEST_TODAY_ISO } from '../helpers';

describe('fillState + contextInputFromState', () => {
  it.each(SAMPLE_IDS)('round-trips the %s sample exactly', (id) => {
    const context = sampleContext(id, TEST_TODAY_ISO);
    const state = fillState(EMPTY_FORM_STATE, context, true);
    expect(eventContextSchema.parse(contextInputFromState(state))).toEqual(
      eventContextSchema.parse(context),
    );
  });

  it('merges a partial fill (a read brief) over what is already typed', () => {
    const typed = { ...EMPTY_FORM_STATE, city: 'Pune', guests: '120' };
    const state = fillState(typed, { family: 'birthday', kind: 'kids-birthday' }, false);
    expect(state.city).toBe('Pune');
    expect(state.guests).toBe('120');
    expect(state.family).toBe('birthday');
    expect(state.estimateBudget).toBe(false);
  });

  it('reads an absent budget in a complete context as "estimate it for me"', () => {
    const { budgetInr: _omitted, ...withoutBudget } = sampleContext(
      'jaipur-wedding',
      TEST_TODAY_ISO,
    );
    const state = fillState(EMPTY_FORM_STATE, withoutBudget, true);
    expect(state.estimateBudget).toBe(true);
    expect(contextInputFromState(state)).not.toHaveProperty('budgetInr');
  });

  it('sends family extras only for their own family', () => {
    const birthday = fillState(
      EMPTY_FORM_STATE,
      sampleContext('bengaluru-birthday', TEST_TODAY_ISO),
      true,
    );
    const asWedding = { ...birthday, family: 'wedding' as const, kind: 'wedding' as const };
    expect(contextInputFromState(birthday)).toHaveProperty('birthday');
    expect(contextInputFromState(asWedding)).not.toHaveProperty('birthday');
    expect(contextInputFromState(asWedding)).not.toHaveProperty('community');
  });

  it.each(ANAND_KARAJ_CHOICES)(
    'round-trips the Anand Karaj answer "%s" for a Sikh wedding',
    (choice) => {
      const wedding = sampleContext('jaipur-wedding', TEST_TODAY_ISO);
      const value = ANAND_KARAJ_VALUES[choice];
      const context = {
        ...wedding,
        tradition: 'punjabi-sikh' as const,
        ...(value === undefined ? {} : { anandKaraj: value }),
      };
      const state = fillState(EMPTY_FORM_STATE, context, true);
      expect(state.anandKaraj).toBe(choice);
      expect(contextInputFromState(state)['anandKaraj']).toBe(value);
    },
  );

  it('keeps the Anand Karaj answer through a partial fill and sends it only for a Sikh wedding', () => {
    const answered = fillState(EMPTY_FORM_STATE, { anandKaraj: true }, false);
    expect(fillState(answered, { city: 'Amritsar' }, false).anandKaraj).toBe('yes');
    const sikhWedding = {
      ...answered,
      family: 'wedding' as const,
      tradition: 'punjabi-sikh' as const,
    };
    expect(contextInputFromState(sikhWedding)['anandKaraj']).toBe(true);
    expect(contextInputFromState({ ...sikhWedding, tradition: 'tamil' })).not.toHaveProperty(
      'anandKaraj',
    );
    expect(contextInputFromState({ ...sikhWedding, family: 'birthday' })).not.toHaveProperty(
      'anandKaraj',
    );
  });

  it('leaves out the date when it is not fixed, and sound when nothing is ticked', () => {
    const state = { ...EMPTY_FORM_STATE, dateIso: '2027-01-10', dateFlexible: true };
    const input = contextInputFromState(state);
    expect(input).not.toHaveProperty('dateIso');
    expect(input).not.toHaveProperty('sound');
    expect(input['dateFlexible']).toBe(true);
  });
});

describe('parseTypedNumber', () => {
  it('accepts rupee signs, Indian digit groups and spaces', () => {
    expect(parseTypedNumber('₹25,00,000')).toBe(2_500_000);
    expect(parseTypedNumber(' 40 000 ')).toBe(40_000);
  });

  it('treats an empty box as not given and junk as not-a-number for validation to catch', () => {
    expect(parseTypedNumber('')).toBeUndefined();
    expect(parseTypedNumber('2O0')).toBeNaN();
  });
});
