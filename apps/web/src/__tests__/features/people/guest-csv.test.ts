/**
 * Responsibility: guest CSV import and export — RFC 4180 parsing, Hinglish and Hindi headers
 * and values, Google Contacts columns, the row and party caps, and the export's formula
 * guard (core `csvCell`). Boundary: pure text; the file picker is tested with the panel.
 */
import { describe, expect, it } from 'vitest';
import { csvCell } from '@intezaam/core/export';
import {
  MAX_PARTY_SIZE,
  guestsToCsv,
  headerColumns,
  importGuests,
  parseCsv,
} from '../../../components/features/people/guest-csv';
import type { Guest } from '../../../components/features/people/guest-rules';

describe('parseCsv', () => {
  it('handles quotes, doubled quotes, embedded commas and line breaks, and a BOM', () => {
    const text = '﻿Name,Note\r\n"Sharma, R","He said ""haan""\nlater"\r\n\r\n';
    expect(parseCsv(text)).toEqual([
      ['Name', 'Note'],
      ['Sharma, R', 'He said "haan"\nlater'],
    ]);
  });

  it('guesses a semicolon or tab delimiter from the first line', () => {
    expect(parseCsv('Naam;Khana\nVerma;NV')).toEqual([
      ['Naam', 'Khana'],
      ['Verma', 'NV'],
    ]);
    expect(parseCsv('Naam\tKhana\nVerma\tveg')[1]).toEqual(['Verma', 'veg']);
  });
});

describe('headerColumns', () => {
  it('maps English, Hinglish and Hindi headers', () => {
    expect(headerColumns(['Naam', 'Bachche', 'Khana', 'RSVP', 'Paksh'])).toEqual({
      name: 0,
      kids: 1,
      diet: 2,
      status: 3,
      side: 4,
    });
  });

  it("never takes Google's Name Prefix as the name", () => {
    const columns = headerColumns(['First Name', 'Last Name', 'Name Prefix', 'Phone 1 - Value']);
    expect(columns).toEqual({ firstName: 0, lastName: 1 });
  });
});

describe('importGuests', () => {
  it('reads Hinglish values into typed guests, people per party', () => {
    const text =
      'Naam,Log,Bachche,Khana,RSVP,Side\nVerma ji,2,1,NV,haan,ladkewale\nGupta family,4,,shakahari,nahi,ladkiwale';
    const { guests, skipped } = importGuests(text, 'imp');
    expect(skipped).toBe(0);
    expect(guests).toEqual([
      {
        id: 'imp-0',
        name: 'Verma ji',
        side: 'groom',
        adults: 2,
        kids: 1,
        diet: 'non-veg',
        status: 'confirmed',
      },
      {
        id: 'imp-1',
        name: 'Gupta family',
        side: 'bride',
        adults: 4,
        kids: 0,
        diet: 'veg',
        status: 'declined',
      },
    ]);
  });

  it('joins Google Contacts first and last names and ignores phone numbers', () => {
    const text =
      'First Name,Last Name,Phone 1 - Label,Phone 1 - Value\nAsha,Rao,Mobile,+91 98765 43210';
    const [first] = importGuests(text, 'g').guests;
    expect(first?.name).toBe('Asha Rao');
    expect(JSON.stringify(first)).not.toContain('98765');
  });

  it('treats a header-less file as a list of names and skips nameless rows', () => {
    const { guests, skipped } = importGuests('Meena\n,3\nRavi', 'x');
    expect(guests.map((entry) => entry.name)).toEqual(['Meena', 'Ravi']);
    expect(skipped).toBe(1);
  });

  it('caps a typo party size', () => {
    const [entry] = importGuests('Name,Adults\nBig family,500', 'x').guests;
    expect(entry?.adults).toBe(MAX_PARTY_SIZE);
  });
});

describe('guestsToCsv', () => {
  const risky: Guest = {
    id: 'g1',
    name: '=HYPERLINK("http://evil.example","x")',
    side: 'both',
    adults: 1,
    kids: 0,
    diet: 'veg',
    status: 'invited',
  };

  it('passes every name through the formula guard', () => {
    const csv = guestsToCsv([
      risky,
      { ...risky, id: 'g2', name: '+91 call me' },
      { ...risky, id: 'g3', name: '@cmd' },
    ]);
    const lines = csv.split('\r\n');
    expect(lines[1]?.startsWith(csvCell(risky.name))).toBe(true);
    expect(lines[1]?.startsWith('"\'=HYPERLINK')).toBe(true);
    expect(lines[2]?.startsWith("'+91")).toBe(true);
    expect(lines[3]?.startsWith("'@cmd")).toBe(true);
  });

  it('round-trips through the importer', () => {
    const safe: Guest = {
      ...risky,
      name: 'Sharma, R',
      adults: 3,
      kids: 2,
      diet: 'jain',
      status: 'confirmed',
      side: 'bride',
    };
    const [back] = importGuests(guestsToCsv([safe]), 'g').guests;
    expect(back).toEqual({ ...safe, id: 'g-0' });
  });
});
