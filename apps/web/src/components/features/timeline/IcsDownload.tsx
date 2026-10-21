/**
 * "Download the calendar (.ics)" — every dated task and function for any calendar app.
 *
 * Responsibility: one button that saves the timeline as an iCalendar file (Google
 * Calendar, Apple, Outlook all import it) and says, politely, which file was saved.
 * Boundary: the file is built in the browser (ics-file.ts); undated plans have no events,
 * so the button explains instead of saving an empty calendar.
 */
import { type ReactElement, useState } from 'react';
import type { Plan } from '@intezaam/core/schemas';
import { LiveRegion } from '../../ui/LiveRegion';
import { downloadIcs } from './ics-file';

export interface IcsDownloadProps {
  readonly plan: Plan;
}

export const ICS_BUTTON = 'Download the calendar (.ics)';

export function IcsDownload({ plan }: IcsDownloadProps): ReactElement {
  const [status, setStatus] = useState('');
  if (plan.timeline.mode !== 'dated') {
    return <p className="muted">Pick a date to get a calendar file of every task.</p>;
  }
  return (
    <div className="ics-download">
      <button
        type="button"
        className="button button--secondary"
        onClick={() => setStatus(`Saved ${downloadIcs(plan)} — open it to add the dates.`)}
      >
        {ICS_BUTTON}
      </button>
      <LiveRegion message={status} visible className="ics-download__status" />
    </div>
  );
}
