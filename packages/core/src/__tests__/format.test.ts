/**
 * Tests for format.ts: Indian rupee grouping, lakh/crore shorthand and text clipping.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { CRORE_INR, LAKH_INR } from '../domain/units.js';
import {
  clipText,
  formatDays,
  formatInr,
  formatInrRange,
  formatLakh,
  formatMonths,
  formatPercent,
} from '../format.js';

describe('formatInr', () => {
  it('uses Indian digit grouping and whole rupees', () => {
    expect(formatInr(150000)).toBe('₹1,50,000');
    expect(formatInr(12345678.6)).toBe('₹1,23,45,679');
    expect(formatInr(0)).toBe('₹0');
  });

  it('keeps the sign in front of the rupee symbol', () => {
    expect(formatInr(-2500)).toBe('-₹2,500');
  });
});

describe('formatLakh', () => {
  it('uses lakh and crore shorthand with one decimal', () => {
    expect(formatLakh(25 * LAKH_INR)).toBe('₹25 L');
    expect(formatLakh(2.5 * LAKH_INR)).toBe('₹2.5 L');
    expect(formatLakh(1.2 * CRORE_INR)).toBe('₹1.2 Cr');
    expect(formatLakh(-3 * LAKH_INR)).toBe('-₹3 L');
  });

  it('falls back to full digits below one lakh', () => {
    expect(formatLakh(45000)).toBe('₹45,000');
  });

  it('formats ranges and collapses equal ends', () => {
    expect(formatInrRange(28 * LAKH_INR, 48 * LAKH_INR)).toBe('₹28 L–₹48 L');
    expect(formatInrRange(LAKH_INR, LAKH_INR)).toBe('₹1 L');
  });
});

describe('days, months, percentages and clipping', () => {
  it('pluralises days and months', () => {
    expect(formatDays(1)).toBe('1 day');
    expect(formatDays(36)).toBe('36 days');
    expect(formatMonths(1)).toBe('1 month');
    expect(formatMonths(0.25)).toBe('0.25 months');
  });

  it('formats percentages with up to two decimals', () => {
    expect(formatPercent(8.5)).toBe('8.5%');
    expect(formatPercent(10)).toBe('10%');
  });

  it('clips on a word boundary and leaves short text alone', () => {
    expect(clipText('one two three', 9)).toBe('one two…');
    expect(clipText('one two three', 8)).toBe('one…');
    expect(clipText('  short  ', 20)).toBe('short');
    expect(clipText('abcdefghij', 5)).toBe('abcd…');
  });
});
