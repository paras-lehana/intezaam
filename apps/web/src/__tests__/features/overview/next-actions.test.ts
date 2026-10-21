/**
 * Responsibility: the three next actions — from the narration when it arrived (due dates still
 * from the plan, never the model), else from the plan's checklist with "Do now" first and
 * after-event wrap-up never offered. Boundary: plans from the engine; narration from fixtures.
 */
import { describe, expect, it } from 'vitest';
import { NEXT_ACTION_COUNT, nextActions } from '../../../components/features/overview/next-actions';
import { narrationFor, samplePlan } from '../plan-fixtures';

const { plan } = samplePlan('jaipur-wedding');

describe('nextActions', () => {
  it('uses the narration’s actions with the plan’s due dates', () => {
    const narration = narrationFor(plan);
    const [action] = narration.actions;
    const task = plan.timeline.tasks.find((candidate) => candidate.id === action?.taskId);
    expect(nextActions(plan, narration)).toEqual([
      { id: action?.taskId, text: action?.text, dueIso: task?.dueIso, fromNarration: true },
    ]);
  });

  it('picks three open tasks from the checklist, the most pressing first', () => {
    const actions = nextActions(plan);
    expect(actions).toHaveLength(NEXT_ACTION_COUNT);
    const statuses = actions.map(
      (action) => plan.timeline.tasks.find((task) => task.id === action.id)?.status,
    );
    expect(statuses).not.toContain('after-event');
    expect(actions.every((action) => !action.fromNarration)).toBe(true);
    const pressing = plan.timeline.tasks.some((task) => task.status === 'do-now');
    if (pressing) expect(statuses[0]).toBe('do-now');
  });

  it('ignores an empty narration action list', () => {
    const narration = { ...narrationFor(plan), actions: [] };
    expect(nextActions(plan, narration)).toEqual(nextActions(plan));
  });
});
