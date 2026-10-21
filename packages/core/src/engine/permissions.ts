/**
 * Permissions and noise rules (PERM-01…08, TL-10) — what to apply for, and the hard rules.
 *
 * Responsibility: decide which permissions this event needs (amplified sound in the open,
 * the 10 pm–6 am outdoor ban, silence zones, pandals on public land, processions, fire
 * safety, crackers, society approval), flag a blocker only when a grade-A rule is broken
 * (PERM-02), time the pandal application from the festival date (TL-10, the BMC 2026
 * pattern: opens 31 days before, closes the day before, valid until the day after it ends)
 * and pick the cracker slot for the occasion (PERM-07). Every item says "verify locally".
 * Boundary: a checklist, not legal advice.
 */
import { addDaysIso, daysBetweenIso } from '../domain/calendar.js';
import { FESTIVAL_CLASH_WINDOW_DAYS, FESTIVAL_DATES, FESTIVAL_IDS } from '../domain/festivals.js';
import {
  CRACKER_SLOTS,
  type CrackerOccasion,
  NOISE_CURFEW_START_HHMM,
  PERMISSION_IDS,
  PERMISSIONS,
  type PermissionId,
  VERIFY_LOCALLY_NOTE,
} from '../domain/permissions.js';
import type { Permission } from '../schemas/plan-safety.js';
import { isInNoiseCurfew } from './clock.js';
import { TASK_CONDITION_CHECKS } from './task-conditions.js';
import type { TraceLog } from './trace.js';
import type { ClassifiedContext } from './types.js';

/** TL-10: BMC opened 2026 pandal applications 31 days before the festival, closing the day before. */
export const PANDAL_WINDOW_OPENS_DAYS = 31;
export const PANDAL_WINDOW_CLOSES_DAYS = 1;
/** Without a dated window, apply as early as the BMC window opens before it closes (30 days). */
const PANDAL_APPLY_LEAD_DAYS = PANDAL_WINDOW_OPENS_DAYS - PANDAL_WINDOW_CLOSES_DAYS;
/** The lead as copy reads it, so the text and the window constants cannot drift apart. */
const APPLY_LEAD = `at least ${PANDAL_APPLY_LEAD_DAYS} days before`;

/**
 * PERM-07: the Supreme Court let Tamil Nadu, Puducherry and the other southern states choose
 * their own two-hour Diwali slot (modification of 30 Oct 2018, S-SCCONLINE-2018).
 */
const STATE_SET_SLOT_STATES: readonly string[] = [
  'Tamil Nadu',
  'Puducherry',
  'Kerala',
  'Karnataka',
  'Andhra Pradesh',
  'Telangana',
];

/** Festivals with their own cracker slot; every other festival follows the Diwali baseline. */
const OCCASION_BY_FESTIVAL: readonly (readonly [string, CrackerOccasion])[] = [
  ['gurpurab-', 'gurpurab'],
  ['christmas-', 'christmas-new-year'],
];

/** New Year's Eve shares the Christmas slot (11:55 pm–12:30 am). */
const NEW_YEARS_EVE_SUFFIX = '-12-31';

const OCCASION_LABELS: Readonly<Record<CrackerOccasion, string>> = {
  diwali: 'Diwali and other festivals',
  gurpurab: 'Gurpurab',
  'christmas-new-year': "Christmas Eve and New Year's Eve",
  'southern-states-diwali': 'Diwali in the southern states',
};

interface PermissionRule {
  /** The permission belongs in the checklist at all. */
  readonly applies: (ctx: ClassifiedContext) => boolean;
  /** This event needs it (else it is shown as "check if this applies"). */
  readonly required: (ctx: ClassifiedContext) => boolean;
}

const loudOutdoors = (ctx: ClassifiedContext): boolean => ctx.amplifiedSound && ctx.openAir;
const always = (): boolean => true;

const PERMISSION_RULES: Readonly<Record<PermissionId, PermissionRule>> = {
  loudspeaker: { applies: loudOutdoors, required: always },
  'night-sound': { applies: loudOutdoors, required: always },
  'silence-zone': {
    applies: (ctx) => ctx.amplifiedSound,
    required: (ctx) => ctx.input.sound?.nearSilenceZone === true,
  },
  pandal: {
    applies: (ctx) => ctx.family === 'community',
    required: (ctx) => ctx.input.community?.premises === 'public',
  },
  procession: { applies: (ctx) => ctx.functions.includes('visarjan'), required: always },
  fire: { applies: TASK_CONDITION_CHECKS['temporary-structure'], required: always },
  firecrackers: { applies: (ctx) => ctx.input.sound?.crackers === true, required: always },
  society: { applies: TASK_CONDITION_CHECKS['private-premises'], required: always },
};

/** PERM-02 is the only blocker: a grade-A rule the plan as described breaks. */
function isBlocker(id: PermissionId, ctx: ClassifiedContext): boolean {
  const end = ctx.input.sound?.endHhmm;
  return id === 'night-sound' && end !== undefined && isInNoiseCurfew(end);
}

/** TL-10: the pandal window for this date, when the date is fixed. */
function pandalTiming(ctx: ClassifiedContext): string {
  const base = PERMISSIONS.pandal.timing;
  if (ctx.dateMode !== 'dated' || ctx.dateIso === null) return `${base}. Apply ${APPLY_LEAD}.`;
  const opens = addDaysIso(ctx.dateIso, -PANDAL_WINDOW_OPENS_DAYS) ?? ctx.dateIso;
  const closes = addDaysIso(ctx.dateIso, -PANDAL_WINDOW_CLOSES_DAYS) ?? ctx.dateIso;
  // The festival's last day is day `days`; the permission runs to the day after it ends.
  const validUntil = addDaysIso(ctx.dateIso, ctx.input.community?.days ?? 1) ?? ctx.dateIso;
  return `${base}. On that pattern, expect applications about ${opens} to ${closes}, valid until ${validUntil} (the day after it ends); elsewhere apply ${APPLY_LEAD}.`;
}

/**
 * PERM-07: which cracker slot applies — a festival with its own slot within a day of the
 * date, New Year's Eve, a southern state's own slot, else the Diwali baseline.
 * @example
 * crackerOccasion(chennaiDiwaliCtx); // 'southern-states-diwali'
 */
export function crackerOccasion(ctx: ClassifiedContext): CrackerOccasion {
  const date = ctx.dateIso;
  if (date !== null) {
    const near = FESTIVAL_IDS.find((id) =>
      FESTIVAL_DATES[id].datesIso.some(
        (day) => Math.abs(daysBetweenIso(date, day) ?? Infinity) <= FESTIVAL_CLASH_WINDOW_DAYS,
      ),
    );
    const own = OCCASION_BY_FESTIVAL.find(([prefix]) => near?.startsWith(prefix) === true);
    if (own !== undefined) return own[1];
    if (date.endsWith(NEW_YEARS_EVE_SUFFIX)) return 'christmas-new-year';
  }
  return STATE_SET_SLOT_STATES.includes(ctx.city?.state ?? '')
    ? 'southern-states-diwali'
    : 'diwali';
}

function crackerNote(ctx: ClassifiedContext): string {
  const occasion = crackerOccasion(ctx);
  const slot = `the Supreme Court slot for ${OCCASION_LABELS[occasion]} is ${CRACKER_SLOTS[occasion]}`;
  // Green-only was ordered for Delhi-NCR, "not pan India" (S-SCCONLINE-2018).
  return ctx.anchor === 'delhi-ncr'
    ? `Delhi-NCR: green, PESO-certified crackers only; ${slot}.`
    : `Reduced-emission crackers only; ${slot}.`;
}

function noteFor(id: PermissionId, ctx: ClassifiedContext, blocker: boolean): string {
  const end = ctx.input.sound?.endHhmm ?? NOISE_CURFEW_START_HHMM;
  const notes: Partial<Record<PermissionId, string>> = {
    'night-sound': blocker
      ? `Your outdoor sound runs until ${end}: move it into a closed hall or end by ${NOISE_CURFEW_START_HHMM}.`
      : `Your outdoor sound ends at ${end}, inside the limit.`,
    firecrackers: crackerNote(ctx),
  };
  const specific = notes[id];
  return specific === undefined ? VERIFY_LOCALLY_NOTE : `${specific} ${VERIFY_LOCALLY_NOTE}`;
}

function standing(blocker: boolean, required: boolean): string {
  if (blocker) return 'the plan as described breaks this rule';
  return required ? 'needed for this event' : 'check whether it applies';
}

/**
 * The permissions checklist for a context, in rule order.
 * @example
 * buildPermissions(jaipurCtx, trace).find((p) => p.id === 'night-sound')?.blocker; // true (DJ until 23:30)
 */
export function buildPermissions(ctx: ClassifiedContext, trace: TraceLog): Permission[] {
  return PERMISSION_IDS.filter((id) => PERMISSION_RULES[id].applies(ctx)).map((id) => {
    const info = PERMISSIONS[id];
    const required = PERMISSION_RULES[id].required(ctx);
    const blocker = isBlocker(id, ctx);
    const traceIds = [
      trace.add({
        ruleId: info.ruleId,
        inputs: [
          ['setting', ctx.setting],
          ['amplified sound', ctx.amplifiedSound],
          ['sound ends', ctx.input.sound?.endHhmm ?? 'none'],
          ['premises', ctx.input.community?.premises ?? 'private event'],
        ],
        effect: `${info.title}: ${standing(blocker, required)}.`,
        sourceIds: info.sourceIds,
        confidence: info.confidence,
      }),
    ];
    if (id === 'pandal') traceIds.push(trace.rule('TL-10'));
    return {
      id,
      ruleId: info.ruleId,
      title: info.title,
      authority: info.authority,
      when: id === 'pandal' ? pandalTiming(ctx) : info.timing,
      required,
      blocker,
      note: noteFor(id, ctx, blocker),
      sourceIds: [...info.sourceIds],
      traceIds,
    };
  });
}
