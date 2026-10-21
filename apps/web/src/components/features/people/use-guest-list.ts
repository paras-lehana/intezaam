/**
 * State for the browser-only guest list: rows, counts and the operations on them.
 *
 * Responsibility: add, import, re-status and remove parties; count people (not rows) once
 * per change; remember the list on this device. Boundary: no network — the list never
 * leaves the browser; the panel decides what to show.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { MAX_IMPORT_ROWS } from './guest-csv';
import { type Guest, type GuestCounts, type GuestStatus, countGuests } from './guest-rules';
import { readGuestList, storeGuestList } from './guest-store';

export type NewGuest = Omit<Guest, 'id'>;

export interface GuestListApi {
  readonly guests: readonly Guest[];
  readonly counts: GuestCounts;
  readonly add: (guest: NewGuest) => void;
  readonly addMany: (guests: readonly Guest[]) => void;
  readonly setStatus: (id: string, status: GuestStatus) => void;
  readonly remove: (id: string) => void;
  readonly clear: () => void;
  /** A fresh id prefix for one import, so imported ids never collide. */
  readonly nextBatch: () => string;
}

/**
 * The guest list for the People tab.
 * @example
 * const list = useGuestList();
 * list.add({ name: 'Verma ji', side: 'groom', adults: 2, kids: 0, diet: 'veg', status: 'invited' });
 */
export function useGuestList(): GuestListApi {
  const [guests, setGuests] = useState<readonly Guest[]>(readGuestList);
  const batch = useRef(0);
  // Efficiency: one counting pass per change to the list, however long it is.
  const counts = useMemo(() => countGuests(guests), [guests]);

  useEffect(() => {
    storeGuestList(guests);
  }, [guests]);

  function nextBatch(): string {
    // The time part keeps new ids apart from ids saved in an earlier visit.
    batch.current += 1;
    return `b${Date.now().toString(36)}-${batch.current}`;
  }

  return {
    guests,
    counts,
    add: (guest) => {
      const id = nextBatch();
      setGuests((current) => [...current, { ...guest, id }]);
    },
    addMany: (incoming) =>
      setGuests((current) => [...current, ...incoming].slice(0, MAX_IMPORT_ROWS)),
    setStatus: (id, status) =>
      setGuests((current) =>
        current.map((guest) => (guest.id === id ? { ...guest, status } : guest)),
      ),
    remove: (id) => setGuests((current) => current.filter((guest) => guest.id !== id)),
    clear: () => setGuests([]),
    nextBatch,
  };
}
