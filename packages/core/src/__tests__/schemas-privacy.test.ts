/**
 * Tests for schemas/privacy.ts: the redaction vocabulary and its counts.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { REDACTION_TYPES, redactionCountSchema } from '../schemas/privacy.js';

describe('redaction counts', () => {
  it('cover Indian identifiers and count at least one each', () => {
    expect(REDACTION_TYPES).toContain('aadhaar');
    expect(REDACTION_TYPES).toContain('upi');
    expect(redactionCountSchema.safeParse({ type: 'phone', count: 2 }).success).toBe(true);
    expect(redactionCountSchema.safeParse({ type: 'phone', count: 0 }).success).toBe(false);
    expect(redactionCountSchema.safeParse({ type: 'passport', count: 1 }).success).toBe(false);
  });
});
