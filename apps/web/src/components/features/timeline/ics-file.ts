/**
 * The whole timeline as an .ics file, saved through a temporary object URL.
 *
 * Responsibility: build the calendar with core's RFC 5545 writer, wrap it in a Blob, hand
 * it to the browser as a download with a readable file name, and revoke the object URL
 * once the click has been handled so the Blob can be freed. Boundary: browser-only; no
 * network — the file never leaves the device unless the reader shares it.
 */
import { buildIcs } from '@intezaam/core/export';
import type { Plan } from '@intezaam/core/schemas';

export const ICS_MIME = 'text/calendar;charset=utf-8';

/** Long enough for every browser to start the download before the URL is revoked. */
export const REVOKE_DELAY_MS = 1000;

const NOT_SLUG = /[^a-z0-9]+/g;
const EDGE_DASHES = /^-+|-+$/g;
const FALLBACK_NAME = 'intezaam-plan';

/**
 * A safe file name from the plan title.
 * @example
 * icsFileName('Jaipur wedding'); // 'jaipur-wedding.ics'
 */
export function icsFileName(title: string): string {
  const slug = title.toLowerCase().replace(NOT_SLUG, '-').replace(EDGE_DASHES, '');
  return `${slug === '' ? FALLBACK_NAME : slug}.ics`;
}

/**
 * The plan's calendar as a Blob.
 * @example
 * icsBlob(plan).type; // 'text/calendar;charset=utf-8'
 */
export function icsBlob(plan: Plan): Blob {
  return new Blob([buildIcs(plan, plan.title)], { type: ICS_MIME });
}

/**
 * Offers the .ics download and returns the file name used.
 * @example
 * downloadIcs(plan); // 'jaipur-wedding.ics'
 */
export function downloadIcs(plan: Plan): string {
  const fileName = icsFileName(plan.title);
  const url = URL.createObjectURL(icsBlob(plan));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
  return fileName;
}
