/**
 * The guest list as a table: name, side, people, food and RSVP, with a remove button.
 *
 * Responsibility: show the parties with an RSVP picker per row (a real labelled select) and
 * a labelled remove button. Long lists show the first rows and say how many more there are.
 * Boundary: display and per-row edits; counting happens in the list hook.
 */
import type { ReactElement } from 'react';
import { TableScroll } from '../common/TableScroll';
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
  readonly onRemove: (id: string) => void;
}

/** Efficiency: a phone keeps 200 rows smooth; the CSV export always carries every row. */
export const VISIBLE_GUEST_ROWS = 200;

export function GuestTable({
  guests,
  withSides,
  onStatus,
  onRemove,
}: GuestTableProps): ReactElement {
  const shown = guests.slice(0, VISIBLE_GUEST_ROWS);
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
          {shown.map((guest) => (
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
                  type="button"
                  className="button button--ghost"
                  onClick={() => onRemove(guest.id)}
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
