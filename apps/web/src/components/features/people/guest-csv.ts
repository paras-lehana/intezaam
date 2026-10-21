/**
 * Guest-list CSV in and out: a spreadsheet or a Google Contacts export becomes guest rows,
 * and the list goes back out as a spreadsheet-safe CSV.
 *
 * Responsibility: RFC 4180 parsing (quoted fields, doubled quotes, embedded commas and line
 * breaks, a byte-order mark, `,` `;` or tab guessed from the first line), header detection
 * with English, Hindi and Hinglish column names (gm-core `headerMap`), Google Contacts'
 * "First Name" / "Last Name" columns, and an export through core's `csvCell`, which
 * neutralises cells that a spreadsheet would run as formulas. Boundary: pure text in and
 * out; phone numbers and e-mails are never read, so they never enter the app at all.
 */
import { csvCell } from '@intezaam/core/export';
import { MAX_LABEL_CHARS } from '@intezaam/core/schemas';
import {
  GUEST_DIET_LABELS,
  GUEST_SIDE_LABELS,
  GUEST_STATUS_LABELS,
  type Guest,
  readDiet,
  readSide,
  readStatus,
  wordKey,
} from './guest-rules';

/** Columns a guest row can fill. */
const GUEST_COLUMNS = [
  'name',
  'firstName',
  'lastName',
  'side',
  'adults',
  'kids',
  'diet',
  'status',
] as const;
type GuestColumn = (typeof GUEST_COLUMNS)[number];

/**
 * Header words per column (gm-core HEADER_SYN). `name` is anchored so Google's
 * "Name Prefix" or "Phonetic First Name" never becomes the guest's name.
 */
const HEADER_PATTERNS: Readonly<Record<GuestColumn, RegExp>> = {
  name: /^(guest\s*)?name$|^naam$|^full\s*name$|^नाम$/,
  firstName: /^(first|given)\s*name$/,
  lastName: /^(last|family|sur)\s*name$|^surname$/,
  side: /side|paksh|पक्ष/,
  adults: /adult|people|pax|guests?\s*count|persons?|\blog\b/,
  kids: /child|kids?|bache|bachche|बच्चे/,
  diet: /diet|food|khana|meal|भोजन/,
  status: /status|rsvp|coming|attending/,
};

/** Each row is at least one person, so the context's guest cap bounds a useful import. */
export const MAX_IMPORT_ROWS = 5_000;
/** A 5,000-row contacts export is about 1 MB of text; anything larger is not a guest list. */
export const MAX_IMPORT_BYTES = 2_000_000;
/** A party larger than this is a typo (the planner's guest cap is per event, not per row). */
export const MAX_PARTY_SIZE = 99;
const DELIMITERS = [',', ';', '\t'] as const;
const CRLF = '\r\n';
/** Excel and Google export UTF-8 CSV with a byte-order mark; it is not part of the first header. */
const BYTE_ORDER_MARK = /^\uFEFF/;

function guessDelimiter(firstLine: string): string {
  const counts = DELIMITERS.map((delimiter) => firstLine.split(delimiter).length - 1);
  const best = Math.max(...counts);
  return best === 0 ? ',' : (DELIMITERS[counts.indexOf(best)] ?? ',');
}

/**
 * RFC 4180 rows of trimmed cells; blank rows are dropped.
 * @example
 * parseCsv('Name,Diet\n"Sharma, R",NV'); // [['Name', 'Diet'], ['Sharma, R', 'NV']]
 */
export function parseCsv(text: string): string[][] {
  const source = text.replace(BYTE_ORDER_MARK, '');
  const delimiter = guessDelimiter(source.split(/\r?\n/, 1)[0] ?? '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const endRow = (): void => {
    row.push(cell.trim());
    if (row.some((value) => value !== '')) rows.push(row);
    row = [];
    cell = '';
  };
  // Efficiency: a single character scan, no regex backtracking over a large file.
  for (let index = 0; index < source.length; index += 1) {
    const char = source.charAt(index);
    if (quoted) {
      if (char !== '"') cell += char;
      else if (source.charAt(index + 1) === '"') {
        cell += '"';
        index += 1;
      } else quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(cell.trim());
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source.charAt(index + 1) === '\n') index += 1;
      endRow();
    } else cell += char;
  }
  endRow();
  return rows;
}

/**
 * Column index per field from a header row (the first matching column wins).
 * @example
 * headerColumns(['Naam', 'Khana', 'RSVP']); // { name: 0, diet: 1, status: 2 }
 */
export function headerColumns(row: readonly string[]): Partial<Record<GuestColumn, number>> {
  const columns: Partial<Record<GuestColumn, number>> = {};
  row.forEach((header, index) => {
    const key = wordKey(header);
    for (const column of GUEST_COLUMNS) {
      if (columns[column] === undefined && HEADER_PATTERNS[column].test(key))
        columns[column] = index;
    }
  });
  return columns;
}

function partySize(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : Math.min(MAX_PARTY_SIZE, Math.max(0, parsed));
}

function rowToGuest(
  row: readonly string[],
  columns: Partial<Record<GuestColumn, number>>,
  id: string,
): Guest | null {
  const cell = (column: GuestColumn): string => {
    const index = columns[column];
    return index === undefined ? '' : (row[index] ?? '');
  };
  const joined = `${cell('firstName')} ${cell('lastName')}`.trim();
  // Names are clipped to the label cap so a saved list always passes its schema.
  const name = (cell('name') || joined).slice(0, MAX_LABEL_CHARS).trim();
  if (name === '') return null;
  return {
    id,
    name,
    side: readSide(cell('side')),
    adults: partySize(cell('adults'), 1),
    kids: partySize(cell('kids'), 0),
    diet: readDiet(cell('diet')),
    status: readStatus(cell('status')),
  };
}

export interface GuestImport {
  readonly guests: Guest[];
  /** Rows without a name, or beyond the row cap. */
  readonly skipped: number;
}

/**
 * Guest rows from CSV text; without a recognisable header, the first column is the name.
 * @example
 * importGuests('Naam,Khana,RSVP\nVerma ji,NV,haan', 'g').guests[0]?.status; // 'confirmed'
 */
export function importGuests(text: string, idPrefix: string): GuestImport {
  const rows = parseCsv(text);
  const header = rows[0] ?? [];
  const mapped = headerColumns(header);
  // A header names the guest's column; a list of bare names has none.
  const hasHeader = mapped.name !== undefined || mapped.firstName !== undefined;
  const columns = hasHeader ? mapped : { name: 0 };
  const body = hasHeader ? rows.slice(1) : rows;
  const guests = body
    .slice(0, MAX_IMPORT_ROWS)
    .map((row, index) => rowToGuest(row, columns, `${idPrefix}-${index}`))
    .filter((guest): guest is Guest => guest !== null);
  return { guests, skipped: body.length - guests.length };
}

/**
 * The list in CSV for Google Sheets; every text cell passes core's formula guard.
 * @example
 * guestsToCsv([{ id: 'g1', name: '=1+1', side: 'both', adults: 1, kids: 0, diet: 'veg', status: 'invited' }]);
 * // 'Name,Side,Adults,Children,Diet,Status\r\n\'=1+1,Both / common,1,0,Veg,Invited\r\n'
 */
export function guestsToCsv(guests: readonly Guest[]): string {
  const header = ['Name', 'Side', 'Adults', 'Children', 'Diet', 'Status'];
  const rows = guests.map((guest) => [
    guest.name,
    GUEST_SIDE_LABELS[guest.side],
    guest.adults,
    guest.kids,
    GUEST_DIET_LABELS[guest.diet],
    GUEST_STATUS_LABELS[guest.status],
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join(CRLF) + CRLF;
}
