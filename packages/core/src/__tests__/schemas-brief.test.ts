/**
 * Tests for schemas/brief.ts: the brief model output and the validated draft.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { BRIEF_FIELDS, briefDraftSchema, briefModelOutputSchema } from '../schemas/brief.js';

const BRIEF = '2 lakh mein 200 log, Diwali ke baad, Jaipur, shaadi';

describe('brief model output (job 1)', () => {
  it('accepts number phrases as text, with evidence quotes and missing fields', () => {
    const output = {
      family: 'wedding',
      kind: 'wedding',
      city: 'Jaipur',
      guestsText: '200 log',
      budgetText: '2 lakh',
      evidence: [
        { field: 'guests', quote: '200 log' },
        { field: 'budget', quote: '2 lakh' },
      ],
      missing: ['date', 'tradition'],
      understood: 'A 200-guest wedding in Jaipur after Diwali.',
    };
    expect(briefModelOutputSchema.safeParse(output).success).toBe(true);
    for (const item of output.evidence) expect(BRIEF.includes(item.quote)).toBe(true);
  });

  it('rejects free-form vocabularies and parsed numbers from the model', () => {
    const base = { evidence: [], missing: [], understood: '' };
    expect(briefModelOutputSchema.safeParse({ ...base, tradition: 'hindu-ish' }).success).toBe(
      false,
    );
    expect(briefModelOutputSchema.safeParse({ ...base, guests: 200 }).success).toBe(false);
    expect(briefModelOutputSchema.safeParse({ ...base, missing: ['mood'] }).success).toBe(false);
  });
});

describe('brief draft', () => {
  it('carries code-parsed numbers and every field is optional', () => {
    expect(briefDraftSchema.safeParse({}).success).toBe(true);
    expect(briefDraftSchema.safeParse({ guests: 200, budgetInr: 200_000, month: 11 }).success).toBe(
      true,
    );
    expect(briefDraftSchema.safeParse({ guestsText: '200 log' }).success).toBe(false);
    expect(briefDraftSchema.safeParse({ month: 13 }).success).toBe(false);
  });

  it('brief fields have no duplicates', () => {
    expect(new Set(BRIEF_FIELDS).size).toBe(BRIEF_FIELDS.length);
  });
});
