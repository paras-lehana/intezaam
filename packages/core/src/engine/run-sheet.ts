/**
 * Day-of run sheet (FN-03) — who arrives when, for every function.
 *
 * Responsibility: for each function, a slot per booked vendor at its arrival lead before
 * the start (decor 3 hours, makeup 2.5, catering 1.5, music 1, photos and rituals half an
 * hour), the start itself, and — for open-air amplified sound that runs late — the 10 pm
 * stop, each with an owner matched to who is doing the work. Boundary: times only; the
 * function layout comes from functions.ts.
 */
import { CEREMONY_SEQUENCES } from '../domain/ceremonies.js';
import type { HelpLevel } from '../domain/context-options.js';
import { FUNCTION_PROFILES } from '../domain/functions.js';
import { NOISE_CURFEW_START_HHMM } from '../domain/permissions.js';
import { VENDOR_ARRIVAL_LEAD_MIN } from '../domain/vendor-timing.js';
import { VENDOR_PROFILES, type VendorType } from '../domain/vendors.js';
import type { RunSheet } from '../schemas/plan-time.js';
import { addMinutes, clockLabel, runsIntoCurfew, toMinutes } from './clock.js';
import type { FunctionTiming } from './functions.js';
import type { TraceLog } from './trace.js';
import type { ClassifiedContext } from './types.js';

/** The schema allows two dozen slots per function. */
const MAX_SLOTS = 24;

/** Who handles vendors on the day, by how the family is running the event. */
const OWNER_BY_HELP: Readonly<Record<HelpLevel, string>> = {
  diy: 'You',
  family: 'Family point person',
  planner: 'Planner',
};

interface Slot {
  readonly offset: number;
  readonly atHhmm: string;
  readonly title: string;
  readonly owner: string;
  readonly vendorType?: VendorType;
}

/** The vendors on site for one function: its own list plus the rites it holds, if booked. */
function vendorsAt(
  ctx: ClassifiedContext,
  timing: FunctionTiming,
  booked: ReadonlySet<VendorType>,
): VendorType[] {
  const rites =
    ctx.family === 'wedding' && ctx.tradition !== null
      ? CEREMONY_SEQUENCES[ctx.tradition]
          .filter((step) => step.functionKind === timing.kind)
          .flatMap((step) => step.vendors)
      : [];
  return [...new Set([...FUNCTION_PROFILES[timing.kind].vendors, ...rites])].filter((v) =>
    booked.has(v),
  );
}

function slotsFor(
  ctx: ClassifiedContext,
  timing: FunctionTiming,
  booked: ReadonlySet<VendorType>,
): Slot[] {
  const owner = OWNER_BY_HELP[ctx.input.helpLevel];
  const arrivals = vendorsAt(ctx, timing, booked).flatMap((vendorType): Slot[] => {
    const lead = VENDOR_ARRIVAL_LEAD_MIN[vendorType];
    if (lead === null) return [];
    return [
      {
        offset: -lead,
        atHhmm: addMinutes(timing.startHhmm, -lead),
        title: `${VENDOR_PROFILES[vendorType].label}: on site and ready`,
        owner,
        vendorType,
      },
    ];
  });
  const slots: Slot[] = [
    ...arrivals,
    { offset: 0, atHhmm: timing.startHhmm, title: `${timing.label} begins`, owner: 'Hosts' },
  ];
  if (ctx.amplifiedSound && ctx.openAir && runsIntoCurfew(timing.startHhmm, timing.durationHours)) {
    const untilCurfew = Math.max(
      0,
      toMinutes(NOISE_CURFEW_START_HHMM) - toMinutes(timing.startHhmm),
    );
    slots.push({
      offset: untilCurfew,
      atHhmm: addMinutes(timing.startHhmm, untilCurfew),
      title: `Outdoor amplified music stops (${clockLabel(NOISE_CURFEW_START_HHMM)} rule)`,
      owner,
      vendorType: 'sound_light',
    });
  }
  return slots
    .sort((a, b) => a.offset - b.offset || a.title.localeCompare(b.title))
    .slice(0, MAX_SLOTS);
}

/**
 * Builds the run sheet for every function.
 * @example
 * buildRunSheet(jaipurCtx, timings, new Set(['decorator']), trace)[0]?.slots[0]?.atHhmm; // 3 hours before the start
 */
export function buildRunSheet(
  ctx: ClassifiedContext,
  timings: readonly FunctionTiming[],
  booked: ReadonlySet<VendorType>,
  trace: TraceLog,
): RunSheet[] {
  const id = trace.add({
    ruleId: 'FN-03',
    inputs: [
      ['functions', timings.length],
      ['help', ctx.input.helpLevel],
    ],
    effect:
      'Each vendor is due before the start by its usual set-up time: decor 3 hours, makeup 2.5, catering 1.5, music 1, photos and rituals half an hour.',
  });
  return timings.map((timing) => ({
    functionKind: timing.kind,
    label: timing.label,
    ...(timing.dateIso === null ? {} : { dateIso: timing.dateIso }),
    slots: slotsFor(ctx, timing, booked).map(({ atHhmm, title, owner, vendorType }) => ({
      atHhmm,
      title,
      owner,
      ...(vendorType === undefined ? {} : { vendorType }),
    })),
    traceIds: [id],
  }));
}
