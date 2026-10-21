/**
 * The back-scheduled checklist, grouped by the eight planning phases.
 *
 * Responsibility: each phase as an h4 with the family's typical window ("12 to 9 months
 * before"), its tasks as a list of TaskItems, and the done ticks kept on this device so a
 * re-plan never undoes them (TL-06). Boundary: the engine schedules and orders the tasks;
 * this only groups and ticks them.
 */
import { type ReactElement, useState } from 'react';
import { PHASE_LABELS } from '@intezaam/core/domain';
import type { Plan } from '@intezaam/core/schemas';
import { PanelSection } from '../common/PanelSection';
import { TaskItem } from './TaskItem';
import { groupByPhase, readDoneTasks, storeDoneTasks } from './timeline-words';

export interface PhaseTasksProps {
  readonly plan: Plan;
}

export function PhaseTasks({ plan }: PhaseTasksProps): ReactElement {
  const [done, setDone] = useState<ReadonlySet<string>>(readDoneTasks);
  const family = plan.contextEcho.family;
  const groups = groupByPhase(plan.timeline.tasks);
  const doneCount = plan.timeline.tasks.filter((task) => done.has(task.id)).length;

  function toggle(taskId: string, isDone: boolean): void {
    const next = new Set(done);
    if (isDone) next.add(taskId);
    else next.delete(taskId);
    setDone(next);
    storeDoneTasks(next);
  }

  return (
    <PanelSection
      id="timeline-tasks"
      title="Checklist"
      lede={`${doneCount} of ${plan.timeline.tasks.length} done. Ticks stay on this device.`}
    >
      {groups.map((group) => (
        <div key={group.phase} className="phase">
          <h4 className="phase__title">
            {PHASE_LABELS[group.phase].label}
            <span className="phase__window">
              {' '}
              · {PHASE_LABELS[group.phase].windowByFamily[family]}
            </span>
          </h4>
          <ul className="plain-list phase__tasks" role="list">
            {group.tasks.map((task) => (
              <TaskItem
                key={task.id}
                plan={plan}
                task={task}
                done={done.has(task.id)}
                onToggle={toggle}
              />
            ))}
          </ul>
        </div>
      ))}
    </PanelSection>
  );
}
