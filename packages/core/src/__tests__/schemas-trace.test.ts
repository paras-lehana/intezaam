/**
 * Tests for schemas/trace.ts: trace items and source references.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { sourceRef } from '../domain/sources.js';
import { sourceIdSchema, sourceRefSchema, traceItemSchema } from '../schemas/trace.js';
import { fixtureTrace } from './fixtures/plan-parts.js';

describe('trace contracts', () => {
  it('accepts trace items built from the rules table', () => {
    for (const item of fixtureTrace()) expect(traceItemSchema.safeParse(item).success).toBe(true);
  });

  it('rejects an unknown rule id or an extra key', () => {
    const [item] = fixtureTrace();
    expect(traceItemSchema.safeParse({ ...item, ruleId: 'BUD-99' }).success).toBe(false);
    expect(traceItemSchema.safeParse({ ...item, note: 'x' }).success).toBe(false);
  });

  it('source references follow the register shape', () => {
    expect(sourceRefSchema.safeParse(sourceRef('S-IMD-2020')).success).toBe(true);
    expect(sourceRefSchema.safeParse({ ...sourceRef('S-IMD-2020'), year: 1700 }).success).toBe(
      false,
    );
    expect(
      sourceRefSchema.safeParse({ ...sourceRef('S-IMD-2020'), url: 'not a url' }).success,
    ).toBe(false);
    expect(sourceIdSchema.safeParse('S-VK-2026').success).toBe(true);
    expect(sourceIdSchema.safeParse('vk-2026').success).toBe(false);
  });
});
