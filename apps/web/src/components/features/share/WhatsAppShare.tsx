/**
 * WhatsApp summary: the plan as a message a family can forward to the group.
 *
 * Responsibility: show core's share text (title, date, guests, budget and verdict, days to
 * go, the three most urgent tasks, "estimates") with a copy button and a wa.me link that
 * opens WhatsApp with it pre-filled. Boundary: nothing is sent until the reader picks a chat
 * in WhatsApp; the text is built from the plan alone.
 */
import type { ReactElement } from 'react';
import { buildShareText } from '@intezaam/core/export';
import { buildWhatsAppUrl } from '@intezaam/core/integrations';
import type { Plan } from '@intezaam/core/schemas';
import { CopyButton } from '../../ui/CopyButton';
import { PanelSection } from '../common/PanelSection';
import { SCROLL_REGION_TAB_INDEX } from '../common/TableScroll';

export interface WhatsAppShareProps {
  readonly plan: Plan;
}

export function WhatsAppShare({ plan }: WhatsAppShareProps): ReactElement {
  const text = buildShareText(plan, plan.title);
  return (
    <PanelSection
      id="share-whatsapp"
      title="WhatsApp summary"
      lede="A short summary for the family group. You choose the chat in WhatsApp."
    >
      {/* The preview scrolls past 18 rem, so it is a named region keyboard users can scroll. */}
      <pre
        className="share-text text-block"
        role="region"
        aria-label="Summary text"
        tabIndex={SCROLL_REGION_TAB_INDEX}
      >
        {text}
      </pre>
      <div className="share-actions">
        <a
          className="button button--cta"
          href={buildWhatsAppUrl(text)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Share on WhatsApp <span className="visually-hidden">(opens in a new tab)</span>
        </a>
        <CopyButton text={text} label="Copy the summary" copiedMessage="Summary copied." />
      </div>
    </PanelSection>
  );
}
