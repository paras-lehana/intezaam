/**
 * Date hazards (DATE-05, CTX-07) — festivals near the event and rain on an open-air date.
 *
 * Responsibility: the festival note for every festival within a day of any function — a
 * clash for most events, but for a festival pandal or society festival that lands on the
 * festival it celebrates, a "your celebration falls on it, book early" note instead — and
 * the rain note, naming the city's rain pattern with its sources and grade (southwest
 * monsoon, plus the northeast monsoon in the south-east, or Bengaluru's own wettest months).
 * Boundary: note specs only; dates.ts traces them and risk-probes-more.ts rates them.
 */
import { daysBetweenIso } from '../domain/calendar.js';
import type { EventKind } from '../domain/events.js';
import {
  FESTIVAL_CLASH_WINDOW_DAYS,
  FESTIVAL_DATES,
  FESTIVAL_IDS,
  type FestivalDate,
} from '../domain/festivals.js';
import type { RuleId } from '../domain/rule-ids.js';
import { WET_PATTERN_INFO, type WetPattern } from '../domain/seasons.js';
import type { SourceId } from '../domain/sources.js';
import type { Confidence } from '../domain/source-types.js';
import type { DateNoteKind } from '../schemas/plan-time.js';
import type { FunctionTiming } from './functions.js';
import type { ClassifiedContext } from './types.js';

/** A date note before it is traced. */
export interface NoteSpec {
  readonly kind: DateNoteKind;
  readonly ruleId: RuleId;
  readonly text: string;
  readonly sourceIds?: readonly SourceId[];
  readonly confidence?: Confidence;
}

/**
 * Occasions held FOR a festival (a Ganesh or Durga pandal, a society utsav): landing on the
 * festival is the point, so DATE-05 turns from "move it" into "book early".
 */
const FESTIVAL_OCCASIONS: readonly EventKind[] = ['festival-pandal', 'society-festival'];

/** A city outside the gazetteer gets the all-India pattern, the same months context.ts uses. */
const FALLBACK_WET_PATTERN: WetPattern = 'southwest';

/**
 * True when the event is held for a festival, so a festival on its dates is its own.
 * @example
 * celebratesFestival(ganeshCtx); // true (society festival)
 */
export function celebratesFestival(ctx: Pick<ClassifiedContext, 'kind'>): boolean {
  return FESTIVAL_OCCASIONS.includes(ctx.kind);
}

function festivalText(ctx: ClassifiedContext, festival: FestivalDate): string {
  const dates = festival.datesIso.join(' or ');
  return celebratesFestival(ctx)
    ? `Your celebration falls on ${festival.name}, ${dates}: idol, pandal and decor vendors are at peak demand, so book them early. Confirm the date locally.`
    : `${festival.name} falls on ${dates}, within a day of your functions: vendors are scarcer and dearer. Confirm the date locally.`;
}

/**
 * DATE-05: one note per festival within a day of any function (the main date when no
 * function is dated).
 * @example
 * festivalNotes(ganeshCtx, timings, '2027-09-04')[0]?.text; // 'Your celebration falls on Ganesh Chaturthi …'
 */
export function festivalNotes(
  ctx: ClassifiedContext,
  timings: readonly FunctionTiming[],
  fallbackDate: string,
): NoteSpec[] {
  const dates =
    timings.length === 0 ? [fallbackDate] : timings.map((t) => t.dateIso ?? fallbackDate);
  return FESTIVAL_IDS.flatMap((id) => {
    const festival = FESTIVAL_DATES[id];
    const near = festival.datesIso.some((day) =>
      dates.some(
        (date) => Math.abs(daysBetweenIso(date, day) ?? Infinity) <= FESTIVAL_CLASH_WINDOW_DAYS,
      ),
    );
    if (!near) return [];
    const spec: NoteSpec = {
      kind: 'festival-clash',
      ruleId: 'DATE-05',
      text: festivalText(ctx, festival),
      sourceIds: festival.sourceIds,
    };
    return [spec];
  });
}

/**
 * CTX-07: the rain note for an open-air event in a rainy month, citing the city's rain
 * pattern (an unknown city falls back to the all-India southwest monsoon).
 * @example
 * rainNotes(chennaiOutdoorDecemberCtx)[0]?.sourceIds; // the southwest-and-northeast sources
 */
export function rainNotes(ctx: ClassifiedContext): NoteSpec[] {
  if (!ctx.rainRisk) return [];
  const pattern = WET_PATTERN_INFO[ctx.city?.wetPattern ?? FALLBACK_WET_PATTERN];
  return [
    {
      kind: 'rain-risk',
      ruleId: 'CTX-07',
      text: `An open-air event in a rainy month for ${ctx.cityName} (${pattern.basis}): book a waterproof hangar or a covered backup space.`,
      sourceIds: pattern.sourceIds,
      confidence: pattern.confidence,
    },
  ];
}
