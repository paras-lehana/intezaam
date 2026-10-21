/**
 * The guest list's totals — people, not rows — and a way to plan with them.
 *
 * Responsibility: parties, people, expected (not declined), confirmed, declined and still to
 * answer; the food split of confirmed guests (what the caterer needs); the side split for
 * weddings; and "Plan for N guests", a typed setGuests change applied through the engine.
 * Boundary: only the COUNT can reach the plan — names never leave the browser.
 */
import type { ReactElement } from 'react';
import { type ContextPatch, MAX_GUESTS, MIN_GUESTS } from '@intezaam/core/schemas';
import {
  GUEST_DIETS,
  GUEST_DIET_LABELS,
  GUEST_SIDES,
  GUEST_SIDE_LABELS,
  type GuestCounts,
} from './guest-rules';

export interface GuestTotalsProps {
  readonly counts: GuestCounts;
  readonly plannedGuests: number;
  readonly withSides: boolean;
  readonly onApplyPatch: (patch: ContextPatch) => void;
}

export function GuestTotals({
  counts,
  plannedGuests,
  withSides,
  onApplyPatch,
}: GuestTotalsProps): ReactElement {
  const usable =
    counts.expected >= MIN_GUESTS &&
    counts.expected <= MAX_GUESTS &&
    counts.expected !== plannedGuests;
  return (
    <div className="guest-totals" aria-live="polite">
      <p>
        <strong>{counts.people}</strong> people in {counts.parties} parties ·{' '}
        <strong>{counts.expected}</strong> not declined · {counts.confirmed} confirmed ·{' '}
        {counts.awaiting} still to answer · {counts.declined} declined
      </p>
      {counts.confirmed > 0 ? (
        <p>
          Plates for confirmed guests:{' '}
          {GUEST_DIETS.filter((diet) => counts.diet[diet] > 0)
            .map((diet) => `${GUEST_DIET_LABELS[diet]} ${counts.diet[diet]}`)
            .join(' · ')}
        </p>
      ) : null}
      {withSides && counts.expected > 0 ? (
        <p>
          {GUEST_SIDES.map((side) => `${GUEST_SIDE_LABELS[side]} ${counts.side[side]}`).join(' · ')}
        </p>
      ) : null}
      {usable ? (
        <button
          type="button"
          className="button button--secondary"
          onClick={() => onApplyPatch({ ops: [{ op: 'setGuests', value: counts.expected }] })}
        >
          Plan for {counts.expected} guests (now {plannedGuests})
        </button>
      ) : null}
    </div>
  );
}
