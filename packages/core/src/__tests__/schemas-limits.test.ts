/**
 * Tests for schemas/limits.ts: that every bound is consistent with its pair.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import {
  MAX_AMOUNT_INR,
  MAX_BRIEF_CHARS,
  MAX_BUDGET_INR,
  MAX_DAYS_AHEAD,
  MAX_DAYS_PAST,
  MAX_FOOTFALL,
  MAX_GUESTS,
  MAX_IDEAS,
  MAX_QUOTES,
  MIN_BRIEF_CHARS,
  MIN_GUESTS,
  MIN_IDEAS,
  MIN_QUESTION_CHARS,
  MAX_QUESTION_CHARS,
  MIN_QUOTES,
} from '../schemas/limits.js';

const DAYS_PER_YEAR = 365;

describe('limits', () => {
  it('every lower bound is below its upper bound', () => {
    expect(MIN_GUESTS).toBeLessThan(MAX_GUESTS);
    expect(MIN_BRIEF_CHARS).toBeLessThan(MAX_BRIEF_CHARS);
    expect(MIN_QUESTION_CHARS).toBeLessThan(MAX_QUESTION_CHARS);
    expect(MIN_IDEAS).toBeLessThan(MAX_IDEAS);
    expect(MIN_QUOTES).toBeLessThan(MAX_QUOTES);
  });

  it('computed amounts may exceed what a user can type, and footfall may exceed guests', () => {
    expect(MAX_AMOUNT_INR).toBeGreaterThan(MAX_BUDGET_INR);
    expect(MAX_FOOTFALL).toBeGreaterThan(MAX_GUESTS);
  });

  it('the planning window covers a full wedding lead time and a year of wrap-up', () => {
    expect(MAX_DAYS_AHEAD).toBeGreaterThan(DAYS_PER_YEAR);
    expect(MAX_DAYS_PAST).toBeGreaterThanOrEqual(DAYS_PER_YEAR);
  });
});
