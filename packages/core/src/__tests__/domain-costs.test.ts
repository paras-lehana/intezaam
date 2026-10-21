/**
 * Tests for domain/costs.ts: birthday bands, kids'-party item prices and the late-gift markup.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import {
  BIRTHDAY_BANDS,
  KIDS_PARTY_ITEMS_INR,
  LATE_RETURN_GIFT_MARKUP_PCT,
  WEDDING_BANDS,
} from '../domain/costs.js';

describe('wedding spending columns', () => {
  it('are the three VK columns, cheapest first', () => {
    expect(WEDDING_BANDS).toEqual(['budget', 'mid', 'luxury']);
  });
});

describe('birthday bands', () => {
  it('ranges are ordered and an open top band has no maximum', () => {
    for (const bands of Object.values(BIRTHDAY_BANDS)) {
      for (const band of bands) {
        expect(band.guests.min).toBeLessThanOrEqual(band.guests.max);
        if (band.inr.max !== null) expect(band.inr.min).toBeLessThan(band.inr.max);
      }
    }
    expect(BIRTHDAY_BANDS['kids-birthday'].at(-1)?.inr.max).toBeNull();
  });

  it("kids'-party item prices are ordered ranges", () => {
    for (const item of Object.values(KIDS_PARTY_ITEMS_INR)) expect(item.min).toBeLessThan(item.max);
    expect(KIDS_PARTY_ITEMS_INR.returnGiftStandard.max).toBeLessThan(
      KIDS_PARTY_ITEMS_INR.returnGiftPremium.min,
    );
  });

  it('buying return gifts late costs more, as an ordered percentage range', () => {
    expect(LATE_RETURN_GIFT_MARKUP_PCT.min).toBeGreaterThan(0);
    expect(LATE_RETURN_GIFT_MARKUP_PCT.min).toBeLessThan(LATE_RETURN_GIFT_MARKUP_PCT.max);
  });
});
