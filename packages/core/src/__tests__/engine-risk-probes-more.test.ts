/**
 * Tests for engine/risk-probes-more.ts — the food, calendar and people risk probes.
 *
 * Responsibility: prove each probe raises its risk exactly when its cause is present, at the
 * right severity, and stays silent otherwise: Jain guests after sunset, Chaturmas/Kharmas,
 * festival clashes, a missing rest day, silence zones, access needs, alcohol, big crowds,
 * too few volunteers, an estimated budget and charity receipts. Boundary: inputs come from
 * riskInputsOf with only the field under test changed (the food and rooms gaps are tested
 * with risk-probes-money.ts).
 */
import { describe, expect, it } from 'vitest';
import { MORE_PROBES } from '../engine/risk-probes-more.js';
import { noteIds, type RiskInputs } from '../engine/risk-probes.js';
import {
  birthday,
  community,
  homePuja,
  wedding,
  withoutBudget,
} from './fixtures/engine-contexts.js';
import { riskFrom, riskInputsOf } from './fixtures/engine-risk-inputs.js';

const risk = (inputs: RiskInputs, id: string): ReturnType<typeof riskFrom> =>
  riskFrom(MORE_PROBES, inputs, id);

const jaipur = riskInputsOf(wedding());
const noNeeds = { elderly: false, wheelchair: false, kids: false };

describe('food probes', () => {
  it('warns Jain guests about meals after sunset, and not without a Jain counter', () => {
    expect(risk(jaipur, 'risk-jain-sunset')?.severity).toBe('medium');
    const daytime = jaipur.timings.map((timing) => ({ ...timing, startHhmm: '12:00' }));
    expect(risk({ ...jaipur, timings: daytime }, 'risk-jain-sunset')).toBeUndefined();
    expect(risk(riskInputsOf(birthday()), 'risk-jain-sunset')).toBeUndefined();
  });
});

describe('calendar probes', () => {
  it('flags Chaturmas or Kharmas on a dated Hindu wedding, citing the calendar note', () => {
    const paused = riskInputsOf(wedding({ dateIso: '2026-12-20' }));
    const flagged = risk(paused, 'risk-calendar-pause');
    expect(flagged?.severity).toBe('medium');
    expect(flagged?.traceIds).toEqual(noteIds(paused.timeline.dateNotes, 'calendar-pause'));
    expect(risk(jaipur, 'risk-calendar-pause')).toBeUndefined();
  });

  it('notes a festival clash as info', () => {
    expect(risk(riskInputsOf(community()), 'risk-festival-clash')?.severity).toBe('info');
    expect(risk(jaipur, 'risk-festival-clash')).toBeUndefined();
  });

  it('tells a utsav on its own festival to book early, and anyone else that it clashes', () => {
    const own = risk(riskInputsOf(community()), 'risk-festival-clash');
    expect(own?.title).toContain('Your festival');
    expect(own?.fix).not.toContain('shift the date');
    const other = risk(riskInputsOf(community({ kind: 'rwa-function' })), 'risk-festival-clash');
    expect(other?.title).toContain('within a day of your functions');
  });

  it('flags a missing rest day when the functions engine found one', () => {
    expect(risk({ ...jaipur, restDayTraceId: 'FN-04.1' }, 'risk-rest-day')?.traceIds).toEqual([
      'FN-04.1',
    ]);
    expect(risk({ ...jaipur, restDayTraceId: null }, 'risk-rest-day')).toBeUndefined();
  });
});

describe('people probes', () => {
  it('flags a silence zone only when that permission is required', () => {
    const zone = riskInputsOf(
      wedding({
        sound: { amplified: true, endHhmm: '21:00', nearSilenceZone: true, crackers: false },
      }),
    );
    expect(risk(zone, 'risk-silence-zone')?.severity).toBe('medium');
    expect(risk(jaipur, 'risk-silence-zone')).toBeUndefined();
  });

  it('notes access needs, alcohol and very big crowds as info', () => {
    expect(risk(jaipur, 'risk-access')?.severity).toBe('info');
    expect(risk(riskInputsOf(wedding({ accessibility: noNeeds })), 'risk-access')).toBeUndefined();
    expect(risk(riskInputsOf(wedding({ alcohol: true })), 'risk-alcohol')?.severity).toBe('info');
    expect(risk(jaipur, 'risk-alcohol')).toBeUndefined();
    expect(risk(riskInputsOf(community()), 'risk-large-crowd')?.severity).toBe('info');
    expect(risk(jaipur, 'risk-large-crowd')).toBeUndefined();
  });

  it('flags too few volunteers against the roster, and not when enough are offered', () => {
    const ganesh = riskInputsOf(community());
    const offered = ganesh.ctx.input.community?.volunteers ?? 0;
    expect(risk({ ...ganesh, volunteersNeeded: offered + 1 }, 'risk-volunteers')?.severity).toBe(
      'medium',
    );
    expect(risk({ ...ganesh, volunteersNeeded: offered }, 'risk-volunteers')).toBeUndefined();
    expect(risk({ ...jaipur, volunteersNeeded: 10 }, 'risk-volunteers')).toBeUndefined();
  });

  it('notes an estimated budget and the 80G check for a charity', () => {
    expect(risk(riskInputsOf(withoutBudget(homePuja())), 'risk-estimated-budget')).toBeDefined();
    expect(risk(jaipur, 'risk-estimated-budget')).toBeUndefined();
    const charity = riskInputsOf(community({ kind: 'charity-fundraiser' }));
    expect(risk(charity, 'risk-charity-receipts')?.severity).toBe('info');
    expect(risk(jaipur, 'risk-charity-receipts')).toBeUndefined();
  });
});
