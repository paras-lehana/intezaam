/**
 * Tests for engine/estimate.ts — the typical cost of a plan (feature #5, VER-M).
 *
 * Responsibility: prove weddings scale the city's mid-range row per billable guest and gross
 * up from event spend (a 60th too: it shares the wedding rows), kids' and first birthdays
 * use the published party band by setting and size (teens × 1.2, open-ended bands use their
 * minimum), committee events use their own heads, and other events gross up the bottom-up
 * catering by the base split's catering share. Boundary: expected values derive
 * from the domain tables and the engine's own helpers.
 */
import { describe, expect, it } from 'vitest';
import { BASIS_POINTS_TOTAL, baseSplitFor } from '../domain/budget-splits.js';
import { BIRTHDAY_BANDS, TEEN_BAND_FACTOR } from '../domain/costs.js';
import { computeShares } from '../engine/budget-shares.js';
import { cateringRange } from '../engine/catering.js';
import { estimateSpend, partyBandFor } from '../engine/estimate.js';
import { expectedGuests } from '../engine/headcount.js';
import {
  BAND_BASIS_GUESTS,
  billableGuests,
  eventSpendShareBp,
  weddingRow,
} from '../engine/money-bands.js';
import { communityEstimate } from '../engine/community-money.js';
import { moneyModelOf } from '../engine/money-model.js';
import {
  birthday,
  classified,
  community,
  homePuja,
  sample,
  wedding,
} from './fixtures/engine-contexts.js';

const kidsBands = BIRTHDAY_BANDS['kids-birthday'];

describe('partyBandFor', () => {
  it('picks the home band at home and the first band that fits otherwise', () => {
    expect(partyBandFor(classified(birthday({ venueSetting: 'home' })))?.band.setting).toBe('home');
    const children = birthday().birthday?.kidsCount ?? 0;
    const expected = kidsBands.find((b) => b.setting !== 'home' && children <= b.guests.max);
    expect(partyBandFor(classified(birthday()))?.band).toBe(expected);
  });

  it('falls back to the largest band for a very large party and uses its minimum when open', () => {
    const big = partyBandFor(classified(birthday({ guests: 400, birthday: { kidsCount: 400 } })));
    const last = kidsBands.at(-1);
    expect(big?.band).toBe(last);
    expect(big?.max).toBe(last?.inr.max ?? last?.inr.min);
  });

  it('scales the kids’ bands for teens and returns null for kinds without bands', () => {
    const teen = partyBandFor(classified(birthday({ kind: 'teen-birthday' })));
    const kid = partyBandFor(classified(birthday()));
    expect(teen?.min).toBe(Math.round((kid?.band.inr.min ?? 0) * TEEN_BAND_FACTOR));
    expect(partyBandFor(classified(birthday({ kind: 'milestone-birthday' })))).toBeNull();
    expect(partyBandFor(classified(wedding()))).toBeNull();
  });
});

describe('estimateSpend', () => {
  it('scales the wedding mid-range row per billable guest and grosses it up', () => {
    const ctx = classified(wedding());
    const { row } = weddingRow(ctx);
    const billable = billableGuests(expectedGuests(ctx));
    const shareBp = eventSpendShareBp(computeShares(ctx).shares);
    const gross = (amount: number): number =>
      Math.round((amount * billable * BASIS_POINTS_TOTAL) / (BAND_BASIS_GUESTS * shareBp));
    expect(estimateSpend(ctx)).toEqual({
      low: gross(row.mid.min),
      mid: gross((row.mid.min + row.mid.max) / 2),
      high: gross(row.mid.max),
    });
  });

  it('uses the party band for a kids’ birthday', () => {
    const ctx = classified(birthday());
    const band = partyBandFor(ctx);
    expect(estimateSpend(ctx)).toEqual({
      low: band?.min,
      mid: Math.round(((band?.min ?? 0) + (band?.max ?? 0)) / 2),
      high: band?.max,
    });
  });

  it('grosses up bottom-up catering for family functions', () => {
    const ctx = classified(homePuja());
    const catering = cateringRange(ctx, 'standard');
    const bp = baseSplitFor(ctx.kind).shares.catering ?? BASIS_POINTS_TOTAL;
    expect(estimateSpend(ctx)).toEqual({
      low: Math.round((catering.low * BASIS_POINTS_TOTAL) / bp),
      mid: Math.round((catering.mid * BASIS_POINTS_TOTAL) / bp),
      high: Math.round((catering.high * BASIS_POINTS_TOTAL) / bp),
    });
  });

  it('reads the same basis as the money verdict: committee heads and wedding rows for a 60th', () => {
    const ganesh = classified(community());
    expect(estimateSpend(ganesh)).toEqual(communityEstimate(ganesh));
    const sixtieth = classified(sample('chennai-60th'));
    expect(moneyModelOf(sixtieth)).toBe('wedding-rows');
    const { row } = weddingRow(sixtieth);
    expect(estimateSpend(sixtieth).low).toBeGreaterThan(0);
    expect(estimateSpend(sixtieth).mid).toBe(
      Math.round(
        (((row.mid.min + row.mid.max) / 2) *
          billableGuests(expectedGuests(sixtieth)) *
          BASIS_POINTS_TOTAL) /
          (BAND_BASIS_GUESTS * eventSpendShareBp(computeShares(sixtieth).shares)),
      ),
    );
  });

  it('falls back to bottom-up for a party kind without a band', () => {
    const ctx = classified(birthday({ kind: 'milestone-birthday', birthday: { age: 40 } }));
    expect(moneyModelOf(ctx)).toBe('bottom-up');
    expect(estimateSpend(ctx).mid).toBeGreaterThan(0);
  });
});
