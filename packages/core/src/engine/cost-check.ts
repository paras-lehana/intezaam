/**
 * Bottom-up cost check (CST-01…05) — does the catering line cover the food, and does the
 * guest-rooms line cover the rooms?
 *
 * Responsibility: price every planned function bottom-up at the kind's basis (per plate,
 * party rate or intimate wedding; community food is its own line, never "short"), compare
 * it with the catering budget line, compare outstation guests' priced rooms (rooms.ts) with
 * the guest-rooms line, and word each short line so it agrees with the money verdict: a
 * Balanced or Premium budget only needs money moved, a tighter one needs a lever. The check
 * reads "short" when either line is. Every step is traced and explained in plain notes.
 * Boundary: estimates, never quotes.
 */
import {
  type CateringLevel,
  DEFAULT_ROOM_NIGHTS,
  RECEPTION_FOOD_DISCOUNT_PCT,
  SERVICE_CHARGE_PCT,
} from '../domain/catering.js';
import type { NumberRange } from '../domain/units.js';
import { formatInr } from '../format.js';
import type { CostCheck, MoneyStatus } from '../schemas/plan-money.js';
import {
  allInFactor,
  CATERING_GST_PCT,
  cateringRange,
  OFF_PEAK_SAVING_LABEL,
  plateBand,
  seasonFactor,
} from './catering.js';
import { CATERING_BASIS_INFO, cateringBasis, partyFoodBand } from './catering-basis.js';
import { communityFoodCheck } from './community-money.js';
import { expectedAt } from './headcount.js';
import { PERCENT } from './percent.js';
import { roomsCostInr } from './rooms.js';
import type { TraceLog } from './trace.js';
import type { NormalisedContext } from './types.js';
import { MONEY_LABELS } from './verdict-money.js';

/** Two decimals keep 10.25% readable without false precision. */
const PCT_DECIMALS = 100;

/** Money statuses with room to move money between lines without changing the verdict. */
const ROOMY_STATUSES: ReadonlySet<MoneyStatus> = new Set(['balanced', 'premium']);

export interface CostCheckInput {
  readonly level: CateringLevel;
  readonly cateringLineInr: number;
  /** Rooms the host pays for (0 when the guest-rooms line is switched off). */
  readonly rooms: number;
  /** The guest-rooms (accommodation) line the priced rooms are checked against. */
  readonly roomsLineInr: number;
  /** The money verdict, so a short line is worded the same way the verdict reads. */
  readonly money: MoneyStatus;
}

/**
 * The headline per-head band: the party rate at a children's party, else a lunch or dinner
 * plate at the caterer class.
 * @example
 * headlineBand(bengaluruCtx, 'standard'); // { min: 150, max: 500 }
 */
export function headlineBand(ctx: NormalisedContext, level: CateringLevel): NumberRange {
  return partyFoodBand(cateringBasis(ctx)) ?? plateBand(ctx, level);
}

function shortNote(ctx: NormalisedContext, input: CostCheckInput, gapInr: number): string[] {
  if (gapInr >= 0) return [];
  const missing = formatInr(-gapInr);
  if (!ROOMY_STATUSES.has(input.money)) {
    return [
      `Food needs about ${missing} more than its line: see the levers for a simpler caterer or fewer catered meals.`,
    ];
  }
  // Only suggest ranking catering higher when the user has not already done so.
  const rank = ctx.input.priorities.includes('catering') ? '' : ', or make catering a priority';
  return [
    `Your overall budget reads ${MONEY_LABELS[input.money]}: move about ${missing} into food from lower-priority lines${rank}; the levers show other ways to close it.`,
  ];
}

function notesFor(ctx: NormalisedContext, input: CostCheckInput, gapInr: number): string[] {
  const basis = cateringBasis(ctx);
  const band = headlineBand(ctx, input.level);
  // Party food is a per-head party rate, not a caterer class, so it is named that way.
  const priced =
    partyFoodBand(basis) === null
      ? `Priced at a ${input.level} caterer: ${formatInr(band.min)}–${formatInr(band.max)} a plate`
      : `Priced at the party rate: ${formatInr(band.min)}–${formatInr(band.max)} a head`;
  const notes = [
    ...(basis === 'plate' ? [] : [CATERING_BASIS_INFO[basis].note]),
    `${priced} before service charge and GST.`,
    `Service charge ${SERVICE_CHARGE_PCT[input.level]}% and catering GST ${CATERING_GST_PCT}% are each added once.`,
  ];
  if (seasonFactor(ctx) < 1) notes.push(`Off-peak or weekday date: ${OFF_PEAK_SAVING_LABEL} off food.`);
  if (ctx.functions.includes('reception')) {
    notes.push(
      `Reception food is planned ${RECEPTION_FOOD_DISCOUNT_PCT.min}% cheaper than the wedding dinner.`,
    );
  }
  if (ctx.input.diet.menu === 'jain' || ctx.input.diet.jainGuests || ctx.input.diet.satvik) {
    notes.push('Jain and satvik menus can cost slightly more; no surcharge is assumed.');
  }
  return [...notes, ...shortNote(ctx, input, gapInr)];
}

/** CST-01…04 for every kind priced per plate or per head (all but community events). */
function plateCheck(ctx: NormalisedContext, input: CostCheckInput, trace: TraceLog): CostCheck {
  const range = cateringRange(ctx, input.level);
  const plates = ctx.functions.reduce((sum, kind) => sum + expectedAt(ctx, kind), 0);
  const band = headlineBand(ctx, input.level);
  const basis = cateringBasis(ctx);
  const traceIds = [
    trace.add({
      ruleId: 'CST-01',
      inputs: [
        ['priced as', basis],
        ['catering tier', ctx.cateringTier],
        ['service level', input.level],
        ['menu', ctx.input.diet.menu],
      ],
      effect: `A ${input.level} serving costs ${formatInr(band.min)}–${formatInr(band.max)} before service charge and GST.`,
      sourceIds: CATERING_BASIS_INFO[basis].sourceIds,
      confidence: CATERING_BASIS_INFO[basis].confidence,
    }),
    trace.add({
      ruleId: 'CST-02',
      inputs: [['service level', input.level]],
      effect: `Service charge ${SERVICE_CHARGE_PCT[input.level]}% only; GST is added once under CST-06.`,
    }),
    trace.add({
      ruleId: 'CST-04',
      inputs: [
        ['functions', ctx.functions.join(', ')],
        ['servings', plates],
      ],
      effect: `${plates} servings across ${ctx.functions.length} functions cost ${formatInr(range.low)}–${formatInr(range.high)} all-in.`,
    }),
  ];
  if (seasonFactor(ctx) < 1) {
    traceIds.push(
      trace.add({
        ruleId: 'CST-03',
        inputs: [
          ['off-peak', ctx.season.offPeak],
          ['weekday', ctx.season.weekday],
        ],
        effect: `Off-peak or weekday pricing takes ${OFF_PEAK_SAVING_LABEL} off venue, catering and decor.`,
      }),
    );
  }
  const gapInr = input.cateringLineInr - range.mid;
  return {
    perPlateInr: band,
    plates,
    taxesServicePct:
      Math.round((allInFactor(input.level) - 1) * PERCENT * PCT_DECIMALS) / PCT_DECIMALS,
    cateringInr: range,
    roomsInr: 0,
    cateringLineInr: input.cateringLineInr,
    gapInr,
    status: gapInr >= 0 ? 'covered' : 'short',
    notes: notesFor(ctx, input, gapInr),
    traceIds,
  };
}

/** CST-05 in one note (the schema caps notes): the priced rooms against their line. */
function roomsNote(input: CostCheckInput, roomsInr: number): string {
  const priced = `${input.rooms} guest rooms for ${DEFAULT_ROOM_NIGHTS} nights at an assumed nightly rate, with room GST: ${formatInr(roomsInr)}`;
  const line = formatInr(input.roomsLineInr);
  const gapInr = input.roomsLineInr - roomsInr;
  if (gapInr >= 0) return `${priced}, within the guest-rooms line of ${line}.`;
  const fix = ROOMY_STATUSES.has(input.money)
    ? 'move money in from lower-priority lines, book one night fewer or host close family at home'
    : 'book one night fewer, host close family at home or ask fewer guests to stay';
  return `${priced}, about ${formatInr(-gapInr)} more than the guest-rooms line of ${line}: ${fix}.`;
}

/**
 * Builds the cost check: bottom-up catering against the catering line, and the priced rooms
 * against the guest-rooms line; either one short makes the check short.
 * @example
 * buildCostCheck(ctx, { level: 'standard', cateringLineInr: 700_000, rooms: 60, roomsLineInr: 43_250, money: 'balanced' }, trace).status; // 'short'
 */
export function buildCostCheck(
  ctx: NormalisedContext,
  input: CostCheckInput,
  trace: TraceLog,
): CostCheck {
  const roomsInr = roomsCostInr(ctx, input.rooms);
  const food =
    cateringBasis(ctx) === 'prasad'
      ? communityFoodCheck(ctx, input.cateringLineInr, trace)
      : plateCheck(ctx, input, trace);
  if (roomsInr === 0) return food;
  const roomsGapInr = input.roomsLineInr - roomsInr;
  const roomsId = trace.add({
    ruleId: 'CST-05',
    inputs: [
      ['rooms', input.rooms],
      ['destination', ctx.input.destination],
      ['guest-rooms line', formatInr(input.roomsLineInr)],
    ],
    effect:
      roomsGapInr >= 0
        ? `${input.rooms} rooms for ${DEFAULT_ROOM_NIGHTS} nights cost about ${formatInr(roomsInr)} with room GST, within the guest-rooms line.`
        : `${input.rooms} rooms for ${DEFAULT_ROOM_NIGHTS} nights cost about ${formatInr(roomsInr)} with room GST, ${formatInr(-roomsGapInr)} more than the guest-rooms line.`,
  });
  return {
    ...food,
    roomsInr,
    // A rooms gap is a money gap too, so the levers and the risk radar see it.
    status: roomsGapInr < 0 ? 'short' : food.status,
    notes: [...food.notes, roomsNote(input, roomsInr)],
    traceIds: [...food.traceIds, roomsId],
  };
}
