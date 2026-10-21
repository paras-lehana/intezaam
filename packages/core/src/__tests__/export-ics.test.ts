/**
 * Tests for the iCalendar export (RFC 5545).
 *
 * Responsibility: TEXT escaping, folding at 75 octets without splitting a UTF-8 character,
 * CRLF line endings, one all-day event per dated task and one timed event per dated function
 * (IST converted to UTC, across midnight too), stable UIDs, and an undated plan. Boundary:
 * plans come from the real engine; expected counts and times are derived from the plan.
 */
import { describe, expect, it } from 'vitest';
import { addDaysIso } from '../domain/calendar.js';
import { buildIcs, escapeIcsText, foldIcsLine } from '../export/ics.js';
import { utf8Bytes } from '../security/base64.js';
import type { Plan } from '../schemas/plan.js';
import { planned, plannedContext, undatedContext } from './fixtures/genai-plans.js';

const CRLF = '\r\n';
/** RFC 5545 §3.1. */
const MAX_OCTETS = 75;
/** IST is UTC+05:30 all year. */
const IST_OFFSET_MINUTES = 330;
const MINUTES_PER_HOUR = 60;

/** Unfolds an .ics text into its logical content lines (RFC 5545 §3.1). */
function contentLines(ics: string): string[] {
  return ics
    .replace(/\r\n /g, '')
    .split(CRLF)
    .filter((line) => line !== '');
}

function compact(iso: string): string {
  return iso.replace(/-/g, '');
}

describe('escapeIcsText', () => {
  it('escapes backslash, semicolon, comma and every newline form', () => {
    expect(escapeIcsText('a\\b;c,d\ne\r\nf\rg')).toBe('a\\\\b\\;c\\,d\\ne\\nf\\ng');
  });
});

describe('foldIcsLine', () => {
  it('leaves a short line alone and folds a long one with a leading space', () => {
    expect(foldIcsLine('SUMMARY:short')).toBe('SUMMARY:short');
    const folded = foldIcsLine(`SUMMARY:${'a'.repeat(200)}`);
    const parts = folded.split(CRLF);
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts.slice(1)) expect(part.startsWith(' ')).toBe(true);
    expect(folded.replace(/\r\n /g, '')).toBe(`SUMMARY:${'a'.repeat(200)}`);
  });

  it('never splits a multi-byte character and keeps every part within 75 octets', () => {
    const hindi = `SUMMARY:${'शादी की तैयारी '.repeat(12)}`;
    const parts = foldIcsLine(hindi).split(CRLF);
    for (const part of parts) expect(utf8Bytes(part).length).toBeLessThanOrEqual(MAX_OCTETS);
    expect(parts.join('').replace(/^ /gm, '')).not.toContain('�');
    expect(foldIcsLine(hindi).replace(/\r\n /g, '')).toBe(hindi);
  });
});

describe('buildIcs', () => {
  const { plan } = planned('jaipur-wedding');
  const ics = buildIcs(plan, 'Riya weds Arjun, Jaipur');
  const lines = contentLines(ics);

  it('is a VCALENDAR with CRLF endings, no bare line feeds and folded lines', () => {
    expect(ics.startsWith(`BEGIN:VCALENDAR${CRLF}VERSION:2.0${CRLF}`)).toBe(true);
    expect(ics.endsWith(`END:VCALENDAR${CRLF}`)).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    for (const physical of ics.split(CRLF))
      expect(utf8Bytes(physical).length).toBeLessThanOrEqual(MAX_OCTETS);
  });

  it('writes one event per dated task and per dated function', () => {
    const datedTasks = plan.timeline.tasks.filter((task) => task.dueIso !== undefined).length;
    const datedFunctions = plan.functions.filter((card) => card.dateIso !== undefined).length;
    expect(datedFunctions).toBeGreaterThan(0);
    expect(lines.filter((line) => line === 'BEGIN:VEVENT')).toHaveLength(
      datedTasks + datedFunctions,
    );
    expect(lines.filter((line) => line === 'END:VEVENT')).toHaveLength(datedTasks + datedFunctions);
  });

  it('writes tasks as all-day events ending the next day', () => {
    const task = plan.timeline.tasks.find((candidate) => candidate.dueIso !== undefined);
    expect(task?.dueIso).toBeDefined();
    const due = task?.dueIso ?? '';
    expect(lines).toContain(`DTSTART;VALUE=DATE:${compact(due)}`);
    expect(lines).toContain(`SUMMARY:${escapeIcsText(task?.title ?? '')}`);
  });

  it('writes functions as timed events in UTC (IST is UTC+05:30)', () => {
    const card = plan.functions.find((candidate) => candidate.dateIso !== undefined);
    const [hours = 0, minutes = 0] = (card?.startHhmm ?? '00:00').split(':').map(Number);
    const utcMinutes = hours * MINUTES_PER_HOUR + minutes - IST_OFFSET_MINUTES;
    expect(utcMinutes).toBeGreaterThanOrEqual(0);
    const hh = String(Math.floor(utcMinutes / MINUTES_PER_HOUR)).padStart(2, '0');
    const stamp = `${hh}${String(utcMinutes % MINUTES_PER_HOUR).padStart(2, '0')}00Z`;
    expect(lines).toContain(`DTSTART:${compact(card?.dateIso ?? '')}T${stamp}`);
    expect(lines.some((line) => line.startsWith(`LOCATION:${plan.contextEcho.cityName}`))).toBe(
      true,
    );
  });

  it('escapes the title in the calendar name and keeps UIDs stable across exports', () => {
    expect(lines).toContain('X-WR-CALNAME:Riya weds Arjun\\, Jaipur');
    expect(buildIcs(plan, 'Riya weds Arjun, Jaipur')).toBe(ics);
    const uids = lines.filter((line) => line.startsWith('UID:'));
    expect(new Set(uids).size).toBe(uids.length);
    expect(lines).toContain(`DTSTAMP:${compact(plan.todayIso)}T000000Z`);
  });

  it('moves an early-morning IST start to the previous UTC day and wraps past midnight', () => {
    const [first] = plan.functions;
    expect(first?.dateIso).toBeDefined();
    const early: Plan = {
      ...plan,
      timeline: { ...plan.timeline, tasks: [] },
      functions: first === undefined ? [] : [{ ...first, startHhmm: '02:00', endHhmm: '01:00' }],
    };
    const event = contentLines(buildIcs(early, 'Phere'));
    const day = first?.dateIso ?? '';
    // 02:00 IST is 20:30 UTC the day before; 23 hours later (01:00 IST) is 19:30 UTC on the day.
    expect(event).toContain(`DTSTART:${compact(addDaysIso(day, -1) ?? '')}T203000Z`);
    expect(event).toContain(`DTEND:${compact(day)}T193000Z`);
  });

  it('writes no event for an undated plan task or function', () => {
    const undated = plannedContext(undatedContext('bengaluru-birthday')).plan;
    const datedTasks = undated.timeline.tasks.filter((task) => task.dueIso !== undefined).length;
    const datedFunctions = undated.functions.filter((card) => card.dateIso !== undefined).length;
    const events = contentLines(buildIcs(undated, 'Party')).filter(
      (line) => line === 'BEGIN:VEVENT',
    );
    expect(events).toHaveLength(datedTasks + datedFunctions);
  });
});
