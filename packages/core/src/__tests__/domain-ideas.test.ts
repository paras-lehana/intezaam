/**
 * Tests for domain/ideas.ts: the closed idea vocabularies.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import {
  COST_BAND_LABELS,
  COST_BANDS,
  EFFORT_LEVELS,
  IDEA_CATEGORIES,
  PLAN_SECTIONS,
  SIGNAL_KEYS,
} from '../domain/ideas.js';

describe('idea vocabularies', () => {
  it('are closed lists without duplicates', () => {
    for (const list of [IDEA_CATEGORIES, COST_BANDS, SIGNAL_KEYS, EFFORT_LEVELS, PLAN_SECTIONS]) {
      expect(new Set(list).size).toBe(list.length);
    }
  });

  it('labels every cost band in words, never in rupees', () => {
    for (const band of COST_BANDS) expect(COST_BAND_LABELS[band]).not.toMatch(/₹|\d/);
  });
});
