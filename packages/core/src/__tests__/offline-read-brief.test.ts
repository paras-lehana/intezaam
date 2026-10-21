/**
 * Tests for the offline twin of GenAI job 1 (the brief reader).
 *
 * Responsibility: the reply has the model's exact shape; number phrases are quoted as
 * written; evidence quotes are verbatim, deduplicated and within the quote limits; hidden
 * characters are stripped before reading; the missing core fields and the "understood" line
 * follow the readings. Boundary: shapes are checked with the same zod contract the server uses.
 */
import { describe, expect, it } from 'vitest';
import {
  readBriefOffline,
  CORE_BRIEF_FIELDS,
  MAX_EVIDENCE_QUOTE_CHARS,
} from '../offline/read-brief.js';
import { describeBrief } from '../offline/describe-brief.js';
import { briefModelOutputSchema } from '../schemas/brief.js';

const TODAY = '2026-10-20';

describe('readBriefOffline', () => {
  it('returns the model-output shape with the number phrases as written', () => {
    const reply = readBriefOffline('2 lakh mein 200 log, Diwali ke baad, Jaipur', TODAY);
    expect(briefModelOutputSchema.safeParse(reply).success).toBe(true);
    expect(reply).toMatchObject({
      budgetText: '2 lakh',
      guestsText: '200 log',
      city: 'Jaipur',
      month: 11,
    });
    expect(reply.missing).toEqual(['family']);
  });

  it('quotes a summed guest phrase whole when it is short enough', () => {
    expect(readBriefOffline('15k mein bday, 20 bachche aur 10 parents', TODAY).guestsText).toBe(
      '20 bachche aur 10 parents',
    );
  });

  it('quotes only the first count when the summed phrase would be too long', () => {
    const text =
      '20 bachche, plus all the cousins and neighbours we keep forgetting to count, and 10 parents';
    expect(readBriefOffline(text, TODAY).guestsText).toBe('20 bachche');
  });

  it('still quotes a refused number so the guard can say why it was dropped', () => {
    const reply = readBriefOffline('50000 log, 500 crore', TODAY);
    expect(reply).toMatchObject({ guestsText: '50000 log', budgetText: '500 crore' });
    expect(reply.missing).toEqual([...CORE_BRIEF_FIELDS]);
  });

  it('cites verbatim evidence once per quote and never a quote longer than the limit', () => {
    const long = `food is the most important thing for our family because ${'everyone '.repeat(14)}loves to eat`;
    const reply = readBriefOffline(`shaadi, shaadi. ${long}`, TODAY);
    const quotes = reply.evidence.map((entry) => `${entry.field}:${entry.quote}`);
    expect(new Set(quotes).size).toBe(quotes.length);
    expect(reply.evidence.every((entry) => entry.quote.length <= MAX_EVIDENCE_QUOTE_CHARS)).toBe(
      true,
    );
    expect(reply.evidence.some((entry) => entry.field === 'priorities')).toBe(false);
  });

  it('reads the brief after stripping hidden and reordering characters', () => {
    const reply = readBriefOffline('shaadi‮ 200⁦ log', TODAY);
    expect(reply.guestsText).toBe('200 log');
    expect(reply.evidence.every((entry) => !/[‮⁦]/u.test(entry.quote))).toBe(true);
  });

  it('writes the "understood" line from the parsed draft', () => {
    const reply = readBriefOffline('300 guests wedding in Jaipur, budget 25 lakh', TODAY);
    expect(reply.understood).toBe(
      describeBrief({
        family: 'wedding',
        kind: 'wedding',
        city: 'Jaipur',
        guests: 300,
        budgetInr: 2_500_000,
      }),
    );
  });
});
