/**
 * CSV export of a plan's budget, timeline or vendor checklist, for Google Sheets or Excel
 * (feature #39).
 *
 * Responsibility: RFC 4180 rows (CRLF, quotes doubled, a field quoted when it holds a comma,
 * quote or line break) with the OWASP CSV-injection guard, so every text cell starting with
 * = + - @, a tab or a carriage return is prefixed with a single quote, so a plan item can
 * never run as a spreadsheet formula. Numbers are written as plain digits. Boundary: pure.
 */
import type { Plan } from '../schemas/plan.js';

export const CSV_TABLES = ['budget', 'timeline', 'vendors'] as const;

export type CsvTable = (typeof CSV_TABLES)[number];

type Cell = string | number | undefined;

const CRLF = '\r\n';
/** OWASP "CSV Injection": cells starting with these characters can be read as formulas. */
const FORMULA_START = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[",\r\n]/;
/** Budget shares are stored in basis points: 100 bp = 1%. */
const BASIS_POINTS_PER_PERCENT = 100;
/** Several list items share one cell, separated so Sheets keeps them in one column. */
const LIST_SEPARATOR = ' | ';

/**
 * One CSV field: numbers as digits, text guarded against formulas and quoted when needed.
 * @example
 * csvCell('=HYPERLINK("x")'); // '"\'=HYPERLINK(""x"")"'
 * csvCell(2500000); // '2500000'
 */
export function csvCell(value: Cell): string {
  if (value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  const guarded = FORMULA_START.test(value) ? `'${value}` : value;
  return NEEDS_QUOTES.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

function rows(header: readonly string[], body: readonly (readonly Cell[])[]): string {
  return [header, ...body].map((row) => row.map(csvCell).join(',')).join(CRLF) + CRLF;
}

const TABLES: Readonly<Record<CsvTable, (plan: Plan) => string>> = {
  budget: (plan) =>
    rows(
      [
        'Category',
        'Amount (INR)',
        'Share (%)',
        'Per guest (INR)',
        'GST (%)',
        'Priority',
        'Cost type',
      ],
      plan.budget.lines.map((line) => [
        line.label,
        line.amountInr,
        line.shareBp / BASIS_POINTS_PER_PERCENT,
        line.perGuestInr,
        line.gstPct ?? 'not estimated',
        line.priority ? 'yes' : 'no',
        line.costType,
      ]),
    ),
  timeline: (plan) =>
    rows(
      ['Phase', 'Task', 'Due date', 'Status', 'Vendor', 'Why'],
      plan.timeline.tasks.map((task) => [
        task.phase,
        task.title,
        task.dueIso ?? 'when the date is fixed',
        task.status,
        task.vendorType,
        task.why,
      ]),
    ),
  vendors: (plan) =>
    rows(
      [
        'Vendor',
        'Group',
        'Book by',
        'Budget (INR)',
        'GST (%)',
        'Questions',
        'Get in writing',
        'Red flags',
      ],
      plan.vendors.map((vendor) => [
        vendor.label,
        vendor.group,
        vendor.bookByIso ?? 'when the date is fixed',
        vendor.budgetInr,
        vendor.gstPct ?? 'not estimated',
        vendor.questions.join(LIST_SEPARATOR),
        vendor.getInWriting.join(LIST_SEPARATOR),
        vendor.redFlags.join(LIST_SEPARATOR),
      ]),
    ),
};

/**
 * One plan table in CSV text (formula-injection safe).
 * @example
 * planToCsv(plan, 'budget').split('\r\n')[0]; // 'Category,Amount (INR),Share (%),…'
 */
export function planToCsv(plan: Plan, table: CsvTable): string {
  return TABLES[table](plan);
}
