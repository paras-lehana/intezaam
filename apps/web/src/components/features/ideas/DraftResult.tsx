/**
 * A drafted message, ready to send: the text, copy, WhatsApp and Gmail, and who wrote it.
 *
 * Responsibility: show the subject and body with `lang` set for screen readers and fonts —
 * the chosen language when Gemini wrote it, or what the offline templates write (Hindi or
 * English) — a copy button, a wa.me link and a Gmail compose link — both rebuilt
 * here with core's link builders, never taken from the response — and the provenance badge.
 * Boundary: nothing is sent until the reader presses Send in WhatsApp or Gmail.
 */
import type { ReactElement } from 'react';
import type { LanguageCode } from '@intezaam/core/domain';
import { buildGmailComposeUrl, buildWhatsAppUrl } from '@intezaam/core/integrations';
import type { DraftResponse } from '@intezaam/core/schemas';
import { CopyButton } from '../../ui/CopyButton';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { writtenLang } from '../common/written-language';

export interface DraftResultProps {
  readonly draft: DraftResponse;
  /** The language the draft was asked for. */
  readonly language: LanguageCode;
  /** The Gmail subject when the draft has none (e.g. "Invitation"). */
  readonly fallbackSubject: string;
}

export function DraftResult({ draft, language, fallbackSubject }: DraftResultProps): ReactElement {
  const subject = draft.subject ?? fallbackSubject;
  const lang = writtenLang(draft.provenance, language, 'draft');
  return (
    <div className="draft">
      {draft.subject === undefined ? null : (
        <p>
          <strong>Subject:</strong> <span lang={lang}>{draft.subject}</span>
        </p>
      )}
      <pre className="draft__body text-block" lang={lang}>
        {draft.body}
      </pre>
      <div className="draft__actions">
        <CopyButton text={draft.body} label="Copy the message" copiedMessage="Message copied." />
        <a
          className="button button--secondary"
          href={buildWhatsAppUrl(draft.body)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Send on WhatsApp <span className="visually-hidden">(opens in a new tab)</span>
        </a>
        <a
          className="button button--secondary"
          href={buildGmailComposeUrl({ subject, body: draft.body })}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in Gmail <span className="visually-hidden">(opens in a new tab)</span>
        </a>
      </div>
      <ProvenanceBadge state="ready" provenance={draft.provenance} />
    </div>
  );
}
