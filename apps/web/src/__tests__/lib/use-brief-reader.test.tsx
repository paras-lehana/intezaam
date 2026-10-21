/**
 * Responsibility: useBriefReader — a read is busy until the reply, then held for review with
 * a status naming how many details were found; confirm hands over the draft once; dismiss
 * changes nothing; a failed read shows the server's message; a late reply after a newer
 * action can never reopen the review; the confirmed brief's Hinglish flag (set by core) is
 * kept for drafts until another brief is confirmed. Boundary: fetch is stubbed with replies from core's
 * offline reader and evidence guard.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NETWORK_ERROR_MESSAGE } from '../../lib/api';
import {
  BRIEF_DISMISSED,
  confirmStatus,
  readStatus,
  useBriefReader,
} from '../../lib/use-brief-reader';
import { briefResponseFor } from '../features/plan-fixtures';
import { TEST_TODAY_ISO, jsonResponse, stubFetch } from '../helpers';

const BRIEF = 'Shaadi in Jaipur, 300 log, 25 lakh';
const reply = briefResponseFor(BRIEF);
/** The same wedding typed in English: core does not mark it Hinglish. */
const ENGLISH_BRIEF = 'Wedding in Jaipur for 300 guests, budget 25 lakh';

describe('useBriefReader', () => {
  it('holds the read for review, then hands over the draft on confirm', async () => {
    stubFetch(jsonResponse(reply));
    const { result } = renderHook(() => useBriefReader(TEST_TODAY_ISO));
    act(() => result.current.read(BRIEF));
    expect(result.current.busy).toBe(true);
    await waitFor(() => expect(result.current.review).toEqual(reply));
    expect(result.current.status).toBe(readStatus(reply.filled.length));
    let draft: unknown;
    act(() => {
      draft = result.current.confirm();
    });
    expect(draft).toEqual(reply.draft);
    expect(result.current.review).toBeUndefined();
    expect(result.current.status).toBe(confirmStatus(reply.filled.length));
  });

  it('sets a read aside without filling anything', async () => {
    stubFetch(jsonResponse(reply));
    const { result } = renderHook(() => useBriefReader(TEST_TODAY_ISO));
    act(() => result.current.read(BRIEF));
    await waitFor(() => expect(result.current.review).toBeDefined());
    act(() => result.current.dismiss());
    expect(result.current.review).toBeUndefined();
    expect(result.current.status).toBe(BRIEF_DISMISSED);
    let draft: unknown = 'unset';
    act(() => {
      draft = result.current.confirm();
    });
    expect(draft).toBeUndefined();
  });

  it('shows why a read failed', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline')));
    const { result } = renderHook(() => useBriefReader(TEST_TODAY_ISO));
    act(() => result.current.read(BRIEF));
    await waitFor(() => expect(result.current.status).toBe(NETWORK_ERROR_MESSAGE));
    expect(result.current.busy).toBe(false);
    expect(result.current.review).toBeUndefined();
  });

  it('ignores a reply that arrives after the read was set aside', async () => {
    let release: (response: Response) => void = () => undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(
        () =>
          new Promise<Response>((resolve) => {
            release = resolve;
          }),
      ),
    );
    const { result } = renderHook(() => useBriefReader(TEST_TODAY_ISO));
    act(() => result.current.read(BRIEF));
    act(() => result.current.dismiss());
    await act(async () => {
      release(jsonResponse(reply));
      await Promise.resolve();
    });
    expect(result.current.review).toBeUndefined();
    expect(result.current.status).toBe(BRIEF_DISMISSED);
  });

  it('keeps the confirmed brief’s Hinglish flag for drafts, until another brief is confirmed', async () => {
    const english = briefResponseFor(ENGLISH_BRIEF);
    expect(reply.draft.hinglish).toBe(true);
    expect(english.draft.hinglish).toBeUndefined();
    stubFetch(jsonResponse(reply), jsonResponse(english), jsonResponse(english));
    const { result } = renderHook(() => useBriefReader(TEST_TODAY_ISO));
    expect(result.current.hinglish).toBe(false);
    act(() => result.current.read(BRIEF));
    await waitFor(() => expect(result.current.review).toBeDefined());
    expect(result.current.hinglish).toBe(false);
    act(() => {
      result.current.confirm();
    });
    expect(result.current.hinglish).toBe(true);
    act(() => result.current.read(ENGLISH_BRIEF));
    await waitFor(() => expect(result.current.review).toEqual(english));
    act(() => result.current.dismiss());
    expect(result.current.hinglish).toBe(true);
    act(() => result.current.read(ENGLISH_BRIEF));
    await waitFor(() => expect(result.current.review).toBeDefined());
    act(() => {
      result.current.confirm();
    });
    expect(result.current.hinglish).toBe(false);
  });

  it('counts details in words', () => {
    expect(readStatus(0)).toMatch(/^No details/);
    expect(readStatus(1)).toBe('Found 1 detail. Check them above the form, then add them.');
    expect(confirmStatus(2)).toBe('Added 2 details to the form. Fill in anything still missing.');
  });
});
