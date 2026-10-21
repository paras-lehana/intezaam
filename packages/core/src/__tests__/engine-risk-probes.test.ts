/**
 * Tests for engine/risk-probes.ts — the plan-level risk probes.
 *
 * Responsibility: prove each probe raises its risk exactly when its cause is present, at
 * the right severity (blocker only for the grade-A night sound ban; the gurdwara and church
 * rules high), and stays silent otherwise: sound curfew, tradition rules, time, money,
 * funding, space, rain and peak-season pressure. Boundary: inputs come from the engine
 * (riskInputsOf) with only the field under test changed.
 */
import { describe, expect, it } from 'vitest';
import { noteIds, PRIMARY_PROBES } from '../engine/risk-probes.js';
import type { RiskInputs } from '../engine/risk-probes.js';
import { birthday, community, homePuja, inDays, wedding } from './fixtures/engine-contexts.js';
import { riskFrom, riskInputsOf } from './fixtures/engine-risk-inputs.js';

const risk = (inputs: RiskInputs, id: string): ReturnType<typeof riskFrom> =>
  riskFrom(PRIMARY_PROBES, inputs, id);

describe('hard rules', () => {
  it('raises the only blocker when outdoor music runs past 10 pm', () => {
    const loud = riskInputsOf(wedding());
    expect(loud.permissions.some((permission) => permission.blocker)).toBe(true);
    expect(risk(loud, 'risk-night-sound')?.severity).toBe('blocker');
    const quiet = riskInputsOf(
      wedding({
        sound: { amplified: true, endHhmm: '21:30', nearSilenceZone: false, crackers: false },
      }),
    );
    expect(risk(quiet, 'risk-night-sound')).toBeUndefined();
  });

  it('rates the gurdwara rule high for an Anand Karaj, as an "if" when unsaid, and not at all for "Punjabi" alone', () => {
    const sikh = riskInputsOf(wedding({ tradition: 'punjabi-sikh', anandKaraj: true }));
    expect(risk(sikh, 'risk-anand-karaj-venue')?.severity).toBe('high');
    const unsaid = riskInputsOf(wedding({ tradition: 'punjabi-sikh' }));
    expect(risk(unsaid, 'risk-anand-karaj-venue')?.severity).toBe('info');
    const punjabiOnly = riskInputsOf(wedding({ tradition: 'punjabi-sikh', anandKaraj: false }));
    expect(risk(punjabiOnly, 'risk-anand-karaj-venue')).toBeUndefined();
    expect(risk(riskInputsOf(birthday()), 'risk-anand-karaj-venue')).toBeUndefined();
  });

  it('rates a church ceremony outside 6 am–7 pm high, and inside it not at all', () => {
    const church = riskInputsOf(wedding({ tradition: 'christian' }));
    const evening = church.timings.map((timing) =>
      timing.kind === 'wedding' ? { ...timing, startHhmm: '18:30', endHhmm: '21:30' } : timing,
    );
    expect(risk({ ...church, timings: evening }, 'risk-church-window')?.severity).toBe('high');
    const morning = church.timings.map((timing) =>
      timing.kind === 'wedding'
        ? { ...timing, startHhmm: '10:00', endHhmm: '12:00', durationHours: 2 }
        : timing,
    );
    expect(risk({ ...church, timings: morning }, 'risk-church-window')).toBeUndefined();
    expect(risk({ ...church, timings: [] }, 'risk-church-window')).toBeUndefined();
    expect(risk(riskInputsOf(wedding()), 'risk-church-window')).toBeUndefined();
  });
});

describe('verdict axes', () => {
  it('rates a past date high and a critical timeline high, a compressed one medium', () => {
    expect(risk(riskInputsOf(wedding({ dateIso: inDays(-2) })), 'risk-past-date')?.severity).toBe(
      'high',
    );
    expect(risk(riskInputsOf(wedding({ dateIso: inDays(5) })), 'risk-time')?.severity).toBe('high');
    const compressed = riskInputsOf(wedding());
    expect(compressed.verdict.time.status).toBe('compressed');
    expect(risk(compressed, 'risk-time')?.severity).toBe('medium');
    expect(risk(riskInputsOf(wedding({ dateIso: inDays(400) })), 'risk-time')).toBeUndefined();
  });

  it('raises the money risk only when the plan needs changes', () => {
    const stretch = riskInputsOf(wedding({ city: 'Delhi', budgetInr: 300_000 }));
    expect(risk(stretch, 'risk-money')?.title).toContain('Needs changes');
    expect(risk(riskInputsOf(wedding()), 'risk-money')).toBeUndefined();
  });

  it('raises a funding gap for a community without households only', () => {
    const gap = riskInputsOf(community({ community: { premises: 'public', days: 1 } }));
    expect(risk(gap, 'risk-funding-gap')?.severity).toBe('medium');
    expect(risk(riskInputsOf(community()), 'risk-funding-gap')).toBeUndefined();
  });
});

describe('space, weather and season', () => {
  it('rates an over-full venue high and a tight one medium', () => {
    const base = riskInputsOf(homePuja());
    const over = { ...base.space, status: 'over' as const, capacity: 10, areaSqft: 100 };
    expect(risk({ ...base, space: over }, 'risk-space')?.severity).toBe('high');
    expect(risk({ ...base, space: { ...over, status: 'tight' } }, 'risk-space')?.severity).toBe(
      'medium',
    );
    expect(risk(base, 'risk-space')).toBeUndefined();
  });

  it('rates rain high for a fully open-air event and medium for a mixed one', () => {
    const open = riskInputsOf(birthday());
    expect(risk(open, 'risk-rain')?.severity).toBe('high');
    expect(risk(open, 'risk-rain')?.traceIds).toEqual(
      noteIds(open.timeline.dateNotes, 'rain-risk'),
    );
    const mixed = riskInputsOf(birthday({ venueSetting: 'mixed' }));
    expect(risk(mixed, 'risk-rain')?.severity).toBe('medium');
    expect(risk(riskInputsOf(birthday({ venueSetting: 'indoor' })), 'risk-rain')).toBeUndefined();
  });

  it('warns about a peak-season date close by with the venue unbooked', () => {
    const close = riskInputsOf(wedding({ dateIso: '2026-12-11' }));
    expect(risk(close, 'risk-peak-unbooked')?.severity).toBe('medium');
    expect(risk(riskInputsOf(wedding({ dateIso: '2027-11-20' })), 'risk-peak-unbooked')).toBe(
      undefined,
    );
  });
});
