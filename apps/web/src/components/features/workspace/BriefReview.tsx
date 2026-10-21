/**
 * "Check what we read": the brief reader's result, shown before anything fills the form.
 *
 * Responsibility: show the one-line understanding, each filled field as a chip, the
 * essentials still to answer, who read it (Gemini or the offline reader), and two choices
 * — add these to the form, or set them aside. Focus moves to the heading when a review
 * arrives, so keyboard and screen-reader users land on it. Boundary: the page decides what
 * confirming does; this component only asks.
 */
import { type ReactElement, useEffect, useRef } from 'react';
import type { BriefResponse } from '@intezaam/core/schemas';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { briefChips, missingPrompts } from './brief-fill';

export interface BriefReviewProps {
  readonly review: BriefResponse;
  readonly onConfirm: () => void;
  readonly onDismiss: () => void;
}

export const BRIEF_REVIEW_TITLE = 'Check what we read';
export const CONFIRM_BRIEF = 'Add these to the form';
export const DISMISS_BRIEF = 'Not right — set aside';

const HEADING_ID = 'brief-review-heading';

export function BriefReview({ review, onConfirm, onDismiss }: BriefReviewProps): ReactElement {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const chips = briefChips(review.draft, review.filled);
  const prompts = missingPrompts(review.missing);

  useEffect(() => {
    headingRef.current?.focus();
  }, [review]);

  return (
    <section className="brief-review card" aria-labelledby={HEADING_ID}>
      <h2 id={HEADING_ID} ref={headingRef} tabIndex={-1} className="brief-review__title">
        {BRIEF_REVIEW_TITLE}
      </h2>
      {review.understood === '' ? null : (
        <p className="brief-review__understood">{review.understood}</p>
      )}
      <ProvenanceBadge state="ready" provenance={review.provenance} />
      {chips.length === 0 ? null : (
        <ul className="plain-list brief-review__chips" role="list" aria-label="Details found">
          {chips.map((chip) => (
            <li key={chip.field} className="chip">
              <span className="brief-review__chip-label">{chip.label}:</span> {chip.value}
            </li>
          ))}
        </ul>
      )}
      {prompts.length === 0 ? null : (
        <>
          <p className="brief-review__still">Still to answer in the form:</p>
          <ul className="brief-review__missing">
            {prompts.map((prompt) => (
              <li key={prompt}>{prompt}</li>
            ))}
          </ul>
        </>
      )}
      <div className="brief-review__actions">
        {chips.length === 0 ? null : (
          <button type="button" className="button button--cta" onClick={onConfirm}>
            {CONFIRM_BRIEF}
          </button>
        )}
        <button type="button" className="button button--ghost" onClick={onDismiss}>
          {DISMISS_BRIEF}
        </button>
      </div>
    </section>
  );
}
