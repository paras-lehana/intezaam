/**
 * Tests for engine/timeline.ts — plan tasks, their trace and calendar links (TL-01…11).
 *
 * Responsibility: prove the timeline is schema-valid in every mode, dated tasks carry a
 * Google Calendar link and their days-before-the-event, undated tasks carry neither,
 * compression and fallbacks are traced, dependencies point only at planned tasks and every
 * task cites trace items that exist. Boundary: unit tests over buildTimeline.
 */
import { describe, expect, it } from 'vitest';
import { daysBetweenIso } from '../domain/calendar.js';
import { buildTimeline } from '../engine/timeline.js';
import { createTraceLog } from '../engine/trace.js';
import { timelineSchema } from '../schemas/plan-time.js';
import type { EventContext } from '../schemas/context.js';
import { birthday, classified, inDays, undated, wedding } from './fixtures/engine-contexts.js';

function build(context: EventContext): {
  timeline: ReturnType<typeof buildTimeline>;
  ids: string[];
} {
  const trace = createTraceLog();
  const timeline = buildTimeline(classified(context), [], trace);
  return { timeline, ids: trace.items().map((item) => item.id) };
}

describe('buildTimeline', () => {
  it('is schema-valid in dated, undated and past modes', () => {
    for (const context of [wedding(), undated(wedding()), wedding({ dateIso: inDays(-5) })]) {
      const { timeline } = build(context);
      expect(timelineSchema.safeParse(timeline).success).toBe(true);
    }
  });

  it('dates tasks with a calendar link and the days left before the event', () => {
    const context = wedding();
    const { timeline } = build(context);
    expect(timeline.mode).toBe('dated');
    for (const task of timeline.tasks) {
      expect(task.calendarUrl).toContain('calendar.google.com');
      expect(task.leadDays).toBe(daysBetweenIso(task.dueIso ?? '', context.dateIso ?? ''));
    }
  });

  it('keeps tasks undated without links when the date is open', () => {
    const { timeline } = build(undated(wedding()));
    expect(timeline.mode).toBe('undated');
    expect(timeline.daysToEvent).toBeNull();
    expect(timeline.tasks.every((task) => task.dueIso === undefined)).toBe(true);
    expect(timeline.tasks.every((task) => task.calendarUrl === undefined)).toBe(true);
    expect(timeline.tasks[0]?.title).toContain('Choose your date');
  });

  it('traces compression and fallbacks and marks the timeline compressed', () => {
    const { timeline, ids } = build(wedding({ dateIso: inDays(50) }));
    expect(timeline.compressed).toBe(true);
    expect(ids.some((id) => id.startsWith('TL-03'))).toBe(true);
    expect(ids.some((id) => id.startsWith('TL-04'))).toBe(true);
    const attire = timeline.tasks.find((task) => task.templateId === 'w-buy-attire');
    expect(attire?.status).toBe('fallback');
    expect(attire?.title).toContain('ready-made');
  });

  it('is on time with no compression far ahead of the date', () => {
    const { timeline, ids } = build(birthday());
    expect(timeline.compressed).toBe(false);
    expect(ids.some((id) => id.startsWith('TL-03'))).toBe(false);
  });

  it('points dependencies only at planned tasks and cites existing trace items', () => {
    const { timeline, ids } = build(wedding());
    const planned = new Set(timeline.tasks.map((task) => task.id));
    for (const task of timeline.tasks) {
      task.dependsOn.forEach((id) => expect(planned.has(id)).toBe(true));
      task.traceIds.forEach((id) => expect(ids).toContain(id));
    }
    timeline.traceIds.forEach((id) => expect(ids).toContain(id));
  });

  it('records the function a task belongs to', () => {
    const { timeline } = build(wedding());
    expect(timeline.tasks.find((task) => task.templateId === 'w-book-mehendi')?.functionKind).toBe(
      'mehendi',
    );
  });
});
