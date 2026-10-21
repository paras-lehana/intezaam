/**
 * Responsibility: browser downloads — portable file names from any event title, and a
 * download that saves exactly the text given, under that name, and releases its object
 * URL. Boundary: the Blob URL and link click are captured, never really navigated.
 */
import { describe, expect, it } from 'vitest';
import { MIME_TYPES, downloadText, fileSlug } from '../../../components/features/share/download';
import { TEST_OBJECT_URL, captureDownloads } from '../panel-fixtures';

/** The slug cap in download.ts: file names stay short and portable. */
const MAX_SLUG_CHARS = 40;

describe('fileSlug', () => {
  it('keeps lower-case letters, digits and single hyphens', () => {
    expect(fileSlug('Riya weds Arjun!')).toBe('riya-weds-arjun');
    expect(fileSlug("Appa's 60th (Shashtiabdapurti)")).toBe('appa-s-60th-shashtiabdapurti');
  });

  it('falls back to a generic name when nothing portable is left', () => {
    expect(fileSlug('गणेश उत्सव')).toBe('intezaam-plan');
    expect(fileSlug('')).toBe('intezaam-plan');
  });

  it('caps long titles without a trailing hyphen', () => {
    const slug = fileSlug('A very long celebration title that keeps going and going on');
    expect(slug.length).toBeLessThanOrEqual(MAX_SLUG_CHARS);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('downloadText', () => {
  it('saves the text under the name and releases the object URL', async () => {
    const capture = captureDownloads();
    downloadText('plan.csv', 'Item,Amount\r\n', 'csv');
    expect(capture.files).toHaveLength(1);
    expect(capture.files[0]?.fileName).toBe('plan.csv');
    expect(await capture.files[0]?.text()).toBe('Item,Amount\r\n');
    expect(capture.revoked).toEqual([TEST_OBJECT_URL]);
    expect(document.querySelector('a[download]')).toBeNull();
    expect(MIME_TYPES.csv.startsWith('text/csv')).toBe(true);
  });
});
