/**
 * The guest list as a table: name, side, people, food and RSVP, with a remove button.
 *
 * Responsibility: show the parties with an RSVP picker per row (a real labelled select) and
 * a labelled remove button. Removing a row hands focus to the next row's Remove button (or
 * the name box once the list is empty), never to the page. Long lists show the first rows
 * and say how many more there are. Boundary: display and per-row edits; counting happens in
 * the list hook, and the list announces what was removed.
 */
import type { ReactElement } from 'react';
import { flushSync } from 'react-dom';
import { TableScroll } from '../common/TableScroll';
import { GUEST_NAME_ID } from './GuestAddForm';
import {
  GUEST_DIET_LABELS,
  GUEST_SIDE_LABELS,
  GUEST_STATUSES,
  GUEST_STATUS_LABELS,
  type Guest,
  type GuestStatus,
  pickOption,
} from './guest-rules';

export interface GuestTableProps {
  readonly guests: readonly Guest[];
  readonly withSides: boolean;
  readonly onStatus: (id: string, status: GuestStatus) => void;
  /** Removes the party; the table then moves focus (the pressed button is gone). */
  readonly onRemove: (guest: Guest) => void;
}

/** Efficiency: a phone keeps 200 rows smooth; the CSV export always carries every row. */
export const VISIBLE_GUEST_ROWS = 200;

function removeButtonId(guest: Guest): string {
  return `guest-remove-${guest.id}`;
}

/**
 * Where focus goes after a row is removed: the next row's Remove button, else the previous
 * row's, else (the list is now empty) the name box of "Add a guest".
 */
function focusAfterRemoving(guests: readonly Guest[], index: number): string {
  const neighbour = guests[index + 1] ?? guests[index - 1];
  return neighbour === undefined ? GUEST_NAME_ID : removeButtonId(neighbour);
}

export function GuestTable({
  guests,
  withSides,
  onStatus,
  onRemove,
}: GuestTableProps): ReactElement {
  const shown = guests.slice(0, VISIBLE_GUEST_ROWS);

  function remove(guest: Guest, index: number): void {
    const next = focusAfterRemoving(guests, index);
    // flushSync: the row (and the button that had focus) is gone before focus moves on.
    flushSync(() => onRemove(guest));
    document.getElementById(next)?.focus();
  }

  return (
    <TableScroll label="Your guest list">
      <table className="people-table guest-table">
        <caption className="visually-hidden">Your guest list</caption>
        <thead>
          <tr>
            <th scope="col">Name</th>
            {withSides ? <th scope="col">Side</th> : null}
            <th scope="col">People</th>
            <th scope="col">Food</th>
            <th scope="col">RSVP</th>
            <th scope="col">
              <span className="visually-hidden">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {shown.map((guest, index) => (
            <tr key={guest.id}>
              <th scope="row">{guest.name}</th>
              {withSides ? <td>{GUEST_SIDE_LABELS[guest.side]}</td> : null}
              <td>
                {guest.adults + guest.kids}
                {guest.kids > 0 ? ` (${guest.kids} children)` : ''}
              </td>
              <td>{GUEST_DIET_LABELS[guest.diet]}</td>
              <td>
                <select
                  aria-label={`RSVP for ${guest.name}`}
                  value={guest.status}
                  onChange={(event) =>
                    onStatus(guest.id, pickOption(GUEST_STATUSES, event.target.value, guest.status))
                  }
                >
                  {GUEST_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {GUEST_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <button
                  id={removeButtonId(guest)}
                  type="button"
                  className="button button--ghost"
                  onClick={() => remove(guest, index)}
                >
                  Remove <span className="visually-hidden">{guest.name}</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {guests.length > shown.length ? (
        <p className="muted">
          Showing {shown.length} of {guests.length} parties — download the CSV to see them all.
        </p>
      ) : null}
    </TableScroll>
  );
}
