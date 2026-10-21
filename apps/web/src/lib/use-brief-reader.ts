/**
 * The "Read my brief" flow: send the text, show what was understood, fill only on confirm.
 *
 * Responsibility: call the brief reader, hold its reply for review (filled chips and the
 * questions still open), and hand the confirmed fields to the form. Nothing reaches the
 * form until the reader confirms — the AI reads, the person decides. A newer read, a
 * confirm or a dismiss makes any late reply stale, so it can never reopen the review.
 * Boundary: no markup; BriefReview renders the review, and the page maps the confirmed draft
 * onto the form (workspace/brief-fill.ts).
 */
import { useRef, useState } from 'react';
import type { BriefDraft, BriefResponse } from '@intezaam/core/schemas';
import { readBrief } from './api';

export interface BriefReaderApi {
  readonly busy: boolean;
  /** One line for the brief box's status region. */
  readonly status: string;
  readonly review: BriefResponse | undefined;
  readonly read: (text: string) => void;
  /** The confirmed draft for the form, or undefined when there is nothing to confirm. */
  readonly confirm: () => BriefDraft | undefined;
  readonly dismiss: () => void;
  /**
   * The last confirmed brief was Hindi in Latin script (set by core's reader, never by the
   * model): English drafts are then asked for in Hinglish.
   */
  readonly hinglish: boolean;
}

interface ReaderState {
  readonly busy: boolean;
  readonly status: string;
  readonly review?: BriefResponse | undefined;
  readonly hinglish: boolean;
}

export const BRIEF_DISMISSED = 'Set aside — nothing in the form was changed.';

/**
 * The status line after a read.
 * @example
 * readStatus(3); // 'Found 3 details. Check them above the form, then add them.'
 */
export function readStatus(filledCount: number): string {
  return filledCount === 0
    ? 'No details could be read from that. Try naming the city, guests or budget.'
    : `Found ${filledCount} ${filledCount === 1 ? 'detail' : 'details'}. Check them above the form, then add them.`;
}

/**
 * The status line after the reader confirms.
 * @example
 * confirmStatus(3); // 'Added 3 details to the form. Fill in anything still missing.'
 */
export function confirmStatus(filledCount: number): string {
  return `Added ${filledCount} ${filledCount === 1 ? 'detail' : 'details'} to the form. Fill in anything still missing.`;
}

/**
 * State and actions for reading a brief.
 * @example
 * const brief = useBriefReader('2026-10-20');
 * brief.read('Shaadi in Jaipur, 300 log, 25 lakh');
 */
export function useBriefReader(todayIso: string): BriefReaderApi {
  const [state, setState] = useState<ReaderState>({ busy: false, status: '', hinglish: false });
  const latest = useRef(0);

  function read(text: string): void {
    latest.current += 1;
    const request = latest.current;
    setState((previous) => ({ busy: true, status: '', hinglish: previous.hinglish }));
    void readBrief({ text, todayIso }).then((result) => {
      if (request !== latest.current) return;
      setState((previous) => ({
        busy: false,
        hinglish: previous.hinglish,
        ...(result.ok
          ? { status: readStatus(result.value.filled.length), review: result.value }
          : { status: result.error.message }),
      }));
    });
  }

  function confirm(): BriefDraft | undefined {
    const review = state.review;
    if (review === undefined) return undefined;
    latest.current += 1;
    setState({
      busy: false,
      status: confirmStatus(review.filled.length),
      hinglish: review.draft.hinglish === true,
    });
    return review.draft;
  }

  function dismiss(): void {
    latest.current += 1;
    setState((previous) => ({ busy: false, status: BRIEF_DISMISSED, hinglish: previous.hinglish }));
  }

  return {
    busy: state.busy,
    status: state.status,
    review: state.review,
    read,
    confirm,
    dismiss,
    hinglish: state.hinglish,
  };
}
