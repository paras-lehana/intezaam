/**
 * Tests for schemas/context.ts: the context contract and each cross-field rule.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { SAMPLE_IDS, sampleContext } from '../domain/samples.js';
import { redactPii } from '../privacy/redact.js';
import {
  type EventContext,
  eventContextFieldsSchema,
  eventContextSchema,
} from '../schemas/context.js';
import { MAX_BUDGET_INR, MAX_FUNCTIONS, MAX_GUESTS } from '../schemas/limits.js';
import { FIXTURE_TODAY, fixtureContext } from './fixtures/plan-parts.js';

function issuesFor(context: unknown): string[] {
  const result = eventContextSchema.safeParse(context);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
}

const base: EventContext = fixtureContext();

describe('eventContextSchema', () => {
  it('accepts every sample', () => {
    for (const id of SAMPLE_IDS) expect(issuesFor(sampleContext(id, FIXTURE_TODAY))).toEqual([]);
  });

  it('treats a missing budget as "estimate it for me" and a flexible date as valid', () => {
    const { budgetInr: _budget, dateIso: _date, ...rest } = base;
    expect(issuesFor({ ...rest, dateFlexible: true })).toEqual([]);
  });

  it('rejects unknown keys and out-of-range numbers', () => {
    expect(issuesFor({ ...base, surprise: true })).not.toEqual([]);
    expect(issuesFor({ ...base, guests: MAX_GUESTS + 1 })).toEqual(['guests']);
    expect(issuesFor({ ...base, budgetInr: MAX_BUDGET_INR + 1 })).toEqual(['budgetInr']);
    expect(issuesFor({ ...base, outstationShare: 2 })).toEqual(['outstationShare']);
  });

  it('enforces the cross-field rules', () => {
    expect(issuesFor({ ...base, kind: 'kids-birthday' })).toContain('kind');
    expect(issuesFor({ ...base, dateIso: undefined, dateFlexible: false })).toContain('dateIso');
    expect(issuesFor({ ...base, functions: ['wedding', 'wedding'] })).toContain('functions');
    expect(issuesFor({ ...base, functions: ['bhog'] })).toContain('functions');
    expect(issuesFor({ ...base, guestsByFunction: { haldi: 50 } })).toContain('guestsByFunction');
    expect(issuesFor({ ...base, priorities: ['decor', 'decor'] })).toContain('priorities');
    expect(issuesFor({ ...base, cut: 'catering' })).toContain('cut');
    expect(issuesFor({ ...base, birthday: { age: 30 } })).toContain('birthday');
    expect(issuesFor({ ...base, community: { premises: 'public', days: 1 } })).toContain(
      'community',
    );
  });

  it('accepts per-function guest counts for planned functions and caps the function list', () => {
    expect(issuesFor({ ...base, guestsByFunction: { sangeet: 200 } })).toEqual([]);
    const tooMany = Array.from({ length: MAX_FUNCTIONS + 1 }, () => 'wedding');
    expect(issuesFor({ ...base, functions: tooMany })).toContain('functions');
  });

  it('hands the city and title on sanitised and PII-redacted', () => {
    const phone = '9876543210';
    const parsed = eventContextSchema.parse({
      ...base,
      city: `Ring ${phone} \u{202E}evil\u{E0001}`,
      title: `Riya weds Kabir, call ${phone}`,
    });
    for (const text of [parsed.city, parsed.title ?? '']) {
      expect(text).not.toContain(phone);
      expect(text).toContain(redactPii(phone).text);
    }
    expect(parsed.city).not.toMatch(/[\u{202E}\u{E0001}]/u);
    expect(issuesFor({ ...base, city: '\u{200B}\u{202E}' })).toEqual(['city']);
  });

  it('the unrefined field schema allows partial use for drafts', () => {
    expect(eventContextFieldsSchema.partial().safeParse({ city: 'Pune' }).success).toBe(true);
  });
});
