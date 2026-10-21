/**
 * Tests for engine/lever-candidates-party.ts — party and community levers (LEV-06, LEV-07).
 *
 * Responsibility: prove a party moves home when the home band is cheaper, a big kids' party
 * is capped to the next smaller format, DIY decor frees the decor line above the cheapest
 * bought decor, sponsors close a funding gap exactly, and a shorter programme halves the
 * cultural line — each only for the events it fits. Boundary: expectations come from the
 * engine's own estimate, helpers and budget lines.
 */
import { describe, expect, it } from 'vitest';
import { KIDS_PARTY_ITEMS_INR } from '../domain/costs.js';
import type { LeverId } from '../domain/levers.js';
import { type LeverDraft, lineOf } from '../engine/lever-candidates.js';
import { PARTY_CANDIDATES } from '../engine/lever-candidates-party.js';
import { partyCap } from '../engine/lever-helpers.js';
import type { EventContext } from '../schemas/context.js';
import { birthday, clean, community, coreOf, TODAY, wedding } from './fixtures/engine-contexts.js';

function draft(context: EventContext, id: LeverId): LeverDraft | undefined {
  const input = { context: clean(context), core: coreOf(context), todayIso: TODAY };
  return (
    PARTY_CANDIDATES.map((candidate) => candidate(input)).find((d) => d?.id === id) ?? undefined
  );
}

const bigParty = birthday({ guests: 70, birthday: { age: 7, kidsCount: 60 } });

describe('home party and fewer children (LEV-06)', () => {
  it('moves a hall party home, saving the difference in typical cost', () => {
    const lever = draft(birthday(), 'home-party');
    const home = coreOf(birthday({ venueSetting: 'home' }));
    expect(lever?.savingInr).toBe(coreOf(birthday()).ctx.estimate.mid - home.ctx.estimate.mid);
    expect(lever?.patch).toEqual({ ops: [{ op: 'setVenueSetting', value: 'home' }] });
  });

  it('does not move a party that is already at home, or a wedding', () => {
    expect(draft(birthday({ venueSetting: 'home' }), 'home-party')).toBeUndefined();
    expect(draft(wedding(), 'home-party')).toBeUndefined();
  });

  it('caps a big kids’ party at the next smaller format', () => {
    const cap = partyCap(coreOf(bigParty).ctx);
    const lever = draft(bigParty, 'fewer-children');
    expect(lever?.patch).toEqual({ ops: [{ op: 'setGuests', value: cap }] });
    expect(lever?.savingInr).toBeGreaterThan(0);
    expect(draft(birthday(), 'fewer-children')).toBeUndefined();
  });
});

describe('DIY decor (LEV-06)', () => {
  it('frees the decor line above the cheapest bought decor at a party', () => {
    const core = coreOf(bigParty);
    const lever = draft(bigParty, 'diy-decor');
    expect(lever?.savingInr).toBe(lineOf(core, 'decor') - KIDS_PARTY_ITEMS_INR.decor.min);
    expect(lever?.judge.budgetInr).toBe(core.ctx.budgetInr + (lever?.savingInr ?? 0));
  });

  it('is not offered for weddings or when decor is already at the minimum', () => {
    expect(draft(wedding(), 'diy-decor')).toBeUndefined();
    expect(draft(birthday({ budgetInr: 1_000 }), 'diy-decor')).toBeUndefined();
  });
});

describe('community levers (LEV-07)', () => {
  const gap = community({ community: { premises: 'public', days: 1 } });

  it('asks sponsors for exactly the funding gap', () => {
    const core = coreOf(gap);
    const lever = draft(gap, 'find-sponsors');
    expect(lever?.savingInr).toBe(core.funding?.funding.gapInr);
    expect(lever?.judge.community?.sponsorsInr).toBe(core.funding?.funding.gapInr);
    expect(draft(community(), 'find-sponsors')).toBeUndefined();
    expect(draft(wedding(), 'find-sponsors')).toBeUndefined();
  });

  it('halves the cultural programme line for a community event only', () => {
    const core = coreOf(community());
    const lever = draft(community(), 'trim-programme');
    expect(lever?.savingInr).toBe(Math.round(lineOf(core, 'cultural_prizes') / 2));
    expect(lever?.judge.budgetInr).toBe(core.ctx.budgetInr - (lever?.savingInr ?? 0));
    expect(draft(wedding(), 'trim-programme')).toBeUndefined();
  });
});
