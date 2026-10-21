/**
 * Browser downloads for files built from the plan (CSV for Sheets, .ics, the saved plan).
 *
 * Responsibility: turn text into a same-origin Blob link the browser saves, with a file name
 * made from the event title; the object URL is released right after the click. Boundary:
 * nothing leaves the device — no upload, no server copy (the CSP allows blob: downloads).
 */

export const MIME_TYPES = {
  csv: 'text/csv;charset=utf-8',
  ics: 'text/calendar;charset=utf-8',
  json: 'application/json;charset=utf-8',
} as const;

export type DownloadKind = keyof typeof MIME_TYPES;

/** File names stay short and portable: lower-case letters, digits and hyphens. */
const MAX_SLUG_CHARS = 40;
const FALLBACK_SLUG = 'intezaam-plan';

/**
 * A file-name-safe slug of the event title.
 * @example
 * fileSlug('Riya weds Arjun!'); // 'riya-weds-arjun'
 */
export function fileSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_CHARS)
    .replace(/-+$/, '');
  return slug === '' ? FALLBACK_SLUG : slug;
}

/**
 * Saves text as a file through a temporary link.
 * @example
 * downloadText('jaipur-wedding-budget.csv', csv, 'csv');
 */
export function downloadText(fileName: string, text: string, kind: DownloadKind): void {
  const url = URL.createObjectURL(new Blob([text], { type: MIME_TYPES[kind] }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
