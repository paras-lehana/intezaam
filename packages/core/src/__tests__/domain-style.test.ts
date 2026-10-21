/**
 * Tests for domain/style.ts: that the 8-pair quiz covers every style tag once.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { STYLE_AXES, STYLE_QUIZ, STYLE_TAG_LABELS, STYLE_TAGS } from '../domain/style.js';

describe('style quiz (feature #30)', () => {
  it('eight A/B pairs cover every style tag exactly once', () => {
    expect(STYLE_AXES).toHaveLength(8);
    const answers = STYLE_AXES.flatMap((axis) => [STYLE_QUIZ[axis].a, STYLE_QUIZ[axis].b]);
    expect([...answers].sort()).toEqual([...STYLE_TAGS].sort());
  });

  it('every tag has a label and every question ends with a question mark', () => {
    for (const tag of STYLE_TAGS) expect(STYLE_TAG_LABELS[tag].length).toBeGreaterThan(0);
    for (const axis of STYLE_AXES) expect(STYLE_QUIZ[axis].question.endsWith('?')).toBe(true);
  });
});
