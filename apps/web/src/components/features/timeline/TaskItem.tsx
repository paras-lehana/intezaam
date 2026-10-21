/**
 * One checklist task: a real checkbox labelled by the task, its status, due date and why.
 *
 * Responsibility: the row of the back-scheduled checklist — tick it done (kept on this
 * device), see whether it is "Do now", urgent or upcoming in words and a shape, read why it
 * matters, add it to Google Calendar, and open "Why this?". Boundary: display only; the
 * panel owns which tasks are done.
 */
import type { ReactElement } from 'react';
import type { Plan, PlanTask } from '@intezaam/core/schemas';
import { formatIsoDate } from '../common/dates';
import { TraceDisclosure } from '../common/TraceDisclosure';
import { TASK_STATUS_STYLES } from './timeline-words';

export interface TaskItemProps {
  readonly plan: Plan;
  readonly task: PlanTask;
  readonly done: boolean;
  readonly onToggle: (taskId: string, done: boolean) => void;
}

export function TaskItem({ plan, task, done, onToggle }: TaskItemProps): ReactElement {
  const status = TASK_STATUS_STYLES[task.status];
  const inputId = `task-${task.id}`;
  return (
    <li className={`task task--${task.status}`} data-done={done}>
      <div className="task__head">
        <input
          id={inputId}
          type="checkbox"
          className="task__check"
          checked={done}
          onChange={(event) => onToggle(task.id, event.target.checked)}
        />
        <label htmlFor={inputId} className="task__title">
          {task.title}
        </label>
      </div>
      <p className="task__meta">
        <span className={`task__status task__status--${task.status}`}>
          <span aria-hidden="true">{status.glyph}</span> {status.label}
        </span>
        {task.dueIso === undefined ? null : <span> · due {formatIsoDate(task.dueIso)}</span>}
      </p>
      <p className="task__why">{task.why}</p>
      <div className="task__actions">
        {task.calendarUrl === undefined ? null : (
          <a href={task.calendarUrl} target="_blank" rel="noopener noreferrer">
            Add to Google Calendar
            <span className="visually-hidden">: {task.title} (opens in a new tab)</span>
          </a>
        )}
        <TraceDisclosure plan={plan} traceIds={task.traceIds} subject={task.title} />
      </div>
    </li>
  );
}
