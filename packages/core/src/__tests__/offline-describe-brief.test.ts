/**
 * Tests for the one-line brief summary and the short date format.
 *
 * Responsibility: the article, subject, place, date, open date and budget parts of the
 * "understood" line, its length cap, and short dates. Boundary: labels come from the event
 * tables and money from formatLakh, so no copy is hand-written here except the frame.
 */
import { describe, expect, it } from 'vitest';
import { EVENT_KIND_PROFILES } from '../domain/event-kinds.js';
import { FAMILY_PROFILES } from '../domain/events.js';
import { formatLakh } from '../format.js';
import { describeBrief, formatShortDate, MAX_UNDERSTOOD_CHARS } from '../offline/describe-brief.js';

describe('formatShortDate', () => {
  it('writes a day, a three-letter month and the year', () => {
    expect(formatShortDate('2026-11-25')).toBe('25 Nov 2026');
    expect(formatShortDate('2027-02-05')).toBe('5 Feb 2027');
  });

  it('returns anything that is not an ISO date unchanged', () => {
    expect(formatShortDate('soon')).toBe('soon');
  });
});

describe('describeBrief', () => {
  it('describes guests, kind, city, date and budget', () => {
    const kind = EVENT_KIND_PROFILES.wedding.label.toLowerCase();
    expect(
      describeBrief({
        kind: 'wedding',
        guests: 300,
        city: 'Jaipur',
        dateIso: '2026-11-25',
        budgetInr: 2_500_000,
      }),
    ).toBe(`A 300-guest ${kind} in Jaipur on 25 Nov 2026, budget ${formatLakh(2_500_000)}.`);
  });

  it('uses "An" before a vowel and falls back from kind to family to "celebration"', () => {
    expect(describeBrief({ kind: 'engagement' })).toBe(
      `An ${EVENT_KIND_PROFILES.engagement.label.toLowerCase()}.`,
    );
    expect(describeBrief({ family: 'birthday' })).toBe(
      `A ${FAMILY_PROFILES.birthday.label.toLowerCase()}.`,
    );
    expect(describeBrief({})).toBe('A celebration.');
  });

  it('says a month, or that the date is open', () => {
    expect(describeBrief({ month: 12 })).toBe('A celebration in December.');
    expect(describeBrief({ dateFlexible: true })).toBe('A celebration, date not fixed yet.');
    expect(describeBrief({ dateFlexible: false })).toBe('A celebration.');
  });

  it('never exceeds the response limit', () => {
    const line = describeBrief({ city: 'X'.repeat(MAX_UNDERSTOOD_CHARS * 2) });
    expect(line.length).toBe(MAX_UNDERSTOOD_CHARS);
  });
});
