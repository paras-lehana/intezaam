/**
 * Tests for schemas/responses.ts: response, health and error envelopes.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_MESSAGE_BY_CODE } from '../errors.js';
import {
  askResponseSchema,
  briefResponseSchema,
  draftResponseSchema,
  errorResponseSchema,
  healthResponseSchema,
  narrationResponseSchema,
  planResponseSchema,
  quotesResponseSchema,
  whatIfResponseSchema,
} from '../schemas/responses.js';
import { buildFixturePlan } from './fixtures/plan-fixture.js';

const provenance = {
  mode: 'offline',
  models: [],
  latencyMs: 3,
  steps: [{ name: 'plan', engine: 'rules', ms: 3 }],
};
const plan = buildFixturePlan();
const narration = {
  headline: 'Lean but workable',
  summary: 'Short summary.',
  reasons: [],
  actions: [],
  ideas: [],
};

describe('response schemas', () => {
  it('plan and what-if responses wrap whole plans', () => {
    expect(planResponseSchema.safeParse({ plan, narration, provenance }).success).toBe(true);
    const diff = {
      verdictChanged: false,
      money: { before: 'lean', after: 'lean' },
      time: { before: 'compressed', after: 'compressed' },
      totalDeltaInr: 0,
      budgetChanges: [],
      newRisks: [],
      resolvedRisks: [],
      taskChanges: [],
      vendorChanges: [],
    };
    expect(whatIfResponseSchema.safeParse({ before: plan, after: plan, diff }).success).toBe(true);
  });

  it('the narration-only response carries no plan, and the plan response is it plus the plan', () => {
    expect(narrationResponseSchema.safeParse({ narration, provenance }).success).toBe(true);
    expect(narrationResponseSchema.safeParse({ plan, narration, provenance }).success).toBe(false);
    expect(planResponseSchema.safeParse({ narration, provenance }).success).toBe(false);
  });

  it('brief, quotes, draft and ask responses carry provenance', () => {
    const brief = {
      draft: { city: 'Jaipur' },
      filled: ['city'],
      missing: ['date'],
      understood: 'A wedding.',
      provenance,
    };
    expect(briefResponseSchema.safeParse(brief).success).toBe(true);
    const quotes = { quotes: [], normalised: [], differences: [], questions: [], provenance };
    expect(quotesResponseSchema.safeParse(quotes).success).toBe(true);
    const draft = { body: 'Namaste!', whatsappUrl: 'https://wa.me/?text=Namaste', provenance };
    expect(draftResponseSchema.safeParse(draft).success).toBe(true);
    expect(
      askResponseSchema.safeParse({ answer: 'Book the venue.', sources: ['timeline'], provenance })
        .success,
    ).toBe(true);
    expect(askResponseSchema.safeParse({ answer: 'Book the venue.', sources: [] }).success).toBe(
      false,
    );
  });

  it('health and error envelopes are strict', () => {
    const health = {
      status: 'ok',
      version: '0.1.0',
      ai: { configured: true, models: ['gemini-3.5-flash-lite'] },
    };
    expect(healthResponseSchema.safeParse(health).success).toBe(true);
    expect(healthResponseSchema.safeParse({ ...health, status: 'degraded' }).success).toBe(false);
    const error = {
      error: { code: 'RATE_LIMITED', message: DEFAULT_MESSAGE_BY_CODE.RATE_LIMITED },
    };
    expect(errorResponseSchema.safeParse(error).success).toBe(true);
    expect(errorResponseSchema.safeParse({ error: { code: 'TEAPOT', message: 'x' } }).success).toBe(
      false,
    );
  });
});
