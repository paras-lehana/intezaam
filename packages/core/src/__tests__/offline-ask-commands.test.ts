/**
 * Tests for the Ask command parser: natural-language changes become patch operations.
 *
 * Responsibility: relative and absolute guest and budget changes, dates, setting, diet,
 * alcohol, city, adding and removing functions and an open date, in English, Hinglish and
 * Hindi; a plain question proposes nothing. Boundary: relative values are derived from the
 * sample context; the parser's ops are unvalidated (applyAskPatch validates them).
 */
import { describe, expect, it } from 'vitest';
import { parseAskCommand } from '../offline/ask-commands.js';
import { planned, TODAY } from './fixtures/genai-plans.js';

const LAKH = 100_000;

describe('parseAskCommand', () => {
  const { context } = planned('jaipur-wedding');
  const parse = (question: string): ReturnType<typeof parseAskCommand> =>
    parseAskCommand(question, context, TODAY);

  it('adds, removes or sets guests relative to the context', () => {
    expect(parse('add 50 guests')).toEqual([{ op: 'setGuests', value: context.guests + 50 }]);
    expect(parse('50 log kam karo')).toEqual([{ op: 'setGuests', value: context.guests - 50 }]);
    expect(parse('100 mehmaan aur badha do')).toEqual([
      { op: 'setGuests', value: context.guests + 100 },
    ]);
    expect(parse('make it 180 guests')).toEqual([{ op: 'setGuests', value: 180 }]);
  });

  it('sets or shifts the budget in lakh', () => {
    expect(parse('budget 20 lakh kar do')).toEqual([{ op: 'setBudget', value: 20 * LAKH }]);
    expect(parse('budget 5 lakh badhao')).toEqual([
      { op: 'setBudget', value: (context.budgetInr ?? 0) + 5 * LAKH },
    ]);
  });

  it('moves the date, or opens it', () => {
    expect(parse('move to 12 December')).toEqual([{ op: 'setDate', value: '2026-12-12' }]);
    expect(parse('change to 15 Jan 2027')).toEqual([{ op: 'setDate', value: '2027-01-15' }]);
    expect(parse('date not fixed')).toEqual([{ op: 'setDateFlexible', value: true }]);
  });

  it('changes setting, diet, alcohol and city', () => {
    expect(parse('make it outdoor')).toEqual([{ op: 'setVenueSetting', value: 'outdoor' }]);
    expect(parse('jain khana chahiye')).toEqual([{ op: 'setDiet', value: 'jain' }]);
    expect(parse('no alcohol')).toEqual([{ op: 'setAlcohol', value: false }]);
    expect(parse('shift to Udaipur')).toEqual([{ op: 'setCity', value: 'Udaipur' }]);
  });

  it('adds and removes functions', () => {
    expect(parse('add sangeet')).toEqual([{ op: 'addFunction', value: 'sangeet' }]);
    expect(parse('haldi hata do')).toEqual([{ op: 'removeFunction', value: 'haldi' }]);
  });

  it('proposes nothing for a plain question', () => {
    expect(parse('how many guests?')).toEqual([]);
    expect(parse('what is the catering budget')).toEqual([]);
  });

  it('starts an absent budget from zero when adding', () => {
    const { budgetInr: _unset, ...open } = context;
    expect(parseAskCommand('budget 2 lakh badhao', open, TODAY)).toEqual([
      { op: 'setBudget', value: 2 * LAKH },
    ]);
  });
});
