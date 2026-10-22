/**
 * Responsibility: what the Share tab hands out — CSV and calendar files are core's own
 * `planToCsv` / `buildIcs` output, the share link round-trips the context through core's
 * codec, and a saved plan file reads back only when every field validates. Boundary: pure;
 * downloads and navigation are tested with the panel.
 */
import { describe, expect, it } from 'vitest';
import { CSV_TABLES, buildIcs, decodeContextFromUrl, planToCsv } from '@intezaam/core/export';
import { eventContextSchema } from '@intezaam/core/schemas';
import { fileSlug } from '../../../components/features/share/download';
import {
  BROKEN_PLAN_FILE,
  MAX_PLAN_FILE_BYTES,
  NOT_A_PLAN_FILE,
  csvExport,
  icsExport,
  planFile,
  readPlanFile,
  shareLink,
} from '../../../components/features/share/share-files';
import { PLAN_FRAGMENT_PREFIX } from '../../../lib/plan-state';
import { samplePanel } from '../panel-fixtures';

const PAGE_URL = 'https://intezaam.lehana.in/plan';

describe('csvExport and icsExport', () => {
  it('hand out core’s own CSV tables and calendar, named after the event', () => {
    const { plan } = samplePanel('jaipur-wedding');
    for (const table of CSV_TABLES) {
      expect(csvExport(plan, table)).toEqual({
        fileName: `${fileSlug(plan.title)}-${table}.csv`,
        text: planToCsv(plan, table),
        kind: 'csv',
      });
    }
    const ics = icsExport(plan);
    expect(ics.text).toBe(buildIcs(plan, plan.title));
    expect(ics.text.startsWith('BEGIN:VCALENDAR')).toBe(true);
  });
});

describe('shareLink', () => {
  it('carries the whole context in the fragment and drops any old fragment and query', () => {
    const { context } = samplePanel('society-ganesh');
    const link = shareLink(context, `${PAGE_URL}?utm_source=whatsapp&fbclid=abc#people`);
    const [base, fragment = ''] = link.split('#');
    expect(base).toBe(PAGE_URL);
    expect(fragment.startsWith(PLAN_FRAGMENT_PREFIX)).toBe(true);
    const decoded = decodeContextFromUrl(fragment.slice(PLAN_FRAGMENT_PREFIX.length));
    expect(decoded).toEqual({ ok: true, value: eventContextSchema.parse(context) });
  });
});

describe('planFile and readPlanFile', () => {
  it('round-trip a saved plan', () => {
    const { context, plan } = samplePanel('bengaluru-birthday');
    const saved = planFile(context, plan.title);
    expect(saved.fileName).toBe(`${fileSlug(plan.title)}-plan.json`);
    expect(readPlanFile(saved.text)).toEqual({
      ok: true,
      value: eventContextSchema.parse(context),
    });
  });

  it('refuses files that are not saved plans', () => {
    expect(readPlanFile('not json')).toEqual({ ok: false, error: NOT_A_PLAN_FILE });
    expect(readPlanFile('{"app":"other","version":1,"context":{}}')).toEqual({
      ok: false,
      error: NOT_A_PLAN_FILE,
    });
    expect(readPlanFile('x'.repeat(MAX_PLAN_FILE_BYTES + 1))).toEqual({
      ok: false,
      error: NOT_A_PLAN_FILE,
    });
  });

  it('refuses a damaged plan or one from another version', () => {
    const { context, plan } = samplePanel('bengaluru-birthday');
    const body: unknown = JSON.parse(planFile(context, plan.title).text);
    const damaged = JSON.stringify({ ...Object(body), context: { ...context, guests: 0 } });
    const newer = JSON.stringify({ ...Object(body), version: 2 });
    expect(readPlanFile(damaged)).toEqual({ ok: false, error: BROKEN_PLAN_FILE });
    expect(readPlanFile(newer)).toEqual({ ok: false, error: BROKEN_PLAN_FILE });
  });
});
