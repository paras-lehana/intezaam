/**
 * Tests for the shared task urgency order.
 *
 * Responsibility: do-now before urgent before fallback before upcoming before after-event,
 * the planner's order kept within a status, and the plan left unchanged. Boundary: plans
 * come from the real engine; a crafted copy covers every status.
 */
import { describe, expect, it } from 'vitest';
import { nextTasks } from '../offline/task-order.js';
import type { Plan } from '../schemas/plan.js';
import type { TaskStatus } from '../schemas/plan-time.js';
import { planned } from './fixtures/genai-plans.js';

const ORDER: readonly TaskStatus[] = ['do-now', 'urgent', 'fallback', 'upcoming', 'after-event'];

describe('nextTasks', () => {
  const { plan } = planned('jaipur-wedding');

  it('orders the real plan by status without changing the plan', () => {
    const before = plan.timeline.tasks.map((task) => task.id);
    const ranks = nextTasks(plan).map((task) => ORDER.indexOf(task.status));
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
    expect(plan.timeline.tasks.map((task) => task.id)).toEqual(before);
  });

  it('ranks every status and keeps the planner order inside one status', () => {
    const [template] = plan.timeline.tasks;
    expect(template).toBeDefined();
    const statuses: readonly TaskStatus[] = [
      'after-event',
      'upcoming',
      'urgent',
      'fallback',
      'do-now',
      'urgent',
    ];
    const crafted: Plan = {
      ...plan,
      timeline: {
        ...plan.timeline,
        tasks:
          template === undefined
            ? []
            : statuses.map((status, index) => ({ ...template, id: `t${index}`, status })),
      },
    };
    expect(nextTasks(crafted).map((task) => task.id)).toEqual(['t4', 't2', 't5', 't3', 't1', 't0']);
  });
});
