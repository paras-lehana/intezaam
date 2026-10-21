/**
 * The Share tab (feature #39): WhatsApp, Google Sheets, calendar, print, a share link, and
 * save and restore.
 *
 * Responsibility: compose the ways a plan leaves the browser, most-used first. Boundary:
 * everything is built in the browser from the plan and its context — no plan is stored on a
 * server, and guest lists are never part of what is shared.
 */
import type { ReactElement } from 'react';
import { PanelHeader } from '../common/PanelHeader';
import type { PanelProps } from '../panel-props';
import { ExportFiles } from './ExportFiles';
import { SaveRestore } from './SaveRestore';
import { ShareLink } from './ShareLink';
import { WhatsAppShare } from './WhatsAppShare';
import './share.css';

export function SharePanel({ plan, context }: PanelProps): ReactElement {
  return (
    <div className="share">
      <PanelHeader title="Share">
        Send the plan to the family, open it in Google Sheets or Calendar, print it, or keep a copy
        — all made in your browser.
      </PanelHeader>
      <WhatsAppShare plan={plan} />
      <ExportFiles plan={plan} />
      <ShareLink context={context} />
      <SaveRestore context={context} title={plan.title} />
    </div>
  );
}
