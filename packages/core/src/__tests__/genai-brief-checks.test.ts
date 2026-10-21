/**
 * Tests for genai/brief-checks.ts: the city, date and diet checks of the brief guard.
 *
 * Responsibility: pin that code re-reads every claim from its quote — a city must match the
 * gazetteer reading, a date is recomputed (the model's is discarded), and each diet flag needs
 * its own word. Boundary: quotes are folded the way groundedQuotes folds them.
 */
import { describe, expect, it } from 'vitest';
import { checkCity, checkDate, checkDiet, set } from '../genai/brief-checks.js';
import { EvidenceGuard, type Mutable } from '../genai/evidence.js';
import {
  BRIEF_FIELDS,
  type BriefDraft,
  type BriefField,
  type BriefModelOutput,
} from '../schemas/brief.js';
import { foldForMatch } from '../security/normalise.js';

const TODAY = '2026-10-20';
const EMPTY: BriefModelOutput = { evidence: [], missing: [], understood: '' };

/** A guard holding one folded quote per given field, as groundedQuotes would build it. */
function guardWith(quotes: Partial<Record<BriefField, string>>): EvidenceGuard {
  const grounded = new Map<BriefField, string[]>();
  for (const field of BRIEF_FIELDS) {
    const quote = quotes[field];
    if (quote !== undefined) grounded.set(field, [foldForMatch(quote)]);
  }
  return new EvidenceGuard(grounded, TODAY);
}

describe('checkCity', () => {
  it('keeps a gazetteer city only when the quote says it', () => {
    expect(checkCity(guardWith({ city: 'Jaipur mein' }), { ...EMPTY, city: 'Jaipur' })).toBe(
      'Jaipur',
    );
    const wrong = guardWith({ city: 'Jaipur mein' });
    expect(checkCity(wrong, { ...EMPTY, city: 'Delhi' })).toBeUndefined();
    expect(wrong.dropped).toEqual([{ field: 'city', reason: 'not-supported' }]);
  });

  it('keeps an unknown town only when it appears in a quote', () => {
    expect(checkCity(guardWith({ city: 'in Chirawa' }), { ...EMPTY, city: 'Chirawa' })).toBe(
      'Chirawa',
    );
    expect(checkCity(guardWith({}), { ...EMPTY, city: 'Chirawa' })).toBeUndefined();
  });
});

describe('checkDate', () => {
  it("recomputes the date from the quote and ignores the model's own", () => {
    const guard = guardWith({ date: 'December mein' });
    checkDate(guard, { ...EMPTY, month: 3, dateFlexible: false });
    expect(guard.draft.month).toBe(12);
    expect(guard.draft.dateFlexible).toBe(true);
  });

  it('drops a date claim whose quote holds no date', () => {
    const guard = guardWith({ date: 'jaldi' });
    checkDate(guard, { ...EMPTY, month: 12 });
    expect(guard.draft.month).toBeUndefined();
    expect(guard.dropped).toEqual([{ field: 'date', reason: 'not-supported' }]);
  });
});

describe('checkDiet', () => {
  it('keeps each diet flag only with its own word', () => {
    const guard = guardWith({ diet: 'Jain guests' });
    checkDiet(guard, { ...EMPTY, diet: { menu: 'jain', jainGuests: true, halal: true } });
    expect(guard.draft.diet).toEqual({ menu: 'jain', jainGuests: true });
    const none = guardWith({ diet: 'party' });
    checkDiet(none, { ...EMPTY, diet: { halal: true } });
    expect(none.draft.diet).toBeUndefined();
    expect(none.dropped).toEqual([{ field: 'diet', reason: 'not-supported' }]);
  });
});

describe('set', () => {
  it('writes only defined values', () => {
    const draft: Mutable<BriefDraft> = { city: 'Pune' };
    set(draft, 'city', undefined);
    set(draft, 'guests', 80);
    expect(draft).toEqual({ city: 'Pune', guests: 80 });
  });
});
