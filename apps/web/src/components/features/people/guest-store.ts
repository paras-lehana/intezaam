/**
 * Keeps the guest list on this device between visits.
 *
 * Responsibility: save the list to the browser's local storage and read it back through a
 * strict schema (storage is untrusted input: an edited or corrupted entry is dropped, never
 * trusted), so a family can close the tab and come back. Boundary: device-only — the list is
 * never sent to the server or to the AI; blocked storage simply means no memory.
 */
import { z } from 'zod';
import { MAX_LABEL_CHARS } from '@intezaam/core/schemas';
import { storePreference } from '../../../lib/preferences';
import { readStored } from '../common/stored-json';
import { MAX_IMPORT_ROWS, MAX_PARTY_SIZE } from './guest-csv';
import { GUEST_DIETS, GUEST_SIDES, GUEST_STATUSES, type Guest } from './guest-rules';

export const GUEST_LIST_STORAGE_KEY = 'intezaam:guest-list';

/** The same party cap the CSV import applies. */
const partySchema = z.number().int().min(0).max(MAX_PARTY_SIZE);

const guestListSchema = z
  .array(
    z.strictObject({
      id: z.string().min(1).max(MAX_LABEL_CHARS),
      name: z.string().trim().min(1).max(MAX_LABEL_CHARS),
      side: z.enum(GUEST_SIDES),
      adults: partySchema,
      kids: partySchema,
      diet: z.enum(GUEST_DIETS),
      status: z.enum(GUEST_STATUSES),
    }),
  )
  .max(MAX_IMPORT_ROWS);

/**
 * The saved list, validated; an empty list when nothing valid is stored.
 * @example
 * readGuestList(); // [] on a first visit
 */
export function readGuestList(): Guest[] {
  return readStored(GUEST_LIST_STORAGE_KEY, guestListSchema, []);
}

/**
 * Saves the list on this device (a blocked store keeps it for this visit only).
 * @example
 * storeGuestList(guests);
 */
export function storeGuestList(guests: readonly Guest[]): void {
  storePreference(GUEST_LIST_STORAGE_KEY, JSON.stringify(guests));
}
