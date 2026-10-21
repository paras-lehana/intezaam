/**
 * Responsibility: the guest-list rules ported from the owner's guest manager — Hinglish and
 * Hindi RSVP, diet and side words, and a headcount of people (not rows) where declined
 * parties never count. Boundary: pure functions; the panel is tested separately.
 */
import { describe, expect, it } from 'vitest';
import {
  GUEST_DIETS,
  type Guest,
  countGuests,
  pickOption,
  readDiet,
  readSide,
  readStatus,
  wordKey,
} from '../../../components/features/people/guest-rules';

function guest(overrides: Partial<Guest>): Guest {
  return {
    id: 'g',
    name: 'Guest',
    side: 'both',
    adults: 1,
    kids: 0,
    diet: 'veg',
    status: 'invited',
    ...overrides,
  };
}

describe('guest words', () => {
  it('read RSVP words in English, Hinglish and as typed', () => {
    expect(readStatus('haan')).toBe('confirmed');
    expect(readStatus('  Aa  Rahe ')).toBe('confirmed');
    expect(readStatus('nahi')).toBe('declined');
    expect(readStatus('shayad')).toBe('tentative');
    expect(readStatus('checked-in')).toBe('arrived');
    expect(readStatus('')).toBe('invited');
    expect(readStatus('something else', 'tentative')).toBe('tentative');
  });

  it('read diet words, Jain-style before veg and non-veg before veg', () => {
    expect(readDiet('NV')).toBe('non-veg');
    expect(readDiet('मांसाहारी')).toBe('non-veg');
    expect(readDiet('no onion no garlic')).toBe('jain');
    expect(readDiet('shakahari')).toBe('veg');
    expect(readDiet('either')).toBe('no-preference');
    expect(readDiet('', 'jain')).toBe('jain');
  });

  it('read the sides of a wedding family', () => {
    expect(readSide('ladkiwale')).toBe('bride');
    expect(readSide('Ladke wale')).toBe('groom');
    expect(readSide('dono')).toBe('both');
    expect(readSide('neighbours', 'groom')).toBe('groom');
  });

  it('normalise keys and narrow select values', () => {
    expect(wordKey(' Not  Coming’s ')).toBe("not coming's");
    expect(pickOption(GUEST_DIETS, 'no-preference', 'veg')).toBe('no-preference');
    expect(pickOption(GUEST_DIETS, 'pizza', 'veg')).toBe('veg');
  });
});

describe('countGuests', () => {
  const list: Guest[] = [
    guest({ id: 'a', adults: 2, kids: 1, status: 'confirmed', diet: 'jain', side: 'bride' }),
    guest({ id: 'b', adults: 3, status: 'declined', side: 'groom' }),
    guest({ id: 'c', adults: 1, kids: 2, status: 'tentative', side: 'groom' }),
    guest({ id: 'd', adults: 2, status: 'arrived', diet: 'non-veg', side: 'both' }),
  ];

  it('counts people, not rows, and never counts a declined party', () => {
    const counts = countGuests(list);
    expect(counts.parties).toBe(list.length);
    expect(counts.people).toBe(2 + 1 + 3 + 1 + 2 + 2);
    expect(counts.declined).toBe(3);
    expect(counts.expected).toBe(counts.people - counts.declined);
    expect(counts.confirmed).toBe(2 + 1 + 2);
    expect(counts.awaiting).toBe(counts.expected - counts.confirmed);
  });

  it('splits plates by diet for confirmed parties and people by side', () => {
    const counts = countGuests(list);
    expect(counts.diet).toEqual({ veg: 0, 'non-veg': 2, jain: 3, 'no-preference': 0 });
    expect(counts.side).toEqual({ bride: 3, groom: 3, both: 2 });
  });

  it('is all zeroes for an empty list', () => {
    expect(countGuests([]).people).toBe(0);
  });
});
