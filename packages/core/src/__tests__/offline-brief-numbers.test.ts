/**
 * Tests for offline/brief-numbers.ts: guests, budget, households and days read from number
 * mentions, with values outside the limits refused rather than clamped.
 *
 * Responsibility: pin the four number readers and their order of rejection. Boundary: inputs
 * are typed phrases; limits come from schemas/limits.ts, never re-typed.
 */
import { describe, expect, it } from 'vitest';
import { NUMBER_FIELDS, readNumberFields, spansOf } from '../offline/brief-numbers.js';
import { readNumberMentions } from '../offline/number-roles.js';
import { tokenise } from '../offline/tokens.js';
import { MAX_EVENT_DAYS, MAX_HOUSEHOLDS } from '../schemas/limits.js';

function numbers(text: string): ReturnType<typeof readNumberFields> {
  return readNumberFields(readNumberMentions(tokenise(text).tokens));
}

describe('readNumberFields', () => {
  it('reads households and days for a society festival, and keeps flats out of the guest count', () => {
    const read = numbers(
      'Ganesh Chaturthi in our housing society, 150 flats, ₹1.5 lakh pool, 10 days',
    );
    expect(read.values.households?.value).toBe(150);
    expect(read.values.days?.value).toBe(10);
    expect(read.values.budget?.value).toBe(150_000);
    expect(read.values.guests).toBeUndefined();
    expect(read.rejected).toEqual([]);
  });

  it('sums people nouns into guests and reads Hindi day and flat words', () => {
    expect(numbers('20 bachche aur 10 parents').values.guests?.value).toBe(30);
    const hindi = numbers('१५० फ्लैट, १० दिन');
    expect(hindi.values.households?.value).toBe(150);
    expect(hindi.values.days?.value).toBe(10);
  });

  it('refuses households and days above their limits with a reason, in field order', () => {
    const read = numbers(`${MAX_HOUSEHOLDS + 1} flats, ${MAX_EVENT_DAYS + 1} days`);
    expect(read.values.households).toBeUndefined();
    expect(read.values.days).toBeUndefined();
    expect(read.rejected.map((entry) => [entry.field, entry.reason])).toEqual([
      ['households', 'above-limit'],
      ['days', 'above-limit'],
    ]);
  });

  it('reads every number field the contract names, guests first', () => {
    expect(NUMBER_FIELDS[0]).toBe('guests');
    expect(Object.keys(numbers('200 log, 2 lakh, 150 flats, 3 din').values).sort()).toEqual(
      [...NUMBER_FIELDS].sort(),
    );
  });

  it('turns mentions into token spans', () => {
    const mentions = readNumberMentions(tokenise('150 flats').tokens);
    expect(spansOf(mentions)).toEqual(
      mentions.map((mention) => ({ start: mention.start, end: mention.end })),
    );
  });
});
