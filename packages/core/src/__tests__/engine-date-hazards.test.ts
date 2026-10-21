/**
 * Tests for engine/date-hazards.ts — festival notes (DATE-05) and rain notes (CTX-07).
 *
 * Responsibility: prove a festival within a day of any function gives one note with the
 * festival's sources, worded "book early" for a pandal or society festival on its own
 * festival and as a clash for everyone else; and that the rain note fires only for open-air
 * rainy months, citing the city's rain pattern (Chennai's northeast monsoon included) and
 * the all-India pattern for an unknown city. Boundary: dates and sources come from the
 * domain tables and samples.
 */
import { describe, expect, it } from 'vitest';
import { FESTIVAL_DATES } from '../domain/festivals.js';
import { NE_MONSOON_MONTHS, SW_MONSOON_MONTHS, WET_PATTERN_INFO } from '../domain/seasons.js';
import { celebratesFestival, festivalNotes, rainNotes } from '../engine/date-hazards.js';
import { functionTimings } from '../engine/functions.js';
import type { EventContext } from '../schemas/context.js';
import { birthday, classified, community, sample } from './fixtures/engine-contexts.js';

const GANESH = FESTIVAL_DATES['ganesh-chaturthi-2027'];

function festivalOf(context: EventContext): ReturnType<typeof festivalNotes> {
  const ctx = classified(context);
  return festivalNotes(ctx, functionTimings(ctx), ctx.dateIso ?? '');
}

/** The first day of `month` in the year after the sample's own date. */
function inMonth(context: EventContext, month: number): string {
  const year = Number((context.dateIso ?? '').slice(0, 4)) + 1;
  return `${year}-${String(month).padStart(2, '0')}-15`;
}

describe('celebratesFestival', () => {
  it('is true only for occasions held for a festival', () => {
    expect(celebratesFestival({ kind: 'society-festival' })).toBe(true);
    expect(celebratesFestival({ kind: 'festival-pandal' })).toBe(true);
    expect(celebratesFestival({ kind: 'rwa-function' })).toBe(false);
    expect(celebratesFestival({ kind: 'wedding' })).toBe(false);
  });
});

describe('festivalNotes (DATE-05)', () => {
  it('tells a society utsav on Ganesh Chaturthi to book early, citing the festival sources', () => {
    const [note] = festivalOf(community({ dateIso: GANESH.datesIso[0] }));
    expect(note?.text).toContain(`Your celebration falls on ${GANESH.name}`);
    expect(note?.text).toContain('book them early');
    expect(note?.sourceIds).toEqual([...GANESH.sourceIds]);
  });

  it('calls the same festival a clash for an occasion not held for it', () => {
    const [note] = festivalOf(community({ kind: 'rwa-function', dateIso: GANESH.datesIso[0] }));
    expect(note?.text).toContain('within a day of your functions');
  });

  it('stays silent when no festival is near', () => {
    expect(festivalOf(birthday({ dateIso: '2027-02-03' }))).toEqual([]);
  });
});

describe('rainNotes (CTX-07)', () => {
  it('cites the city’s rain pattern for an open-air event in a rainy month', () => {
    const party = birthday();
    const ctx = classified(party);
    const pattern = WET_PATTERN_INFO[ctx.city?.wetPattern ?? 'southwest'];
    const [note] = rainNotes(ctx);
    expect(note?.sourceIds).toEqual([...pattern.sourceIds]);
    expect(note?.text).toContain(pattern.basis);
  });

  it('adds the northeast monsoon for Chennai in October–December', () => {
    const chennai = sample('chennai-60th');
    const month = NE_MONSOON_MONTHS[0] ?? 0;
    const outdoor: EventContext = {
      ...chennai,
      venueSetting: 'outdoor',
      dateIso: inMonth(chennai, month),
    };
    const [note] = rainNotes(classified(outdoor));
    expect(note?.sourceIds).toEqual([...WET_PATTERN_INFO['southwest-and-northeast'].sourceIds]);
  });

  it('falls back to the southwest monsoon for a city outside the gazetteer', () => {
    const party = birthday({ city: 'Nowhereabad' });
    const month = SW_MONSOON_MONTHS[0] ?? 0;
    const [note] = rainNotes(classified({ ...party, dateIso: inMonth(party, month) }));
    expect(note?.sourceIds).toEqual([...WET_PATTERN_INFO.southwest.sourceIds]);
  });

  it('gives no note indoors', () => {
    expect(rainNotes(classified(birthday({ venueSetting: 'indoor' })))).toEqual([]);
  });
});
