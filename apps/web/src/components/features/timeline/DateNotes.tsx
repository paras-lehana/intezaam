/**
 * Date intelligence: peak season, indicative muhurat, Chaturmas and Kharmas, festival
 * clashes, rain and ceremony hours.
 *
 * Responsibility: each note the engine raised for the date (DATE-01…05, CTX-04/07) with
 * its kind in words, its sources (publisher and year) and "Why this?". Muhurat notes are
 * always indicative and send the family to their priest — the wording comes from the
 * engine. Boundary: display only.
 */
import type { ReactElement } from 'react';
import type { Plan } from '@intezaam/core/schemas';
import { PanelSection } from '../common/PanelSection';
import { SourceLinks } from '../common/SourceLinks';
import { TraceDisclosure } from '../common/TraceDisclosure';
import { sourcesFor } from '../common/trace-lookup';
import { DATE_NOTE_LABELS } from './timeline-words';

export interface DateNotesProps {
  readonly plan: Plan;
}

export function DateNotes({ plan }: DateNotesProps): ReactElement | null {
  const notes = plan.timeline.dateNotes;
  if (notes.length === 0) return null;
  return (
    <PanelSection id="timeline-dates" title="About your date">
      <ul className="plain-list date-notes" role="list">
        {notes.map((note, index) => (
          <li key={`${note.kind}-${index}`} className={`date-note date-note--${note.kind}`}>
            <p className="date-note__kind">{DATE_NOTE_LABELS[note.kind]}</p>
            <p>{note.text}</p>
            <SourceLinks sources={sourcesFor(plan, note.sourceIds)} />
            <TraceDisclosure
              plan={plan}
              traceIds={note.traceIds}
              subject={DATE_NOTE_LABELS[note.kind]}
            />
          </li>
        ))}
      </ul>
    </PanelSection>
  );
}
