/**
 * Tests for the WhatsApp share text.
 *
 * Responsibility: the message carries the title in WhatsApp bold, the event, city and date,
 * the guest numbers, budget and verdict headline from the plan, days to go, the three most
 * urgent tasks and the estimates note; an undated plan says so; an unsafe or blank title is
 * cleaned or replaced; the message is capped. Boundary: plans come from the real engine.
 */
import { describe, expect, it } from 'vitest';
import { EVENT_KIND_PROFILES } from '../domain/event-kinds.js';
import { buildShareText, MAX_SHARE_TEXT_CHARS } from '../export/share-text.js';
import { formatLakh } from '../format.js';
import { formatShortDate } from '../offline/describe-brief.js';
import { nextTasks } from '../offline/task-order.js';
import type { Plan } from '../schemas/plan.js';
import { planned, plannedContext, undatedContext } from './fixtures/genai-plans.js';

describe('buildShareText', () => {
  const { plan } = planned('jaipur-wedding');
  const text = buildShareText(plan, 'Riya weds Arjun');

  it('opens with the bold title and the event line', () => {
    const [title, event] = text.split('\n');
    expect(title).toBe('*Riya weds Arjun*');
    expect(event).toBe(
      `${EVENT_KIND_PROFILES[plan.contextEcho.kind].label} · ${plan.contextEcho.cityName} · ${formatShortDate(plan.contextEcho.dateIso ?? '')}`,
    );
  });

  it('carries the guest numbers, budget, headline and days to go from the plan', () => {
    expect(text).toContain(
      `${plan.headcount.invited} invited, about ${plan.headcount.expected} expected`,
    );
    expect(text).toContain(
      `Budget: ${formatLakh(plan.budget.totalInr)} · ${plan.verdict.headline}`,
    );
    expect(text).toContain(`${plan.timeline.daysToEvent} days to go`);
  });

  it('lists the three most urgent tasks and the estimates note', () => {
    const tasks = nextTasks(plan).slice(0, 3);
    tasks.forEach((task, index) => expect(text).toContain(`${index + 1}. ${task.title}`));
    expect(text.endsWith('Estimates from Intezaam: get three written quotes before booking.')).toBe(
      true,
    );
  });

  it('says the date is not fixed and drops the countdown for an undated plan', () => {
    const undated = plannedContext(undatedContext('chennai-60th')).plan;
    const message = buildShareText(undated, 'Amma Appa 60');
    expect(message).toContain('date not fixed yet');
    expect(message).not.toContain('days to go');
  });

  it('cleans bidi controls from the title and falls back to the event label when blank', () => {
    expect(buildShareText(plan, 'Riya‮ weds⁦ Arjun').startsWith('*Riya weds Arjun*')).toBe(true);
    expect(
      buildShareText(plan, '  ​ ').startsWith(
        `*${EVENT_KIND_PROFILES[plan.contextEcho.kind].label}*`,
      ),
    ).toBe(true);
  });

  it('leaves out next steps when there are no tasks and caps a long message', () => {
    const empty: Plan = { ...plan, timeline: { ...plan.timeline, tasks: [] } };
    expect(buildShareText(empty, 'Party')).not.toContain('Next steps:');
    const [task] = plan.timeline.tasks;
    const long: Plan = {
      ...plan,
      timeline: {
        ...plan.timeline,
        tasks:
          task === undefined
            ? []
            : [0, 1, 2].map((index) => ({ ...task, id: `t${index}`, title: 'x'.repeat(500) })),
      },
    };
    expect(buildShareText(long, 'Party').length).toBeLessThanOrEqual(MAX_SHARE_TEXT_CHARS);
  });
});
