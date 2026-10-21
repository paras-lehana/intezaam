/**
 * Date intelligence (DATE-01…05, CTX-04, CTX-07, TL-05) — what the chosen date means.
 *
 * Responsibility: notes for peak season, off-peak and weekday savings, indicative muhurat
 * dates (curated Nov 2026–Dec 2027, disputed dates shown with both sides, "ask your family
 * priest" outside that range), Chaturmas
 * and Kharmas (Hindu traditions only), the church ceremony window, an open date and a past
 * date, plus the festival and rain notes from date-hazards.ts. Every note cites its
 * sources and a trace item. Boundary: notes only; risks.ts decides severity.
 */
import { daysBetweenIso } from '../domain/calendar.js';
import {
  isMuhuratCurated,
  MUHURAT_CONFIDENCE,
  MUHURAT_DATES,
  type MuhuratDate,
  muhuratOn,
} from '../domain/festivals.js';
import {
  CALENDAR_PAUSES,
  OFF_PEAK_SAVING_PCT,
  PEAK_BOOKING_LEAD_MONTHS,
} from '../domain/seasons.js';
import { type SourceId, SOURCES } from '../domain/sources.js';
import { rangeText } from '../domain/units.js';
import type { DateNote } from '../schemas/plan-time.js';
import { OFF_PEAK_SAVING_LABEL } from './catering.js';
import { festivalNotes, type NoteSpec, rainNotes } from './date-hazards.js';
import type { FunctionTiming } from './functions.js';
import type { TraceLog } from './trace.js';
import type { ClassifiedContext } from './types.js';

/** How many curated muhurat dates to suggest when the chosen date is not listed. */
const NEARBY_MUHURATS = 2;

const CONFIRM = 'Indicative only; confirm with your family priest.';

/** The computed panchang every other muhurat list was diffed against. */
const PRIMARY_PANCHANG = 'Drik Panchang';

function note(spec: NoteSpec, ctx: ClassifiedContext, trace: TraceLog): DateNote {
  const id = trace.add({
    ruleId: spec.ruleId,
    inputs: [
      ['date', ctx.dateIso ?? 'not fixed'],
      ['note', spec.kind],
    ],
    effect: spec.text,
    ...(spec.sourceIds === undefined ? {} : { sourceIds: spec.sourceIds }),
    ...(spec.confidence === undefined ? {} : { confidence: spec.confidence }),
  });
  return {
    kind: spec.kind,
    ruleId: spec.ruleId,
    text: spec.text,
    sourceIds: [...(spec.sourceIds ?? [])],
    traceIds: [id],
  };
}

function seasonNotes(ctx: ClassifiedContext): NoteSpec[] {
  const notes: NoteSpec[] = [];
  if (ctx.season.peak) {
    notes.push({
      kind: 'peak-season',
      ruleId: 'DATE-01',
      text: `November–February is peak season: good dates and venues fill ${rangeText(PEAK_BOOKING_LEAD_MONTHS)} months ahead, so book the venue and caterer first.`,
      sourceIds: ['S-IMW-2026', 'S-WMG-2025'],
    });
  }
  if (ctx.season.offPeak) {
    notes.push({
      kind: 'off-peak',
      ruleId: 'CTX-04',
      text: `July–September is off-peak: venues, caterers and decorators are often ${rangeText(OFF_PEAK_SAVING_PCT)}% cheaper.`,
      sourceIds: ['S-RSA-2026'],
    });
  }
  if (ctx.season.weekday) {
    notes.push({
      kind: 'weekday',
      ruleId: 'CTX-04',
      text: `A Monday–Thursday date often costs about ${OFF_PEAK_SAVING_LABEL} less for the venue, catering and decor.`,
      sourceIds: ['S-RSA-2026'],
    });
  }
  return notes;
}

/**
 * "listed by 3 published sources, Drik Panchang among them": the count comes from the
 * entry's own sources, and the computed panchang is named when it is one of them.
 * @example
 * listedBy(muhuratOn('2026-11-25')?.sourceIds ?? []); // 'listed by 3 published sources, Drik Panchang among them'
 */
export function listedBy(sourceIds: readonly SourceId[]): string {
  const count =
    sourceIds.length === 1 ? 'one published source' : `${sourceIds.length} published sources`;
  const primary = sourceIds.some((id) => SOURCES[id].publisher === PRIMARY_PANCHANG);
  return `listed by ${count}${primary ? `, ${PRIMARY_PANCHANG} among them` : ''}`;
}

function listedNote(entry: MuhuratDate): NoteSpec {
  const base = { kind: 'muhurat', ruleId: 'DATE-02', sourceIds: entry.sourceIds } as const;
  if (entry.conflict === undefined) {
    return {
      ...base,
      text: `${entry.dateIso} is ${listedBy(entry.sourceIds)} as a wedding muhurat date. ${CONFIRM}`,
    };
  }
  return {
    ...base,
    text: `${entry.dateIso} is a disputed muhurat date — sources differ: ${entry.conflict} ${CONFIRM}`,
    confidence: MUHURAT_CONFIDENCE,
  };
}

function muhuratNote(dateIso: string): NoteSpec {
  const listed = muhuratOn(dateIso);
  if (listed !== undefined) return listedNote(listed);
  if (!isMuhuratCurated(dateIso)) {
    return {
      kind: 'no-curated-muhurat',
      ruleId: 'DATE-02',
      text: 'No curated muhurat dates for this period — ask your family priest.',
      confidence: 'D',
    };
  }
  // Efficiency: about 110 curated dates, sorted once per dated Hindu wedding plan.
  const nearby = MUHURAT_DATES.filter((entry) => entry.conflict === undefined)
    .map((entry) => ({ entry, gap: Math.abs(daysBetweenIso(dateIso, entry.dateIso) ?? 0) }))
    .sort((a, b) => a.gap - b.gap)
    .slice(0, NEARBY_MUHURATS)
    .map(({ entry }) => entry);
  return {
    kind: 'no-curated-muhurat',
    ruleId: 'DATE-02',
    text: `${dateIso} is not on the curated muhurat lists; the nearest agreed dates are ${nearby.map((entry) => entry.dateIso).join(' and ')}. ${CONFIRM}`,
    // The note names these dates, so it cites exactly the sources that list them.
    sourceIds: [...new Set(nearby.flatMap((entry) => entry.sourceIds))],
  };
}

function ceremonyWindowNote(
  ctx: ClassifiedContext,
  timings: readonly FunctionTiming[],
): NoteSpec[] {
  const window = ctx.traditionProfile?.ceremonyWindow;
  const wedding = timings.find((timing) => timing.kind === 'wedding');
  if (window === undefined || window === null || wedding === undefined) return [];
  return [
    {
      kind: 'ceremony-window',
      ruleId: 'DATE-04',
      text: `A church wedding is held between ${window.startHhmm} and ${window.endHhmm} unless special permission is given; yours is planned ${wedding.startHhmm}–${wedding.endHhmm}.`,
      sourceIds: ['S-WIKI-ICMA'],
    },
  ];
}

function datedNotes(
  ctx: ClassifiedContext,
  dateIso: string,
  timings: readonly FunctionTiming[],
): NoteSpec[] {
  const notes = seasonNotes(ctx);
  if (ctx.hinduCalendar) {
    notes.push(muhuratNote(dateIso));
    for (const id of ctx.season.pauses) {
      const pause = CALENDAR_PAUSES[id];
      notes.push({
        kind: 'calendar-pause',
        ruleId: 'DATE-03',
        text: `${pause.label} runs ${pause.startIso} to ${pause.endIso}, when many Hindu families avoid weddings. ${pause.note}`,
        sourceIds: pause.sourceIds,
        confidence: pause.confidence,
      });
    }
  }
  notes.push(
    ...ceremonyWindowNote(ctx, timings),
    ...festivalNotes(ctx, timings, dateIso),
    ...rainNotes(ctx),
  );
  return notes;
}

/**
 * The date notes for a context; `timings` place every function on its own day.
 * @example
 * buildDateNotes(undatedCtx, [], trace)[0]?.kind; // 'choose-date'
 */
export function buildDateNotes(
  ctx: ClassifiedContext,
  timings: readonly FunctionTiming[],
  trace: TraceLog,
): DateNote[] {
  const date = ctx.dateIso;
  if (date === null) {
    const text = ctx.hinduCalendar
      ? 'Pick your date first — check the muhurat with your family priest; every booking waits on it.'
      : 'Pick your date first; every booking waits on it.';
    return [note({ kind: 'choose-date', ruleId: 'TL-05', text }, ctx, trace)];
  }
  if (ctx.dateMode === 'past') {
    const text = `${date} has already passed. Check the date, or use the wrap-up tasks to close accounts.`;
    return [note({ kind: 'past-date', ruleId: 'TL-11', text }, ctx, trace)];
  }
  return datedNotes(ctx, date, timings).map((spec) => note(spec, ctx, trace));
}
