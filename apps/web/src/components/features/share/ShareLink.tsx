/**
 * Share link: a URL that opens this exact plan on any device.
 *
 * Responsibility: show and copy a link whose `#plan=` fragment carries the whole event
 * context (core's versioned base64url codec); whoever opens it gets the same plan computed
 * in their own browser. Boundary: no server storage — a fragment is never sent to a server;
 * the link holds the plan's inputs, so share it only with people who should see them.
 */
import type { ReactElement } from 'react';
import type { EventContext } from '@intezaam/core/schemas';
import { CopyButton } from '../../ui/CopyButton';
import { PanelSection } from '../common/PanelSection';
import { shareLink } from './share-files';

export interface ShareLinkProps {
  readonly context: EventContext;
}

export function ShareLink({ context }: ShareLinkProps): ReactElement {
  const link = shareLink(context, window.location.href);
  return (
    <PanelSection
      id="share-link"
      title="Share link"
      lede="Anyone with the link sees this plan. It is not stored on our server — the plan lives in the link."
    >
      <div className="field">
        <label htmlFor="share-link-url">Link to this plan</label>
        <input
          id="share-link-url"
          type="text"
          readOnly
          value={link}
          onFocus={(event) => event.currentTarget.select()}
        />
      </div>
      <CopyButton text={link} label="Copy the link" copiedMessage="Link copied." />
    </PanelSection>
  );
}
