/**
 * What the Share tab hands out: CSV and calendar files, the share link and the saved plan.
 *
 * Responsibility: the file names and contents for each export (core `planToCsv`,
 * `buildIcs`), the `#plan=` link built with core's validated codec, and the saved-plan file
 * — written as versioned JSON and read back defensively (a size cap, a guarded parse, an
 * envelope schema and the full `eventContextSchema`, the same validation the server
 * applies). Boundary: pure; the panel triggers downloads and navigation.
 */
import { z } from 'zod';
import { type CsvTable, buildIcs, encodeContextForUrl, planToCsv } from '@intezaam/core/export';
import { type EventContext, type Plan, eventContextSchema } from '@intezaam/core/schemas';
import { PLAN_FRAGMENT_PREFIX } from '../../../lib/plan-state';
import { parseJsonSafe } from '../common/stored-json';
import { type DownloadKind, fileSlug } from './download';

export interface ExportFile {
  readonly fileName: string;
  readonly text: string;
  readonly kind: DownloadKind;
}

export const CSV_LABELS: Readonly<Record<CsvTable, string>> = {
  budget: 'Budget',
  timeline: 'Checklist and dates',
  vendors: 'Vendor checklist',
};

/** Marks a saved plan so another JSON file is refused with a clear message. */
const PLAN_FILE_APP = 'intezaam';
const PLAN_FILE_VERSION = 1;
/** A saved context is 1–2 KB; 64 KB leaves headroom and refuses anything else quickly. */
export const MAX_PLAN_FILE_BYTES = 65_536;
const JSON_INDENT = 2;

export const NOT_A_PLAN_FILE = 'That file is not a saved Intezaam plan.';
export const BROKEN_PLAN_FILE = 'That saved plan is damaged or from an older version.';

/**
 * One plan table as a CSV file for Google Sheets.
 * @example
 * csvExport(plan, 'budget').fileName; // 'jaipur-wedding-budget.csv'
 */
export function csvExport(plan: Plan, table: CsvTable): ExportFile {
  return {
    fileName: `${fileSlug(plan.title)}-${table}.csv`,
    text: planToCsv(plan, table),
    kind: 'csv',
  };
}

/**
 * Every dated task and function as an .ics calendar file.
 * @example
 * icsExport(plan).text.startsWith('BEGIN:VCALENDAR'); // true
 */
export function icsExport(plan: Plan): ExportFile {
  return { fileName: `${fileSlug(plan.title)}.ics`, text: buildIcs(plan, plan.title), kind: 'ics' };
}

/**
 * A link that opens this plan: the whole context in the fragment, which never reaches a server.
 * The page's own query (a tracking tag such as `?fbclid=` or `utm_`) is not passed on.
 * @example
 * shareLink(context, 'https://intezaam.lehana.in/plan?utm_source=x'); // 'https://intezaam.lehana.in/plan#plan=v1.…'
 */
export function shareLink(context: EventContext, pageUrl: string): string {
  const page = new URL(pageUrl);
  return `${page.origin}${page.pathname}#${PLAN_FRAGMENT_PREFIX}${encodeContextForUrl(context)}`;
}

/**
 * The plan's inputs as a saved file (the plan itself is recomputed on restore).
 * @example
 * planFile(context).fileName; // 'jaipur-wedding-plan.json'
 */
export function planFile(context: EventContext, title: string): ExportFile {
  const body = { app: PLAN_FILE_APP, version: PLAN_FILE_VERSION, context };
  return {
    fileName: `${fileSlug(title)}-plan.json`,
    text: JSON.stringify(body, null, JSON_INDENT),
    kind: 'json',
  };
}

/**
 * The saved file's envelope: our marker decides "not a plan file"; the version and the
 * context are checked next, so a damaged plan gets its own message.
 */
const planEnvelopeSchema = z.object({
  app: z.literal(PLAN_FILE_APP),
  version: z.unknown(),
  context: z.unknown(),
});

/** Either the validated context or a sentence saying why the file cannot be used. */
export type PlanFileResult =
  | { readonly ok: true; readonly value: EventContext }
  | { readonly ok: false; readonly error: string };

/**
 * Reads a saved plan file back, validating everything in it.
 * @example
 * readPlanFile(planFile(context, 'x').text); // { ok: true, value: context }
 * readPlanFile('{"hello":1}').ok; // false
 */
export function readPlanFile(text: string): PlanFileResult {
  if (text.length > MAX_PLAN_FILE_BYTES) return { ok: false, error: NOT_A_PLAN_FILE };
  const envelope = planEnvelopeSchema.safeParse(parseJsonSafe(text));
  if (!envelope.success) return { ok: false, error: NOT_A_PLAN_FILE };
  const parsed = eventContextSchema.safeParse(envelope.data.context);
  if (envelope.data.version !== PLAN_FILE_VERSION || !parsed.success) {
    return { ok: false, error: BROKEN_PLAN_FILE };
  }
  return { ok: true, value: parsed.data };
}
