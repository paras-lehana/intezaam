/**
 * Tests for the CSV export (RFC 4180 + the OWASP formula-injection guard).
 *
 * Responsibility: cells (numbers, blanks, quoting, every formula-start character), one row
 * per budget line, task and vendor with CRLF endings, and a hostile task title that must
 * never reach Sheets as a formula. Boundary: plans come from the real engine; expected rows
 * are derived from the plan.
 */
import { describe, expect, it } from 'vitest';
import { CSV_TABLES, csvCell, planToCsv } from '../export/csv.js';
import type { Plan } from '../schemas/plan.js';
import { planned, plannedContext, undatedContext } from './fixtures/genai-plans.js';

const CRLF = '\r\n';

/** A minimal RFC 4180 reader, enough to read back what planToCsv wrote. */
function readCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text.charAt(index);
    if (quoted && char === '"' && text.charAt(index + 1) === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') quoted = !quoted;
    else if (!quoted && char === ',') {
      row.push(cell);
      cell = '';
    } else if (!quoted && char === '\r' && text.charAt(index + 1) === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      index += 1;
    } else cell += char;
  }
  return rows;
}

describe('csvCell', () => {
  it('writes numbers as digits and blanks for undefined or non-finite values', () => {
    expect(csvCell(2_500_000)).toBe('2500000');
    expect(csvCell(17.27)).toBe('17.27');
    expect(csvCell(undefined)).toBe('');
    expect(csvCell(Number.NaN)).toBe('');
  });

  it('prefixes every formula-start character with a single quote', () => {
    for (const start of ['=', '+', '-', '@', '\t', '\r']) {
      expect(csvCell(`${start}SUM(A1)`).replace(/^"/, '').startsWith(`'${start}`)).toBe(true);
    }
    expect(csvCell('Book =now')).toBe('Book =now');
  });

  it('quotes fields with commas, quotes or line breaks and doubles inner quotes', () => {
    expect(csvCell('Haldi, mehendi')).toBe('"Haldi, mehendi"');
    expect(csvCell('say "yes"')).toBe('"say ""yes"""');
    expect(csvCell('two\nlines')).toBe('"two\nlines"');
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
  });
});

describe('planToCsv', () => {
  const { plan } = planned('jaipur-wedding');

  it('lists the three tables', () => {
    expect(CSV_TABLES).toEqual(['budget', 'timeline', 'vendors']);
  });

  it('writes one budget row per line with the amounts as digits', () => {
    const csv = planToCsv(plan, 'budget');
    expect(csv.endsWith(CRLF)).toBe(true);
    const rows = readCsv(csv);
    expect(rows[0]?.[0]).toBe('Category');
    expect(rows).toHaveLength(plan.budget.lines.length + 1);
    const [first] = plan.budget.lines;
    expect(rows[1]?.[1]).toBe(String(first?.amountInr));
    const total = rows.slice(1).reduce((sum, row) => sum + Number(row[1]), 0);
    expect(total).toBe(plan.budget.lines.reduce((sum, line) => sum + line.amountInr, 0));
  });

  it('writes one timeline row per task and one vendor row per checklist', () => {
    expect(readCsv(planToCsv(plan, 'timeline'))).toHaveLength(plan.timeline.tasks.length + 1);
    const vendors = readCsv(planToCsv(plan, 'vendors'));
    expect(vendors).toHaveLength(plan.vendors.length + 1);
    expect(vendors[1]?.[5]).toBe(plan.vendors[0]?.questions.join(' | '));
  });

  it('says "when the date is fixed" for an undated plan', () => {
    const undated = plannedContext(undatedContext('jaipur-wedding')).plan;
    const rows = readCsv(planToCsv(undated, 'vendors')).slice(1);
    expect(rows.every((row) => row[2] === 'when the date is fixed')).toBe(true);
    const tasks = readCsv(planToCsv(undated, 'timeline')).slice(1);
    const openTasks = undated.timeline.tasks.filter((task) => task.dueIso === undefined).length;
    expect(tasks.filter((row) => row[2] === 'when the date is fixed')).toHaveLength(openTasks);
  });

  it('never lets a hostile task title start with a formula character', () => {
    const [task] = plan.timeline.tasks;
    expect(task).toBeDefined();
    const hostile: Plan = {
      ...plan,
      timeline: {
        ...plan.timeline,
        tasks:
          task === undefined ? [] : [{ ...task, title: "=cmd|'/c calc'!A0", why: '@SUM(1+1)' }],
      },
    };
    const [, row] = readCsv(planToCsv(hostile, 'timeline'));
    expect(row?.[1]).toBe("'=cmd|'/c calc'!A0");
    expect(row?.[5]).toBe("'@SUM(1+1)");
  });
});
