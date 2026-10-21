/**
 * Tests for schemas/plan.ts: the full plan contract against a table-derived fixture.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { contextEchoSchema, planSchema } from '../schemas/plan.js';
import { buildFixturePlan } from './fixtures/plan-fixture.js';

describe('planSchema', () => {
  it('accepts a plan assembled from the domain tables', () => {
    const result = planSchema.safeParse(buildFixturePlan());
    expect(result.success ? [] : result.error.issues).toEqual([]);
  });

  it('accepts optional community data and hashtags', () => {
    const plan = buildFixturePlan();
    expect(planSchema.safeParse({ ...plan, hashtags: ['#RoyalJaipurShaadi'] }).success).toBe(true);
    expect(planSchema.safeParse({ ...plan, hashtags: ['no-hash'] }).success).toBe(false);
  });

  it('rejects unknown keys and a missing section', () => {
    const plan = buildFixturePlan();
    expect(planSchema.safeParse({ ...plan, extra: 1 }).success).toBe(false);
    const { verdict: _verdict, ...withoutVerdict } = plan;
    expect(planSchema.safeParse(withoutVerdict).success).toBe(false);
  });

  it('the context echo rejects a month outside 1–12 and an unknown tier source', () => {
    const echo = buildFixturePlan().contextEcho;
    expect(contextEchoSchema.safeParse(echo).success).toBe(true);
    expect(
      contextEchoSchema.safeParse({ ...echo, season: { ...echo.season, month: 13 } }).success,
    ).toBe(false);
    expect(contextEchoSchema.safeParse({ ...echo, tierSource: 'guess' }).success).toBe(false);
  });
});
