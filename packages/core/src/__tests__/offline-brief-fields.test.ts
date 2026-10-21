/**
 * Tests for the brief field readers that both the offline reader and the evidence guard use.
 *
 * Responsibility: language, summed guests and range ends, the first money phrase as the
 * budget, limits refused with a reason, the birthday kind proven by its age, wedding-only
 * functions and traditions, dates, diet and the other preference fields. Boundary: limits
 * come from schemas/limits.ts; values are read from inputs the tests write.
 */
import { describe, expect, it } from 'vitest';
import { readBriefFields } from '../offline/brief-fields.js';
import { tokenise } from '../offline/tokens.js';
import { MAX_BUDGET_INR, MAX_GUESTS } from '../schemas/limits.js';

const TODAY = '2026-10-20';

function fields(text: string): ReturnType<typeof readBriefFields> {
  return readBriefFields(tokenise(text).tokens, TODAY);
}

describe('readBriefFields', () => {
  it('detects Hindi from Devanagari and English otherwise', () => {
    expect(fields('२०० लोग').language).toBe('hi');
    expect(fields('200 log').language).toBe('en');
  });

  it('sums people counts and plans a guest range at its upper end', () => {
    expect(fields('20 bachche aur 10 parents').guests?.value).toBe(30);
    expect(fields('100-120 log').guests?.value).toBe(120);
  });

  it('takes the first money phrase as the budget and a range at its lower end', () => {
    expect(fields('20-25 lakh, then 5 lakh more').budget?.value).toBe(2_000_000);
  });

  it('refuses numbers outside the limits with a reason instead of clamping', () => {
    const big = fields(`${MAX_GUESTS + 1} log, ${MAX_BUDGET_INR / 10_000_000 + 1} crore`);
    expect(big.guests).toBeUndefined();
    expect(big.budget).toBeUndefined();
    expect(big.rejected.map((entry) => [entry.field, entry.reason])).toEqual([
      ['guests', 'above-limit'],
      ['budget', 'above-limit'],
    ]);
    const small = fields('0 log, ₹0');
    expect(small.rejected.map((entry) => [entry.field, entry.reason])).toEqual([
      ['guests', 'below-limit'],
      ['budget', 'below-limit'],
    ]);
  });

  it('proves a birthday kind with its age as well as the word', () => {
    const reading = fields('unka 70th birthday');
    expect(reading.kind?.value).toBe('milestone-birthday');
    expect(reading.kind?.spans.length).toBeGreaterThan(reading.family?.spans.length ?? 0);
  });

  it('reads functions and a tradition for weddings only', () => {
    const wedding = fields('Punjabi shaadi with haldi and sangeet');
    expect(wedding.functions?.value).toEqual(['haldi', 'sangeet', 'wedding']);
    expect(wedding.tradition?.value).toBe('punjabi-sikh');
    const birthday = fields('Punjabi birthday party');
    expect(birthday.tradition).toBeUndefined();
    expect(birthday.functions).toBeUndefined();
    expect(fields('shaadi in Jaipur').functions).toBeUndefined();
  });

  it('reads a fixed date, an open month or an open date', () => {
    expect(fields('25 Nov 2026').date?.value).toEqual({ flexible: false, dateIso: '2026-11-25' });
    expect(fields('agle mahine').date?.value).toEqual({ flexible: true, month: 11 });
    expect(fields('agle saal').date?.value).toEqual({ flexible: true });
  });

  it('reads the diet menu with the halal flag, or halal alone', () => {
    expect(fields('non veg, halal only').diet?.value).toEqual({ menu: 'mixed', halal: true });
    expect(fields('halal khana').diet?.value).toEqual({ halal: true });
    expect(fields('no food words').diet).toBeUndefined();
  });

  it('reads city, setting, alcohol, access, style, priorities and cut', () => {
    const reading = fields(
      'Jaipur lawn, open bar, Nani in a wheelchair, royal floral, food is a priority, skip dj',
    );
    expect(reading.city?.value).toBe('Jaipur');
    expect(reading.venueSetting?.value).toBe('outdoor');
    expect(reading.alcohol?.value).toBe(true);
    expect(reading.accessibility?.value).toEqual(['elderly', 'wheelchair']);
    expect(reading.styleTags?.value).toEqual(['royal', 'floral']);
    expect(reading.priorities?.value).toEqual(['catering']);
    expect(reading.cut?.value).toBe('entertainment');
  });

  it('leaves every field empty for text that states nothing', () => {
    expect(fields('hello there')).toEqual({ language: 'en', hinglish: false, rejected: [] });
  });

  it('labels Hindi in Latin script Hinglish only with two different Hindi words', () => {
    expect(fields('Beti ki shaadi Jaipur mein').hinglish).toBe(true);
    expect(fields('Wedding in Jaipur, 300 guests').hinglish).toBe(false);
    expect(fields('Party ki tayyari').hinglish).toBe(false);
    expect(fields('बेटी की शादी जयपुर में').hinglish).toBe(false);
  });
});
