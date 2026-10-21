/**
 * "Draft an enquiry": a ready-to-send message to a vendor, in the plan's language.
 *
 * Responsibility: ask the drafts route for a vendor enquiry (Gemini, or the offline
 * templates), then offer it three ways — open in Gmail, send on WhatsApp, or copy — with
 * the provenance badge; the subject and body carry `lang` for the language they are written
 * in. The button is never disabled while busy (aria-disabled plus a guard), so focus is
 * never lost. Boundary: the message uses plan facts only; the server
 * checks every number and date in it.
 */
import { type ReactElement, useState } from 'react';
import type { VendorType } from '@intezaam/core/domain';
import type { DraftRequest, DraftResponse, EventContext } from '@intezaam/core/schemas';
import { fetchDraft } from '../../../lib/api';
import { CopyButton } from '../../ui/CopyButton';
import { LiveRegion } from '../../ui/LiveRegion';
import { hinglishPart } from '../common/draft-register';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { writtenLang } from '../common/written-language';

export interface EnquiryDraftProps {
  readonly context: EventContext;
  readonly todayIso: string;
  readonly vendorType: VendorType;
  readonly vendorLabel: string;
  /** The brief was Hinglish: an English enquiry is drafted in Hinglish too. */
  readonly hinglish?: boolean | undefined;
}

type DraftState =
  | { readonly status: 'idle' | 'loading' }
  | { readonly status: 'ready'; readonly draft: DraftResponse }
  | { readonly status: 'error'; readonly message: string };

export const DRAFT_BUTTON = 'Draft an enquiry';

/**
 * The text a copy puts on the clipboard: subject line first when there is one.
 * @example
 * draftText({ subject: 'Wedding catering', body: 'Namaste…' }); // 'Wedding catering\n\nNamaste…'
 */
export function draftText(draft: Pick<DraftResponse, 'subject' | 'body'>): string {
  return draft.subject === undefined ? draft.body : `${draft.subject}\n\n${draft.body}`;
}

export function EnquiryDraft({
  context,
  todayIso,
  vendorType,
  vendorLabel,
  hinglish,
}: EnquiryDraftProps): ReactElement {
  const [state, setState] = useState<DraftState>({ status: 'idle' });
  const draftLang =
    state.status === 'ready'
      ? writtenLang(state.draft.provenance, context.language, 'draft')
      : undefined;

  function draft(): void {
    if (state.status === 'loading') return;
    setState({ status: 'loading' });
    const request: DraftRequest = {
      context,
      todayIso,
      kind: 'vendor-enquiry',
      language: context.language,
      tone: 'warm',
      vendorType,
      ...hinglishPart(context.language, hinglish),
    };
    void fetchDraft(request).then((result) =>
      setState(
        result.ok
          ? { status: 'ready', draft: result.value }
          : { status: 'error', message: result.error.message },
      ),
    );
  }

  return (
    <div className="enquiry">
      <button
        type="button"
        className="button button--secondary"
        aria-disabled={state.status === 'loading'}
        onClick={draft}
      >
        {state.status === 'loading' ? 'Drafting…' : DRAFT_BUTTON}{' '}
        <span className="visually-hidden">to the {vendorLabel}</span>
      </button>
      <LiveRegion
        message={state.status === 'ready' ? `Enquiry to the ${vendorLabel} drafted.` : ''}
      />
      {state.status === 'error' ? (
        <p className="notice notice--error" role="alert">
          {state.message}
        </p>
      ) : null}
      {state.status === 'ready' ? (
        <div className="enquiry__draft">
          <ProvenanceBadge state="ready" provenance={state.draft.provenance} />
          {state.draft.subject === undefined ? null : (
            <p>
              <strong>Subject:</strong> <span lang={draftLang}>{state.draft.subject}</span>
            </p>
          )}
          <p className="enquiry__body" lang={draftLang}>
            {state.draft.body}
          </p>
          <div className="enquiry__actions">
            {state.draft.gmailUrl === undefined ? null : (
              <a
                className="button button--ghost"
                href={state.draft.gmailUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Gmail <span className="visually-hidden">(opens in a new tab)</span>
              </a>
            )}
            <a
              className="button button--ghost"
              href={state.draft.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Send on WhatsApp <span className="visually-hidden">(opens in a new tab)</span>
            </a>
            <CopyButton
              text={draftText(state.draft)}
              label="Copy message"
              copiedMessage="Message copied."
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
