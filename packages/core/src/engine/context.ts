/**
 * Context classifiers (CTX-01…08) and the normalised context.
 *
 * Responsibility: turn a validated EventContext and `todayIso` into the classified facts
 * every rule family reads — city tier and anchor, scale band, date mode and lead time,
 * season, rain risk, crowd class, calendar applicability, default functions — and add the
 * budget (the user's, or an estimate when they asked us to estimate it). Boundary: pure
 * classification; the trace items for these decisions are written by context-trace.ts.
 */
import { ACCESS_NEEDS } from '../domain/accessibility.js';
import { daysBetweenIso, isoMonth, isoWeekday } from '../domain/calendar.js';
import { CATERING_TIER_BY_ANCHOR } from '../domain/catering.js';
import { UNKNOWN_CITY_TIER } from '../domain/cities.js';
import { type CityInfo, findCity } from '../domain/city-table.js';
import { OPEN_AIR_SETTINGS } from '../domain/context-options.js';
import { crowdClassFor } from '../domain/crowd.js';
import { EVENT_KIND_PROFILES } from '../domain/event-kinds.js';
import { type FunctionKind, functionAllowedFor } from '../domain/functions.js';
import { scaleBandFor } from '../domain/scale.js';
import {
  DISCOUNT_WEEKDAYS,
  OFF_PEAK_MONTHS,
  PEAK_MONTHS,
  pausesOn,
  SW_MONSOON_MONTHS,
} from '../domain/seasons.js';
import { TRADITION_PROFILES } from '../domain/traditions.js';
import type { EventContext } from '../schemas/context.js';
import type { TimelineMode } from '../schemas/plan-time.js';
import { estimateSpend } from './estimate.js';
import type {
  ClassifiedContext,
  FunctionsSource,
  NormalisedContext,
  SeasonInfo,
  TierSource,
} from './types.js';

const NO_SEASON: SeasonInfo = {
  peak: false,
  offPeak: false,
  weekday: false,
  month: null,
  pauses: [],
};

interface DateInfo {
  readonly mode: TimelineMode;
  readonly dateIso: string | null;
  readonly days: number | null;
}

/**
 * The functions to plan: the user's list, else the wedding tradition's sequence, else the
 * event kind's default (filtered to functions the family allows).
 * @example
 * resolveFunctions(sampleContext('bengaluru-birthday', '2026-10-20')).functions; // ['party']
 */
export function resolveFunctions(context: EventContext): {
  functions: FunctionKind[];
  source: FunctionsSource;
} {
  if (context.functions.length > 0) return { functions: [...context.functions], source: 'user' };
  if (context.family === 'wedding' && context.tradition !== undefined) {
    const sequence = TRADITION_PROFILES[context.tradition].defaultFunctions;
    return {
      functions: sequence.filter((kind) => functionAllowedFor(kind, context.family)),
      source: 'tradition',
    };
  }
  return { functions: [...EVENT_KIND_PROFILES[context.kind].defaultFunctions], source: 'kind' };
}

/** CTX-05: dated, undated ("not fixed yet") or past, with the whole days left. */
function dateInfo(context: EventContext, todayIso: string): DateInfo {
  const undated: DateInfo = { mode: 'undated', dateIso: null, days: null };
  if (context.dateFlexible || context.dateIso === undefined) return undated;
  const days = daysBetweenIso(todayIso, context.dateIso);
  if (days === undefined) return undated;
  return { mode: days < 0 ? 'past' : 'dated', dateIso: context.dateIso, days };
}

/** CTX-04 (+ DATE-03 pauses when the calendar rules apply, CTX-08). */
function seasonFor(dateIso: string | null, hinduCalendar: boolean): SeasonInfo {
  if (dateIso === null) return NO_SEASON;
  const month = isoMonth(dateIso) ?? null;
  const weekday = isoWeekday(dateIso);
  return {
    peak: month !== null && PEAK_MONTHS.includes(month),
    offPeak: month !== null && OFF_PEAK_MONTHS.includes(month),
    weekday: weekday !== undefined && DISCOUNT_WEEKDAYS.includes(weekday),
    month,
    pauses: hinduCalendar ? pausesOn(dateIso) : [],
  };
}

/** CTX-02: the user's override wins; else the gazetteer; an unknown city is priced as tier-2. */
function tierFor(
  context: EventContext,
  city: CityInfo | undefined,
): Pick<ClassifiedContext, 'tier' | 'tierSource' | 'anchor'> {
  const source: TierSource =
    context.tier !== undefined ? 'override' : city === undefined ? 'unknown-city' : 'gazetteer';
  if (context.tier !== undefined) return { tier: context.tier, tierSource: source, anchor: null };
  return {
    tier: city?.tier ?? UNKNOWN_CITY_TIER,
    tierSource: source,
    anchor: city?.anchor ?? null,
  };
}

/**
 * Applies CTX-01…08 to a context: everything the rules need except money.
 * @example
 * classifyContext(sampleContext('jaipur-wedding', '2026-10-20'), '2026-10-20').anchor; // 'jaipur'
 */
export function classifyContext(context: EventContext, todayIso: string): ClassifiedContext {
  const city = findCity(context.city);
  const { tier, tierSource, anchor } = tierFor(context, city);
  const traditionProfile =
    context.tradition === undefined ? null : TRADITION_PROFILES[context.tradition];
  const hinduCalendar = context.family === 'wedding' && traditionProfile?.muhurat === true;
  const date = dateInfo(context, todayIso);
  const season = seasonFor(date.dateIso, hinduCalendar);
  const openAir = OPEN_AIR_SETTINGS.includes(context.venueSetting);
  const rainyMonths = city?.rainyMonths ?? SW_MONSOON_MONTHS;
  const { functions, source } = resolveFunctions(context);
  // Crowd checks err on the safe side: the invited count when no footfall estimate is given.
  const footfall = context.community?.footfall ?? context.guests;
  return {
    input: context,
    todayIso,
    family: context.family,
    kind: context.kind,
    tradition: context.tradition ?? null,
    traditionProfile,
    city: city ?? null,
    cityName: city?.name ?? context.city.trim(),
    tier,
    tierSource,
    anchor,
    cateringTier: anchor === null ? tier : (CATERING_TIER_BY_ANCHOR[anchor] ?? tier),
    scale: scaleBandFor(context.guests),
    dateMode: date.mode,
    dateIso: date.dateIso,
    daysToEvent: date.days,
    season,
    rainRisk: openAir && season.month !== null && rainyMonths.includes(season.month),
    hinduCalendar,
    functions,
    functionsSource: source,
    guests: context.guests,
    footfall,
    crowdClass: crowdClassFor(footfall),
    setting: context.venueSetting,
    openAir,
    plannerHired: context.toggles.planner || context.helpLevel === 'planner',
    amplifiedSound: context.sound?.amplified === true,
    accessNeeds: ACCESS_NEEDS.filter((need) => context.accessibility[need]),
  };
}

/**
 * The classified context plus its budget: the user's figure, or the mid estimate when the
 * user asked us to estimate it (feature #5).
 * @example
 * normaliseContext(sampleContext('bengaluru-birthday', '2026-10-20'), '2026-10-20').budgetSource; // 'user'
 */
export function normaliseContext(context: EventContext, todayIso: string): NormalisedContext {
  const classified = classifyContext(context, todayIso);
  const estimate = estimateSpend(classified);
  const budgetInr = context.budgetInr ?? estimate.mid;
  return {
    ...classified,
    budgetInr,
    budgetSource: context.budgetInr === undefined ? 'estimate' : 'user',
    budgetPerGuestInr: Math.round(budgetInr / classified.guests),
    estimate,
  };
}
