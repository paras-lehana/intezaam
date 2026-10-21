/**
 * Money risk probes (RISK) — a short food line and a short guest-rooms line.
 *
 * Responsibility: turn the cost check's two comparisons — the bottom-up meals against the
 * catering line (CST-04) and the priced rooms against the guest-rooms line (CST-05) — into
 * risks that name the gap, its cause and a fix. A gap above a tenth of the bottom-up cost is
 * worth acting on; a smaller one is shown for information. Boundary: detection and wording
 * only; cost-check.ts and rooms.ts compute the numbers and risks.ts orders the risks.
 */
import { DEFAULT_ROOM_NIGHTS } from '../domain/catering.js';
import { formatInr } from '../format.js';
import type { RiskSeverity } from '../schemas/plan-safety.js';
import { PERCENT } from './percent.js';
import type { Probe } from './risk-probes.js';
import { roomsGapInr, roomsLineInr } from './rooms.js';

/** A line short by more than 10% of its bottom-up cost is worth acting on (grade D). */
const SHORT_ACTION_PCT = 10;

/** 'medium' above SHORT_ACTION_PCT of the bottom-up cost, else 'info' (integers, no drift). */
function shortSeverity(shortInr: number, costInr: number): RiskSeverity {
  return shortInr * PERCENT > SHORT_ACTION_PCT * costInr ? 'medium' : 'info';
}

const cateringProbe: Probe = ({ costCheck }) => {
  // The food gap alone: a rooms gap also makes the check "short" but has its own probe.
  if (costCheck.gapInr >= 0) return null;
  return {
    id: 'risk-catering-short',
    ruleId: 'CST-04',
    severity: shortSeverity(-costCheck.gapInr, costCheck.cateringInr.mid),
    title: `The food line looks ${formatInr(-costCheck.gapInr)} short`,
    detail: `Bottom-up, the planned meals cost about ${formatInr(costCheck.cateringInr.mid)}; the food line is ${formatInr(costCheck.cateringLineInr)}.`,
    fix: 'Move money into the food line from lower-priority lines, plan fewer full meals, or choose a simpler caterer (see the levers).',
    traceIds: costCheck.traceIds,
  };
};

const roomsProbe: Probe = ({ ctx, costCheck, budget }) => {
  const gapInr = roomsGapInr(costCheck.roomsInr, budget.lines);
  if (gapInr >= 0) return null;
  // BUD-03 moves a destination wedding's rooms money into the venue line, where a resort
  // package often bundles the rooms, so the user is told to check before moving money.
  const bundled = ctx.input.destination
    ? ' If your venue package includes rooms, count them from the venue line.'
    : '';
  return {
    id: 'risk-rooms-short',
    ruleId: 'CST-05',
    severity: shortSeverity(-gapInr, costCheck.roomsInr),
    title: `Guest rooms look ${formatInr(-gapInr)} short`,
    detail: `Rooms for outstation guests cost about ${formatInr(costCheck.roomsInr)} for ${DEFAULT_ROOM_NIGHTS} nights; the guest-rooms line is ${formatInr(roomsLineInr(budget.lines))}.${bundled}`,
    fix: 'Book one night fewer, host close family at home, ask fewer outstation guests to stay, or move money into the guest-rooms line from lower-priority lines.',
    traceIds: costCheck.traceIds,
  };
};

/** The cost check's food and guest-rooms gaps. */
export const MONEY_PROBES: readonly Probe[] = [cateringProbe, roomsProbe];
