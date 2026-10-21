/**
 * The chanda (contribution) calculator's inputs, and the context they make.
 *
 * Responsibility: hold what the committee types — flat or tiered contributions, households
 * (or households per flat size), sponsors, the RWA fund and tickets — as text, read whole
 * rupees and counts out of it the way people type them ("₹60,000"), and write them into a
 * copy of the event context so core's own funding maths (COM-01/02, VER-F) recomputes the
 * per-household amount, the gap or the surplus. Boundary: no arithmetic of its own — the
 * numbers on screen are always the engine's, so they cannot drift from the plan.
 */
import { FLAT_SIZES, type FlatSize } from '@intezaam/core/domain';
import type { CommunityExtras, EventContext } from '@intezaam/core/schemas';

export type ChandaMode = 'flat' | 'tiered';

export interface ChandaDraft {
  readonly mode: ChandaMode;
  readonly households: string;
  readonly tiers: Readonly<Record<FlatSize, string>>;
  readonly sponsors: string;
  readonly rwaFund: string;
  readonly tickets: string;
}

/** Whatever the committee typed, without the digits: "₹60,000" and "60000" read the same. */
const NOT_A_DIGIT = /\D/g;

/**
 * A whole number from typed text; undefined when there are no digits at all.
 * @example
 * readWhole('₹60,000'); // 60000
 * readWhole(''); // undefined
 */
export function readWhole(text: string): number | undefined {
  const digits = text.replace(NOT_A_DIGIT, '');
  return digits === '' ? undefined : Number.parseInt(digits, 10);
}

function shown(value: number | undefined): string {
  return value === undefined ? '' : String(value);
}

/**
 * The calculator's starting values: exactly what the plan was computed with.
 * @example
 * chandaDraft(ganeshContext).households; // '240'
 */
export function chandaDraft(extras: CommunityExtras): ChandaDraft {
  const tiers = extras.flatTiers;
  const count = (size: FlatSize): string => shown(tiers?.[size]);
  const tiered = FLAT_SIZES.some((size) => (tiers?.[size] ?? 0) > 0);
  return {
    mode: tiered ? 'tiered' : 'flat',
    households: shown(extras.households),
    tiers: { small: count('small'), medium: count('medium'), large: count('large') },
    sponsors: shown(extras.sponsorsInr),
    rwaFund: shown(extras.rwaFundInr),
    tickets: shown(extras.ticketsInr),
  };
}

/** Optional keys are left out when blank (exactOptionalPropertyTypes: never `key: undefined`). */
function optional<K extends string>(key: K, value: number | undefined): Partial<Record<K, number>> {
  if (value === undefined) return {};
  const entry: Partial<Record<K, number>> = {};
  entry[key] = value;
  return entry;
}

/** The schema wants every flat size; a blank size has no households. */
function tierCounts(draft: ChandaDraft): Record<FlatSize, number> {
  const count = (size: FlatSize): number => readWhole(draft.tiers[size]) ?? 0;
  return { small: count('small'), medium: count('medium'), large: count('large') };
}

/**
 * A copy of the context with the calculator's values in its community details.
 * @example
 * withChanda(context, extras, { ...chandaDraft(extras), sponsors: '80000' }).community?.sponsorsInr; // 80000
 */
export function withChanda(
  context: EventContext,
  extras: CommunityExtras,
  draft: ChandaDraft,
): EventContext {
  const {
    households: _households,
    flatTiers: _flatTiers,
    sponsorsInr: _sponsors,
    rwaFundInr: _rwa,
    ticketsInr: _tickets,
    ...kept
  } = extras;
  const split =
    draft.mode === 'tiered'
      ? { flatTiers: tierCounts(draft) }
      : optional('households', readWhole(draft.households));
  const community: CommunityExtras = {
    ...kept,
    ...split,
    ...optional('sponsorsInr', readWhole(draft.sponsors)),
    ...optional('rwaFundInr', readWhole(draft.rwaFund)),
    ...optional('ticketsInr', readWhole(draft.tickets)),
  };
  return { ...context, community };
}
