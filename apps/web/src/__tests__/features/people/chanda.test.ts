/**
 * Responsibility: the chanda calculator's inputs — typed rupees read as people write them,
 * a draft that starts from the plan's own community details, and a context copy whose
 * re-plan reproduces the plan's community numbers exactly (COM-01/02 are core's).
 * Boundary: expectations come from `buildPlan`, never from hand-worked maths.
 */
import { describe, expect, it } from 'vitest';
import { FLAT_SIZE_WEIGHTS } from '@intezaam/core/domain';
import type { CommunityExtras } from '@intezaam/core/schemas';
import { chandaDraft, readWhole, withChanda } from '../../../components/features/people/chanda';
import { previewPlan } from '../../../components/features/what-if/simulate';
import { TEST_TODAY_ISO } from '../../helpers';
import { planFor, samplePanel } from '../panel-fixtures';

function ganesh(): { extras: CommunityExtras; setup: ReturnType<typeof samplePanel> } {
  const setup = samplePanel('society-ganesh');
  const extras = setup.context.community;
  if (extras === undefined) throw new Error('the society sample has community details');
  return { extras, setup };
}

describe('readWhole', () => {
  it('reads rupees and counts as typed', () => {
    expect(readWhole('₹60,000')).toBe(60_000);
    expect(readWhole(' 240 flats ')).toBe(240);
    expect(readWhole('none')).toBeUndefined();
  });
});

describe('chanda draft and context', () => {
  it('starts from exactly what the plan was computed with', () => {
    const { extras } = ganesh();
    const draft = chandaDraft(extras);
    expect(draft.mode).toBe('flat');
    expect(readWhole(draft.households)).toBe(extras.households);
    expect(readWhole(draft.sponsors)).toBe(extras.sponsorsInr);
    expect(readWhole(draft.rwaFund)).toBe(extras.rwaFundInr);
  });

  it('re-plans to the same community numbers as the plan itself', () => {
    const { extras, setup } = ganesh();
    const replanned = previewPlan(
      withChanda(setup.context, extras, chandaDraft(extras)),
      TEST_TODAY_ISO,
    );
    expect(replanned?.community?.contribution).toEqual(setup.plan.community?.contribution);
    expect(replanned?.verdict.funding).toEqual(setup.plan.verdict.funding);
  });

  it('moves the per-household share exactly as the engine does when sponsors change', () => {
    const { extras, setup } = ganesh();
    const draft = { ...chandaDraft(extras), sponsors: '₹1,20,000' };
    const edited = withChanda(setup.context, extras, draft);
    expect(edited.community?.sponsorsInr).toBe(120_000);
    const expected = planFor(edited).community?.contribution.perHouseholdInr;
    expect(previewPlan(edited, TEST_TODAY_ISO)?.community?.contribution.perHouseholdInr).toBe(
      expected,
    );
    expect(expected).toBeLessThan(setup.plan.community?.contribution.perHouseholdInr ?? 0);
  });

  it('switches to tiered shares by flat size, larger flats paying more', () => {
    const { extras, setup } = ganesh();
    const draft = {
      ...chandaDraft(extras),
      mode: 'tiered' as const,
      tiers: { small: '60', medium: '120', large: '60' },
    };
    const edited = withChanda(setup.context, extras, draft);
    expect(edited.community?.flatTiers).toEqual({ small: 60, medium: 120, large: 60 });
    expect(edited.community?.households).toBeUndefined();
    const tiers = planFor(edited).community?.contribution.tiers ?? [];
    expect(tiers.map((tier) => tier.weight)).toEqual([
      FLAT_SIZE_WEIGHTS.small,
      FLAT_SIZE_WEIGHTS.medium,
      FLAT_SIZE_WEIGHTS.large,
    ]);
    const [small, medium, large] = tiers;
    expect((small?.perHouseholdInr ?? 0) < (medium?.perHouseholdInr ?? 0)).toBe(true);
    expect((medium?.perHouseholdInr ?? 0) < (large?.perHouseholdInr ?? 0)).toBe(true);
  });

  it('leaves blank offsets out instead of setting them to undefined', () => {
    const { extras, setup } = ganesh();
    const edited = withChanda(setup.context, extras, { ...chandaDraft(extras), tickets: '' });
    expect(edited.community !== undefined && 'ticketsInr' in edited.community).toBe(false);
  });
});
