/**
 * Context trace (CTX-01…08) — the "Why this?" for every classification.
 *
 * Responsibility: write one trace item per classifier with the signals it read (city as
 * typed and as matched, tier and its grade, guests, date, setting, tradition) and its
 * effect in a plain sentence, so the user can see — and correct — how the context was
 * read. Boundary: trace only; the classification itself is context.ts.
 */
import { CITY_ANCHORS, TIER_PROFILES } from '../domain/cities.js';
import { CROWD_CLASS_MAX } from '../domain/crowd.js';
import { EVENT_KIND_PROFILES } from '../domain/event-kinds.js';
import { FAMILY_PROFILES } from '../domain/events.js';
import { SCALE_LABELS } from '../domain/scale.js';
import { formatInrRange } from '../format.js';
import type { TraceLog } from './trace.js';
import type { ClassifiedContext } from './types.js';

export interface ContextTraceIds {
  readonly family: string;
  readonly tier: string;
  readonly scale: string;
  readonly season: string;
  readonly lead: string;
  readonly crowd: string;
  readonly rain: string;
  readonly calendar: string;
}

function tierEffect(ctx: ClassifiedContext): string {
  const tierLabel = TIER_PROFILES[ctx.tier].label.toLowerCase();
  if (ctx.tierSource === 'override') return `You set the price tier to ${tierLabel}.`;
  if (ctx.tierSource === 'unknown-city') {
    return `${ctx.cityName} is not in our city list, so it is priced as a ${tierLabel} (an assumption you can change).`;
  }
  if (ctx.anchor === null) return `${ctx.cityName} is priced as a ${tierLabel}.`;
  const anchor = CITY_ANCHORS[ctx.anchor];
  return `${ctx.cityName} has a published wedding figure (${formatInrRange(anchor.midRangeInr.min, anchor.midRangeInr.max)} mid-range for ${anchor.referenceGuests} guests), which is used instead of the ${tierLabel} tier.`;
}

function seasonEffect(ctx: ClassifiedContext): string {
  if (ctx.dateIso === null) return 'No date yet, so no season applies.';
  const parts = [
    ctx.season.peak ? 'peak wedding season (November–February)' : null,
    ctx.season.offPeak ? 'off-peak (July–September)' : null,
    ctx.season.weekday ? 'a weekday (Monday–Thursday)' : null,
  ].filter((part): part is string => part !== null);
  return parts.length === 0
    ? 'A regular-season weekend date.'
    : `The date falls in ${parts.join(' and on ')}.`;
}

function leadEffect(ctx: ClassifiedContext): string {
  if (ctx.dateMode === 'undated') return 'The date is not fixed yet.';
  if (ctx.dateMode === 'past') return 'The date you entered has already passed.';
  return `${ctx.daysToEvent ?? 0} days to go.`;
}

/** A crowd threshold as copy prints it ("1,000"), read from the class table itself. */
function people(count: number): string {
  return count.toLocaleString('en-IN');
}

function crowdEffect(ctx: ClassifiedContext): string {
  const { small, medium, large } = CROWD_CLASS_MAX;
  if (ctx.footfall <= small) return `Up to ${people(small)} people: basic exits and first-aid checks apply.`;
  if (ctx.footfall <= medium)
    return `Over ${people(small)} people: visible crowd-control staff are needed.`;
  if (ctx.footfall <= large)
    return `Over ${people(medium)} people: queues, a PA system, CCTV and a help desk are needed.`;
  return `Over ${people(large)} people: add an ambulance on standby and a mock drill.`;
}

function calendarEffect(ctx: ClassifiedContext): string {
  if (ctx.hinduCalendar)
    return 'Muhurat, Chaturmas and Kharmas dates apply (indicative; confirm with your pandit).';
  if (ctx.traditionProfile === null)
    return 'No tradition given, so no religious calendar rules are applied.';
  return `${ctx.traditionProfile.label}: muhurat, Chaturmas and Kharmas rules do not apply.`;
}

/**
 * Records CTX-01…08 for a classified context and returns each item's id.
 * @example
 * traceContext(jaipurCtx, trace).tier; // 'CTX-02.1'
 */
export function traceContext(ctx: ClassifiedContext, trace: TraceLog): ContextTraceIds {
  const kind = EVENT_KIND_PROFILES[ctx.kind];
  return {
    family: trace.add({
      ruleId: 'CTX-01',
      inputs: [
        ['family', ctx.family],
        ['kind', ctx.kind],
      ],
      effect: `Planning a ${kind.label.toLowerCase()} (${FAMILY_PROFILES[ctx.family].label.toLowerCase()}).`,
      sourceIds: [kind.sourceId],
    }),
    tier: trace.add({
      ruleId: 'CTX-02',
      inputs: [
        ['city typed', ctx.input.city],
        ['matched', ctx.city?.name ?? 'not found'],
        ['tier', ctx.tier],
        ['decided by', ctx.tierSource],
        ['anchor', ctx.anchor ?? 'none'],
        ['caterers price as', ctx.cateringTier],
      ],
      effect: tierEffect(ctx),
      sourceIds:
        ctx.anchor === null
          ? [TIER_PROFILES[ctx.tier].sourceId, 'S-INTEZAAM-D']
          : ['S-VK-2026', 'S-RSA-2026'],
      confidence:
        ctx.tierSource === 'gazetteer' && ctx.city !== null ? ctx.city.tierConfidence : 'D',
    }),
    scale: trace.add({
      ruleId: 'CTX-03',
      inputs: [['guests', ctx.guests]],
      effect: `${ctx.guests} guests: ${SCALE_LABELS[ctx.scale].toLowerCase()}.`,
    }),
    season: trace.add({
      ruleId: 'CTX-04',
      inputs: [
        ['date', ctx.dateIso ?? 'not fixed'],
        ['month', ctx.season.month ?? 'none'],
      ],
      effect: seasonEffect(ctx),
    }),
    lead: trace.add({
      ruleId: 'CTX-05',
      inputs: [
        ['today', ctx.todayIso],
        ['date', ctx.dateIso ?? 'not fixed'],
      ],
      effect: leadEffect(ctx),
    }),
    crowd: trace.add({
      ruleId: 'CTX-06',
      inputs: [['expected footfall', ctx.footfall]],
      effect: crowdEffect(ctx),
    }),
    rain: trace.add({
      ruleId: 'CTX-07',
      inputs: [
        ['setting', ctx.setting],
        ['month', ctx.season.month ?? 'none'],
        ['city', ctx.cityName],
      ],
      effect: ctx.rainRisk
        ? 'Open-air event in a rainy month: plan cover.'
        : 'No rain risk flagged for this setting and month.',
    }),
    calendar: trace.add({
      ruleId: 'CTX-08',
      inputs: [['tradition', ctx.tradition ?? 'none']],
      effect: calendarEffect(ctx),
    }),
  };
}
