/**
 * Responsibility: reading a picked file returns nothing when no file was picked, refuses a
 * file over the cap without reading it, reports an unreadable file instead of throwing,
 * returns the text otherwise, and clears the picker so the same file can be picked again.
 * Boundary: a real file input in jsdom; files are built in the test.
 */
import { describe, expect, it } from 'vitest';
import { readPickedText } from '../../lib/read-picked-text';

const CAP_BYTES = 16;
const TEXT = 'Name,Adults';

/** A file whose read fails, the way a moved or locked file does. */
class LockedFile extends File {
  override text(): Promise<string> {
    return Promise.reject(new Error('locked'));
  }
}

function pickerWith(files: readonly File[]): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'file';
  // jsdom has no way to pick files, so the list is set the way a browser would expose it.
  Object.defineProperty(input, 'files', { value: files });
  return input;
}

describe('readPickedText', () => {
  it('returns none when nothing was picked', async () => {
    await expect(readPickedText(pickerWith([]), CAP_BYTES)).resolves.toEqual({ kind: 'none' });
  });

  it('returns the text of a file within the cap', async () => {
    const picked = await readPickedText(pickerWith([new File([TEXT], 'guests.csv')]), CAP_BYTES);
    expect(picked).toEqual({ kind: 'text', text: TEXT });
  });

  it('refuses a file over the cap', async () => {
    const big = new File(['x'.repeat(CAP_BYTES + 1)], 'big.csv');
    await expect(readPickedText(pickerWith([big]), CAP_BYTES)).resolves.toEqual({
      kind: 'too-large',
    });
  });

  it('reports an unreadable file instead of throwing', async () => {
    const locked = new LockedFile([TEXT], 'locked.csv');
    await expect(readPickedText(pickerWith([locked]), CAP_BYTES)).resolves.toEqual({
      kind: 'unreadable',
    });
  });

  it('clears the picker so the same file can be picked again', async () => {
    const input = pickerWith([new File([TEXT], 'guests.csv')]);
    await readPickedText(input, CAP_BYTES);
    expect(input.value).toBe('');
  });
});
