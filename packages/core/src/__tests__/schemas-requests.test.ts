/**
 * Tests for schemas/requests.ts: request contracts, the planning date window, and that the
 * validated context's free text is what the narration and draft prompts receive.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed;
 * plans come from the real engine.
 */
import { describe, expect, it } from 'vitest';
import { addDaysIso } from '../domain/calendar.js';
import { buildDraftFacts } from '../genai/draft-facts.js';
import { ideaConstraintsFor } from '../genai/idea-constraints.js';
import { buildDraftPrompt } from '../genai/prompts-drafts.js';
import { buildNarrationPrompt } from '../genai/prompts-narration.js';
import {
  MAX_BRIEF_CHARS,
  MAX_DAYS_AHEAD,
  MAX_DAYS_PAST,
  MAX_HISTORY_TURNS,
  MAX_QUOTES,
} from '../schemas/limits.js';
import {
  askRequestSchema,
  briefRequestSchema,
  draftRequestSchema,
  isWithinPlanningWindow,
  planRequestSchema,
  quotesRequestSchema,
  whatIfRequestSchema,
} from '../schemas/requests.js';
import { NONCE, plannedContext } from './fixtures/genai-plans.js';
import { FIXTURE_TODAY, fixtureContext } from './fixtures/plan-parts.js';

const context = fixtureContext();
const today = FIXTURE_TODAY;

describe('planning window', () => {
  it('accepts undated contexts and dates inside the window, inclusive', () => {
    expect(isWithinPlanningWindow(undefined, today)).toBe(true);
    expect(isWithinPlanningWindow(addDaysIso(today, MAX_DAYS_AHEAD), today)).toBe(true);
    expect(isWithinPlanningWindow(addDaysIso(today, -MAX_DAYS_PAST), today)).toBe(true);
  });

  it('rejects dates outside the window and an unusable today', () => {
    expect(isWithinPlanningWindow(addDaysIso(today, MAX_DAYS_AHEAD + 1), today)).toBe(false);
    expect(isWithinPlanningWindow(addDaysIso(today, -MAX_DAYS_PAST - 1), today)).toBe(false);
    expect(isWithinPlanningWindow('2026-11-25', 'yesterday')).toBe(false);
  });
});

describe('request schemas', () => {
  it('plan and what-if requests check the date window at context.dateIso', () => {
    expect(planRequestSchema.safeParse({ context, todayIso: today }).success).toBe(true);
    const far = { ...context, dateIso: addDaysIso(today, MAX_DAYS_AHEAD + 1) };
    const result = planRequestSchema.safeParse({ context: far, todayIso: today });
    expect(result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'))).toEqual([
      'context.dateIso',
    ]);
    const patch = { ops: [{ op: 'setGuests', value: 250 }] };
    expect(whatIfRequestSchema.safeParse({ context, patch, todayIso: today }).success).toBe(true);
  });

  it('briefs are bounded and strict', () => {
    expect(
      briefRequestSchema.safeParse({ text: 'shaadi in Jaipur', todayIso: today }).success,
    ).toBe(true);
    expect(
      briefRequestSchema.safeParse({ text: 'x'.repeat(MAX_BRIEF_CHARS + 1), todayIso: today })
        .success,
    ).toBe(false);
    expect(
      briefRequestSchema.safeParse({ text: 'shaadi', todayIso: today, admin: true }).success,
    ).toBe(false);
  });

  it('quotes take one to three pasted texts for a known vendor type', () => {
    const quotes = [{ id: 'q1', text: 'Veg plate ₹1,400 + GST' }];
    expect(
      quotesRequestSchema.safeParse({ context, todayIso: today, category: 'caterer', quotes })
        .success,
    ).toBe(true);
    const tooMany = Array.from({ length: MAX_QUOTES + 1 }, (_, index) => ({
      id: `q${index}`,
      text: 'x',
    }));
    expect(
      quotesRequestSchema.safeParse({
        context,
        todayIso: today,
        category: 'caterer',
        quotes: tooMany,
      }).success,
    ).toBe(false);
  });

  it('drafts need a known kind, language and tone', () => {
    const draft = {
      context,
      todayIso: today,
      kind: 'vendor-enquiry',
      language: 'hi',
      tone: 'warm',
      vendorType: 'caterer',
    };
    expect(draftRequestSchema.safeParse(draft).success).toBe(true);
    expect(draftRequestSchema.safeParse({ ...draft, kind: 'love-letter' }).success).toBe(false);
  });

  it('ask keeps a short history', () => {
    const turn = { question: 'Is my budget enough?', answer: 'It is lean.' };
    const ask = {
      context,
      todayIso: today,
      question: 'What should I book first?',
      history: [turn],
    };
    expect(askRequestSchema.safeParse(ask).success).toBe(true);
    const long = Array.from({ length: MAX_HISTORY_TURNS + 1 }, () => turn);
    expect(askRequestSchema.safeParse({ ...ask, history: long }).success).toBe(false);
  });
});

describe('a city outside the gazetteer, on its way to a prompt', () => {
  const PHONE = '9876543210';
  /** The probe from the security review: a phone, a right-to-left override, tag characters. */
  const typedCity = `Ring ${PHONE} \u{202E}evil\u{E0001}\u{E0065}`;
  const HIDDEN = /[\u{202E}\u{E0000}-\u{E007F}]/u;
  const typedContext = { ...context, city: typedCity };

  function expectClean(prompt: string, city: string): void {
    // The cleaned city does reach the prompt, so the absence checks below are meaningful.
    expect(prompt).toContain(city);
    expect(prompt).not.toContain(PHONE);
    expect(prompt).not.toMatch(HIDDEN);
  }

  it('the plan request hands the narrator a sanitised, redacted city', () => {
    const request = planRequestSchema.parse({ context: typedContext, todayIso: today });
    const { plan, facts } = plannedContext(request.context);
    const { prompt } = buildNarrationPrompt({
      plan,
      facts,
      constraints: ideaConstraintsFor(plan, request.context),
      language: 'en',
      nonce: NONCE,
    });
    expectClean(prompt, request.context.city);
  });

  it('the draft request hands the drafter a sanitised, redacted city', () => {
    const request = draftRequestSchema.parse({
      context: typedContext,
      todayIso: today,
      kind: 'invitation',
      language: 'en',
      tone: 'warm',
    });
    const { plan } = plannedContext(request.context);
    const { prompt } = buildDraftPrompt({
      kind: request.kind,
      language: request.language,
      tone: request.tone,
      facts: buildDraftFacts(plan, { kind: request.kind }),
      nonce: NONCE,
    });
    expectClean(prompt, request.context.city);
  });
});
