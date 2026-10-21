/**
 * Timeline: the date, the checklist counted back from it, the functions and the run sheet.
 *
 * Responsibility: compose the timeline tab — a one-line summary of the time situation
 * (days to go, compressed, undated or past), date intelligence, the .ics download, the
 * phased checklist with Google Calendar links, the function cards and the day-of run
 * sheet. Boundary: loaded lazily the first time the tab opens.
 */
import type { ReactElement } from 'react';
import type { Plan } from '@intezaam/core/schemas';
import { PanelHeader } from '../common/PanelHeader';
import type { PanelProps } from '../panel-props';
import { DateNotes } from './DateNotes';
import { FunctionCards } from './FunctionCards';
import { IcsDownload } from './IcsDownload';
import { PhaseTasks } from './PhaseTasks';
import { RunSheetView } from './RunSheetView';
import './timeline.css';

const COUNT = new Intl.NumberFormat('en-IN');

/**
 * The time situation in one sentence.
 * @example
 * timelineSummary(plan); // '120 days to go. 3 tasks to do now.'
 */
export function timelineSummary(plan: Plan): string {
  const { mode, daysToEvent, compressed, tasks } = plan.timeline;
  if (mode === 'undated') return 'No date yet: the checklist starts with choosing one.';
  if (mode === 'past') return 'The date has passed: the wrap-up tasks are below.';
  const doNow = tasks.filter((task) => task.status === 'do-now' || task.status === 'urgent');
  const days = daysToEvent === null ? '' : `${COUNT.format(daysToEvent)} days to go. `;
  const squeeze = compressed ? 'Time is short, so late tasks are packed into the days left. ' : '';
  return `${days}${squeeze}${doNow.length} ${doNow.length === 1 ? 'task' : 'tasks'} to do now.`;
}

export function TimelinePanel({ plan }: PanelProps): ReactElement {
  return (
    <div className="panel timeline">
      <PanelHeader title="Timeline">{timelineSummary(plan)}</PanelHeader>
      <DateNotes plan={plan} />
      <IcsDownload plan={plan} />
      <PhaseTasks plan={plan} />
      <FunctionCards plan={plan} />
      <RunSheetView plan={plan} />
    </div>
  );
}
