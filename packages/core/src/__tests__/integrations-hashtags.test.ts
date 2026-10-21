/**
 * Tests for the couple hashtag blends (ported from bio-bandish `hashtag_blends`).
 *
 * Responsibility: the documented example, deduplication, the 3–30 letter bound and the
 * Latin-only rule. Boundary: string checks only.
 */
import { describe, expect, it } from 'vitest';
import { hashtagBlends } from '../integrations/hashtags.js';

describe('hashtagBlends', () => {
  it('blends two first names the way the original planner did', () => {
    expect(hashtagBlends('Rahul', 'Preeti')).toEqual([
      '#Rahuti',
      '#Prehul',
      '#RahulWedsPreeti',
      '#PreetiWedsRahul',
      '#RahulKiPreeti',
      '#RahulPreetiForever',
    ]);
  });

  it('title-cases names and drops spaces, digits and punctuation', () => {
    const tags = hashtagBlends(' riya-2 ', 'ARJUN');
    expect(tags).toContain('#RiyaWedsArjun');
    expect(tags.every((tag) => /^#[A-Za-z]+$/.test(tag))).toBe(true);
  });

  it('returns nothing for names without Latin letters rather than broken tags', () => {
    expect(hashtagBlends('रिया', 'Arjun')).toEqual([]);
    expect(hashtagBlends('Riya', '')).toEqual([]);
  });

  it('deduplicates and keeps every tag between 3 and 30 letters', () => {
    const tags = hashtagBlends('Al', 'Al');
    expect(new Set(tags).size).toBe(tags.length);
    const long = hashtagBlends('Bartholomewalexander', 'Maximiliananastasia');
    expect(long.every((tag) => tag.length - 1 >= 3 && tag.length - 1 <= 30)).toBe(true);
    expect(long).not.toContain('#BartholomewalexanderWedsMaximiliananastasia');
  });
});
