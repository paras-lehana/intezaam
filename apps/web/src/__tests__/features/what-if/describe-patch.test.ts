/**
 * Responsibility: every typed change has words — one line per op, built from core's own
 * labels — and "Explain this change" asks a question the Ask endpoint accepts. Boundary:
 * words only; the table below is keyed by every op name, so a new op needs a case here.
 */
import { describe, expect, it } from 'vitest';
import { formatInr } from '@intezaam/core';
import {
  CATEGORY_PROFILES,
  DIET_PROFILE_INFO,
  FUNCTION_PROFILES,
  VENUE_SETTING_LABELS,
} from '@intezaam/core/domain';
import { MAX_QUESTION_CHARS, type PatchOp, type PatchOpName } from '@intezaam/core/schemas';
import { formatIsoDate } from '../../../components/features/common/dates';
import {
  describePatch,
  explainQuestion,
} from '../../../components/features/what-if/describe-patch';

/** One op per name with the words it must produce (test-owned values). */
const CASES: Readonly<Record<PatchOpName, { readonly op: PatchOp; readonly words: string }>> = {
  setGuests: { op: { op: 'setGuests', value: 250 }, words: '250' },
  setBudget: { op: { op: 'setBudget', value: 1_500_000 }, words: formatInr(1_500_000) },
  setDate: { op: { op: 'setDate', value: '2026-12-12' }, words: formatIsoDate('2026-12-12') },
  setDateFlexible: { op: { op: 'setDateFlexible', value: true }, words: 'not fixed' },
  setCity: { op: { op: 'setCity', value: 'Pune' }, words: 'Pune' },
  setVenueSetting: {
    op: { op: 'setVenueSetting', value: 'outdoor' },
    words: VENUE_SETTING_LABELS.outdoor,
  },
  setDiet: { op: { op: 'setDiet', value: 'jain' }, words: DIET_PROFILE_INFO.jain.label },
  setAlcohol: { op: { op: 'setAlcohol', value: false }, words: 'No alcohol' },
  addFunction: { op: { op: 'addFunction', value: 'haldi' }, words: FUNCTION_PROFILES.haldi.label },
  removeFunction: {
    op: { op: 'removeFunction', value: 'sangeet' },
    words: FUNCTION_PROFILES.sangeet.label,
  },
  toggleCategory: {
    op: { op: 'toggleCategory', value: 'decor', enabled: false },
    words: CATEGORY_PROFILES.decor.label.toLowerCase(),
  },
  setPriority: {
    op: { op: 'setPriority', value: 'decor' },
    words: CATEGORY_PROFILES.decor.label.toLowerCase(),
  },
};

describe('describePatch', () => {
  it('describes every op in words from core’s labels, in order', () => {
    const entries = Object.values(CASES);
    const lines = describePatch({ ops: entries.map((entry) => entry.op) });
    expect(lines).toHaveLength(entries.length);
    entries.forEach((entry, index) => expect(lines[index]).toContain(entry.words));
  });

  it('says "estimate it for me" when the budget is cleared', () => {
    expect(describePatch({ ops: [{ op: 'setBudget', value: null }] })).toEqual([
      'Budget: estimate it for me',
    ]);
  });
});

describe('explainQuestion', () => {
  it('asks about the described change within the question cap', () => {
    const question = explainQuestion({ ops: Object.values(CASES).map((entry) => entry.op) });
    expect(question).toContain(CASES.setGuests.words);
    expect(question.length).toBeLessThanOrEqual(MAX_QUESTION_CHARS);
  });
});
