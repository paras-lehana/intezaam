/**
 * Tests for engine/dates.ts — date intelligence notes (DATE-01…05, CTX-04, CTX-07, TL-05).
 *
 * Responsibility: prove each note appears exactly when its rule fires: choose-date and
 * past-date; peak, off-peak and weekday; a listed muhurat (agreed or single-source), an
 * unlisted date inside the curated range with the nearest listed dates, and "ask your
 * family priest" outside it; Chaturmas/Kharmas only for Hindu traditions; the church
 * window; festival clashes; and rain. Boundary: notes cite the domain sources.
 */
import { describe, expect, it } from 'vitest';
import { daysBetweenIso } from '../domain/calendar.js';
import {
  FESTIVAL_DATES,
  isMuhuratCurated,
  MUHURAT_CONFIDENCE,
  MUHURAT_DATES,
  muhuratOn,
} from '../domain/festivals.js';
import { buildDateNotes, listedBy } from '../engine/dates.js';
import { functionTimings } from '../engine/functions.js';
import { createTraceLog } from '../engine/trace.js';
import { dateNoteSchema } from '../schemas/plan-time.js';
import type { EventContext } from '../schemas/context.js';
import {
  birthday,
  classified,
  community,
  homePuja,
  inDays,
  undated,
  wedding,
} from './fixtures/engine-contexts.js';

function notesFor(context: EventContext): ReturnType<typeof buildDateNotes> {
  const ctx = classified(context);
  return buildDateNotes(ctx, functionTimings(ctx), createTraceLog());
}

const kinds = (context: EventContext): string[] => notesFor(context).map((note) => note.kind);

/** The muhurat note (listed or not) for the Jaipur wedding moved to `dateIso`. */
function muhuratNoteOn(dateIso: string): ReturnType<typeof buildDateNotes>[number] | undefined {
  return notesFor(wedding({ dateIso })).find(
    (n) => n.kind === 'muhurat' || n.kind === 'no-curated-muhurat',
  );
}

describe('buildDateNotes', () => {
  it('asks for a date first, mentioning the priest only for Hindu weddings', () => {
    const [hindu] = notesFor(undated(wedding()));
    expect(hindu?.kind).toBe('choose-date');
    expect(hindu?.text).toContain('priest');
    expect(notesFor(undated(homePuja()))[0]?.text).not.toContain('priest');
  });

  it('flags a past date and nothing else', () => {
    expect(kinds(wedding({ dateIso: inDays(-4) }))).toEqual(['past-date']);
  });

  it('notes peak season, off-peak months and weekdays', () => {
    expect(kinds(wedding({ dateIso: '2026-11-25' }))).toEqual(
      expect.arrayContaining(['peak-season', 'weekday']),
    );
    expect(kinds(birthday())).toContain('off-peak');
  });

  it('shows a listed muhurat with how many sources list it', () => {
    const agreedDates = MUHURAT_DATES.filter((entry) => entry.conflict === undefined);
    const fewest = agreedDates.reduce((a, b) => (b.sourceIds.length < a.sourceIds.length ? b : a));
    const most = agreedDates.reduce((a, b) => (b.sourceIds.length > a.sourceIds.length ? b : a));
    for (const entry of [fewest, most]) {
      const shown = muhuratNoteOn(entry.dateIso);
      expect(shown?.kind).toBe('muhurat');
      expect(shown?.sourceIds).toEqual([...entry.sourceIds]);
      expect(shown?.text).toContain(listedBy(entry.sourceIds));
    }
    expect(listedBy(most.sourceIds)).toContain(`${most.sourceIds.length} published sources`);
    expect(listedBy(['S-AZA-MUHURAT-2026'])).toBe('listed by one published source');
  });

  it('shows a disputed muhurat with both sides at grade C', () => {
    const disputed = MUHURAT_DATES.find((entry) => entry.conflict !== undefined);
    const trace = createTraceLog();
    const ctx = classified(wedding({ dateIso: disputed?.dateIso ?? '' }));
    const shown = buildDateNotes(ctx, functionTimings(ctx), trace).find(
      (n) => n.kind === 'muhurat',
    );
    expect(shown?.text).toContain(`sources differ: ${disputed?.conflict ?? ''}`);
    const item = trace.items().find((entry) => entry.id === shown?.traceIds[0]);
    expect(item?.confidence).toBe(MUHURAT_CONFIDENCE);
  });

  it('suggests the nearest agreed dates inside the curated range, citing their sources', () => {
    const date = '2027-02-20';
    expect([isMuhuratCurated(date), muhuratOn(date)]).toEqual([true, undefined]);
    const nearest = MUHURAT_DATES.filter((entry) => entry.conflict === undefined)
      .map((entry) => ({ entry, gap: Math.abs(daysBetweenIso(date, entry.dateIso) ?? 0) }))
      .sort((a, b) => a.gap - b.gap)
      .slice(0, 2)
      .map(({ entry }) => entry);
    const unlisted = muhuratNoteOn(date);
    expect(unlisted?.kind).toBe('no-curated-muhurat');
    expect(unlisted?.text).toContain(nearest.map((entry) => entry.dateIso).join(' and '));
    expect(unlisted?.sourceIds).toEqual([...new Set(nearest.flatMap((entry) => entry.sourceIds))]);
  });

  it('asks the family priest outside the curated range', () => {
    const date = '2028-03-10';
    expect(isMuhuratCurated(date)).toBe(false);
    expect(muhuratNoteOn(date)?.text).toBe(
      'No curated muhurat dates for this period — ask your family priest.',
    );
  });

  it('notes Chaturmas and Kharmas for Hindu traditions only', () => {
    expect(kinds(wedding({ dateIso: '2026-12-20' }))).toContain('calendar-pause');
    expect(kinds(wedding({ dateIso: '2026-12-20', tradition: 'muslim' }))).not.toContain(
      'calendar-pause',
    );
    expect(kinds(wedding({ dateIso: '2026-12-20', tradition: 'muslim' }))).not.toContain('muhurat');
  });

  it('states the church ceremony window for Christian weddings', () => {
    const note = notesFor(wedding({ tradition: 'christian', functions: [] })).find(
      (n) => n.kind === 'ceremony-window',
    );
    expect(note?.text).toContain('06:00');
  });

  it('warns about a festival within a day of any function, with its sources', () => {
    const clash = notesFor(community()).find((n) => n.kind === 'festival-clash');
    expect(clash?.sourceIds).toEqual([...FESTIVAL_DATES['ganesh-chaturthi-2027'].sourceIds]);
    expect(kinds(wedding({ dateIso: '2027-01-05' }))).not.toContain('festival-clash');
  });

  it('warns about rain for open-air events in the rainy months', () => {
    expect(kinds(birthday())).toContain('rain-risk');
    expect(kinds(birthday({ venueSetting: 'indoor' }))).not.toContain('rain-risk');
  });

  it('produces schema-valid notes that each cite a trace item', () => {
    const notes = notesFor(wedding({ dateIso: '2026-11-25' }));
    notes.forEach((note) => {
      expect(dateNoteSchema.safeParse(note).success).toBe(true);
      expect(note.traceIds).toHaveLength(1);
    });
  });
});
