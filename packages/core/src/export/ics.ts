/**
 * iCalendar export (RFC 5545) of a plan: every dated task as an all-day event and every
 * dated function as a timed event, for Google Calendar or any calendar app (feature #20).
 *
 * Responsibility: write a VCALENDAR with CRLF line endings, TEXT values escaped (\\ ; , and
 * newlines, §3.3.11), long lines folded at 75 octets without splitting a UTF-8 character
 * (§3.1), deterministic UIDs and a DTSTAMP taken from the plan's own `todayIso` (core has
 * no clock). Function times are Indian Standard Time converted to UTC (IST is UTC+05:30 all
 * year), so no VTIMEZONE block is needed. Boundary: pure string building; the browser
 * offers the download.
 */
import { addDaysIso } from '../domain/calendar.js';
import { utf8Bytes } from '../security/base64.js';
import type { Plan } from '../schemas/plan.js';

const CRLF = '\r\n';
/** RFC 5545 §3.1: content lines SHOULD NOT exceed 75 octets, excluding the line break. */
const MAX_LINE_OCTETS = 75;
/** A folded continuation line starts with one space, which counts towards its 75 octets. */
const CONTINUATION_PREFIX = ' ';
/** IST is UTC+05:30 with no daylight saving. */
const IST_OFFSET_MINUTES = 330;
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 1_440;
const PAD = 2;
const UID_DOMAIN = 'intezaam.lehana.in';
/** FNV-1a 32-bit constants: a tiny deterministic hash keeps UIDs stable across exports. */
const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const HEX_RADIX = 16;

/**
 * Escapes a TEXT value (RFC 5545 §3.3.11).
 * @example
 * escapeIcsText('Haldi; mehendi, sangeet'); // 'Haldi\\; mehendi\\, sangeet'
 */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/**
 * Folds a content line at 75 octets, never inside a UTF-8 character (RFC 5545 §3.1).
 * @example
 * foldIcsLine('SUMMARY:' + 'a'.repeat(80)).split('\r\n').length; // 2
 */
export function foldIcsLine(line: string): string {
  const parts: string[] = [];
  let current = '';
  let octets = 0;
  for (const char of line) {
    const size = utf8Bytes(char).length;
    if (octets + size > MAX_LINE_OCTETS) {
      parts.push(current);
      current = CONTINUATION_PREFIX;
      octets = CONTINUATION_PREFIX.length;
    }
    current += char;
    octets += size;
  }
  parts.push(current);
  return parts.join(CRLF);
}

function compactDate(iso: string): string {
  return iso.replace(/-/g, '');
}

function hash(text: string): string {
  let value = FNV_OFFSET_BASIS;
  for (let index = 0; index < text.length; index += 1) {
    value = Math.imul(value ^ text.charCodeAt(index), FNV_PRIME) >>> 0;
  }
  return value.toString(HEX_RADIX);
}

/** "YYYYMMDDTHHMMSSZ" for an IST date and HH:MM, plus `extraMinutes`. */
function utcStamp(dateIso: string, hhmm: string, extraMinutes = 0): string {
  const [hours = 0, minutes = 0] = hhmm.split(':').map(Number);
  const total = hours * MINUTES_PER_HOUR + minutes + extraMinutes - IST_OFFSET_MINUTES;
  const dayShift = Math.floor(total / MINUTES_PER_DAY);
  const inDay = total - dayShift * MINUTES_PER_DAY;
  const day = addDaysIso(dateIso, dayShift) ?? dateIso;
  const time = `${String(Math.floor(inDay / MINUTES_PER_HOUR)).padStart(PAD, '0')}${String(inDay % MINUTES_PER_HOUR).padStart(PAD, '0')}00`;
  return `${compactDate(day)}T${time}Z`;
}

function minutesOf(hhmm: string): number {
  const [hours = 0, minutes = 0] = hhmm.split(':').map(Number);
  return hours * MINUTES_PER_HOUR + minutes;
}

function event(fields: readonly string[]): string[] {
  return ['BEGIN:VEVENT', ...fields, 'END:VEVENT'];
}

/**
 * The plan as an .ics file: tasks as all-day events, functions as timed events.
 * @example
 * buildIcs(plan, 'Riya weds Arjun').startsWith('BEGIN:VCALENDAR\r\n'); // true
 */
export function buildIcs(plan: Plan, eventTitle: string): string {
  const seed = hash(`${eventTitle}|${plan.contextEcho.dateIso ?? plan.todayIso}`);
  const stamp = `DTSTAMP:${compactDate(plan.todayIso)}T000000Z`;
  const tasks = plan.timeline.tasks.flatMap((task) =>
    task.dueIso === undefined
      ? []
      : event([
          `UID:${task.id}-${seed}@${UID_DOMAIN}`,
          stamp,
          `DTSTART;VALUE=DATE:${compactDate(task.dueIso)}`,
          `DTEND;VALUE=DATE:${compactDate(addDaysIso(task.dueIso, 1) ?? task.dueIso)}`,
          `SUMMARY:${escapeIcsText(task.title)}`,
          `DESCRIPTION:${escapeIcsText(`${task.why} (${eventTitle})`)}`,
          `CATEGORIES:${escapeIcsText(task.phase)}`,
        ]),
  );
  const functions = plan.functions.flatMap((card) => {
    if (card.dateIso === undefined) return [];
    const length =
      (minutesOf(card.endHhmm) - minutesOf(card.startHhmm) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
    return event([
      `UID:fn-${card.functionKind}-${seed}@${UID_DOMAIN}`,
      stamp,
      `DTSTART:${utcStamp(card.dateIso, card.startHhmm)}`,
      `DTEND:${utcStamp(card.dateIso, card.startHhmm, length)}`,
      `SUMMARY:${escapeIcsText(`${card.label} · ${eventTitle}`)}`,
      `LOCATION:${escapeIcsText(plan.contextEcho.cityName)}`,
    ]);
  });
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Intezaam//Celebration planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(eventTitle)}`,
    ...functions,
    ...tasks,
    'END:VCALENDAR',
  ];
  return `${lines.map(foldIcsLine).join(CRLF)}${CRLF}`;
}
