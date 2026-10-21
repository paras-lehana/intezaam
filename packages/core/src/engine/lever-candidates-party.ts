/**
 * Party and community lever candidates (LEV-06, LEV-07).
 *
 * Responsibility: a party at home, a capped guest list for a kids' party, DIY decor, local
 * sponsors for a funding gap and a shorter cultural programme — each with its saving and
 * the context its new money status is judged on. Boundary: candidates only; levers.ts
 * ranks them.
 */
import { KIDS_PARTY_ITEMS_INR } from '../domain/costs.js';
import type { LeverId } from '../domain/levers.js';
import { formatInr } from '../format.js';
import type { ContextPatch } from '../schemas/patch.js';
import {
  type Candidate,
  type LeverDraft,
  type LeverInput,
  lineOf,
  rerun,
  withBudget,
} from './lever-candidates.js';
import { partyCap } from './lever-helpers.js';
import { applyPatch } from './what-if.js';

/** LEV-07 (grade D): trimming the cultural programme halves its line. */
const TRIM_PROGRAMME_SHARE = 0.5;

/**
 * A lever that changes the context, priced by re-running the estimate on the changed context;
 * null when the change saves nothing.
 */
function estimateLever(
  { context, core, todayIso }: LeverInput,
  id: LeverId,
  detail: string,
  patch: ContextPatch,
): LeverDraft | null {
  const after = applyPatch(context, patch);
  const saving = core.ctx.estimate.mid - rerun(after, todayIso).ctx.estimate.mid;
  if (saving <= 0) return null;
  return { id, detail, savingInr: saving, patch, judge: after };
}

const homeParty: Candidate = (input) => {
  if (input.core.ctx.family !== 'birthday' || input.core.ctx.setting === 'home') return null;
  return estimateLever(
    input,
    'home-party',
    'A party at home skips the hall hire; typical home parties cost far less.',
    { ops: [{ op: 'setVenueSetting', value: 'home' }] },
  );
};

const fewerChildren: Candidate = (input) => {
  const cap = partyCap(input.core.ctx);
  if (cap === null) return null;
  return estimateLever(
    input,
    'fewer-children',
    `Cap the guest list at ${cap} so the party fits a smaller, cheaper format.`,
    { ops: [{ op: 'setGuests', value: cap }] },
  );
};

const diyDecor: Candidate = ({ context, core }) => {
  const decor = lineOf(core, 'decor');
  const saving = decor - KIDS_PARTY_ITEMS_INR.decor.min;
  if (core.ctx.family !== 'birthday' || saving <= 0) return null;
  return {
    id: 'diy-decor',
    detail: `Simple bought decor costs from ${formatInr(KIDS_PARTY_ITEMS_INR.decor.min)}; doing it yourselves frees the rest of the decor line.`,
    savingInr: saving,
    judge: withBudget(context, core.ctx.budgetInr + saving),
  };
};

const findSponsors: Candidate = ({ context, core }) => {
  const gap = core.funding?.funding.gapInr ?? 0;
  if (gap <= 0 || context.community === undefined) return null;
  const sponsorsInr = (context.community.sponsorsInr ?? 0) + gap;
  return {
    id: 'find-sponsors',
    detail: `About ${formatInr(gap)} more from local sponsors closes the gap; shops sponsor stalls, banners and the help desk.`,
    savingInr: gap,
    judge: { ...context, community: { ...context.community, sponsorsInr } },
  };
};

const trimProgramme: Candidate = ({ context, core }) => {
  const saving = Math.round(lineOf(core, 'cultural_prizes') * TRIM_PROGRAMME_SHARE);
  if (core.ctx.family !== 'community' || saving <= 0) return null;
  return {
    id: 'trim-programme',
    detail: `A shorter cultural programme halves the performances and prizes line, saving ${formatInr(saving)}.`,
    savingInr: saving,
    judge: withBudget(context, core.ctx.budgetInr - saving),
  };
};

/** Party and community levers (LEV-06, LEV-07), in LEVER_IDS order. */
export const PARTY_CANDIDATES: readonly Candidate[] = [
  homeParty,
  fewerChildren,
  diyDecor,
  findSponsors,
  trimProgramme,
];
