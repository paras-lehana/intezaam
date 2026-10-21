/**
 * Reads the text of a file the family picked, in the browser.
 *
 * Responsibility: take the one picked file, clear the picker so the same file can be picked
 * again once fixed, refuse a file over the caller's size cap before reading it, and read its
 * text without throwing. Shared by the guest import and the plan restore. Boundary: no
 * parsing — callers validate the text; the file never leaves the device.
 */

/** What came of a pick: nothing picked, a refusal, or the file's text. */
export type PickedText =
  | { readonly kind: 'none' }
  | { readonly kind: 'too-large' }
  | { readonly kind: 'unreadable' }
  | { readonly kind: 'text'; readonly text: string };

/** The two ways a picked file is refused; callers map each to their own message. */
export type PickRefusal = Exclude<PickedText['kind'], 'none' | 'text'>;

/**
 * Reads the picked file's text, or says why it was not read.
 * @example
 * const picked = await readPickedText(event.currentTarget, MAX_IMPORT_BYTES);
 * if (picked.kind === 'text') importGuests(picked.text, batch);
 */
export async function readPickedText(
  input: HTMLInputElement,
  maxBytes: number,
): Promise<PickedText> {
  const file = input.files?.[0];
  if (file === undefined) return { kind: 'none' };
  input.value = '';
  // Efficiency: the size cap is checked before reading, so an oversized file is never loaded.
  if (file.size > maxBytes) return { kind: 'too-large' };
  try {
    return { kind: 'text', text: await file.text() };
  } catch {
    // A moved, locked or permission-revoked file cannot be read.
    return { kind: 'unreadable' };
  }
}
