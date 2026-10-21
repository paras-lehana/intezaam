/**
 * Responsibility: the guest list kept on this device — a saved list reads back exactly,
 * and storage is untrusted input: corrupted JSON or an entry that breaks the schema (an
 * impossible party size, an unknown status) gives an empty list, never a broken one.
 * Boundary: the browser's local storage only.
 */
import { describe, expect, it } from 'vitest';
import { MAX_PARTY_SIZE } from '../../../components/features/people/guest-csv';
import type { Guest } from '../../../components/features/people/guest-rules';
import {
  GUEST_LIST_STORAGE_KEY,
  readGuestList,
  storeGuestList,
} from '../../../components/features/people/guest-store';

const GUEST: Guest = {
  id: 'g1',
  name: 'Sharma ji',
  side: 'bride',
  adults: 2,
  kids: 1,
  diet: 'veg',
  status: 'confirmed',
};

describe('guest store', () => {
  it('is empty on a first visit', () => {
    expect(readGuestList()).toEqual([]);
  });

  it('reads a saved list back exactly', () => {
    storeGuestList([GUEST]);
    expect(readGuestList()).toEqual([GUEST]);
  });

  it('drops corrupted or edited entries instead of trusting them', () => {
    window.localStorage.setItem(GUEST_LIST_STORAGE_KEY, '{not json');
    expect(readGuestList()).toEqual([]);
    window.localStorage.setItem(
      GUEST_LIST_STORAGE_KEY,
      JSON.stringify([{ ...GUEST, adults: MAX_PARTY_SIZE + 1 }]),
    );
    expect(readGuestList()).toEqual([]);
    window.localStorage.setItem(
      GUEST_LIST_STORAGE_KEY,
      JSON.stringify([{ ...GUEST, status: 'vip' }]),
    );
    expect(readGuestList()).toEqual([]);
  });
});
