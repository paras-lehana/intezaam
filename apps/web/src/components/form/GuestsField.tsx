/**
 * Essential 4 of 5: how many guests are invited.
 *
 * Responsibility: the guest count, with the occasion's typical range as a hint where a
 * source publishes one (e.g. kids' birthdays, 04 §5.2). Boundary: the engine turns
 * invited guests into expected guests and plates; this field takes the invited number.
 */
import type { ReactElement } from 'react';
import { EVENT_KIND_PROFILES } from '@intezaam/core/domain';
import { NumberField } from './NumberField';
import type { SectionProps } from './form-fields';

function guestHint(state: SectionProps['state']): string {
  const typical = state.kind === '' ? null : EVENT_KIND_PROFILES[state.kind].typicalGuests;
  return typical === null
    ? 'Everyone you plan to invite, across all functions.'
    : `Typical for this occasion: ${typical.min}–${typical.max} guests.`;
}

export function GuestsField({ state, update, errors, attention }: SectionProps): ReactElement {
  return (
    <NumberField
      field="guests"
      inputId="planner-guests"
      label="Guests invited"
      value={state.guests}
      onChange={(guests) => update({ guests })}
      hint={guestHint(state)}
      error={errors.guests}
      attention={attention === 'guests'}
      placeholder="e.g. 200"
    />
  );
}
