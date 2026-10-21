/**
 * Tests for engine/timeline-schedule.ts — the scheduler ported from the owner's earlier planner (TL-02…07).
 *
 * Responsibility: prove on-time tasks are due their lead time before the event; late tasks
 * are packed into the days left, longest lead first, in 1–3-day steps and never after the
 * event; tasks needing more time than is left take their fallback or drop out; undated
 * plans put "choose the date" first; past dates keep only wrap-up tasks; prerequisites are
 * never due later than what depends on them; and "do now" starts at exactly seven days.
 * Boundary: unit tests; expected dates are computed from template lead times.
 */
import { describe, expect, it } from 'vitest';
import { addDaysIso, daysBetweenIso } from '../domain/calendar.js';
import { TASK_TEMPLATES } from '../domain/tasks.js';
import type { TaskTemplate } from '../domain/task-types.js';
import { DAYS_PER_WEEK } from '../domain/timeline.js';
import { selectTemplates } from '../engine/task-conditions.js';
import {
  byLeadThenId,
  keepPrerequisitesFirst,
  type Slot,
  slotsFor,
  statusOf,
} from '../engine/timeline-schedule.js';
import {
  birthday,
  classified,
  inDays,
  TODAY,
  undated,
  wedding,
} from './fixtures/engine-contexts.js';

function template(id: string): TaskTemplate {
  const found = TASK_TEMPLATES.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`missing template ${id}`);
  return found;
}

function scheduled(dateIso: string): Slot[] {
  const ctx = classified(wedding({ dateIso }));
  return slotsFor(ctx, selectTemplates(ctx));
}

describe('slotsFor: dated', () => {
  it('dates on-time tasks at their lead before the event', () => {
    const date = inDays(400);
    for (const slot of scheduled(date)) {
      expect(slot.late).toBe(false);
      expect(slot.due).toBe(addDaysIso(date, -slot.template.leadDays));
    }
  });

  it('packs late tasks into the days left, longest lead first, never after the event', () => {
    const date = inDays(60);
    const late = scheduled(date).filter((slot) => slot.late);
    expect(late.length).toBeGreaterThan(1);
    const leads = late.map((slot) => slot.template.leadDays);
    expect([...leads].sort((a, b) => b - a)).toEqual(leads);
    let previous = TODAY;
    for (const slot of late) {
      const due = slot.due ?? '';
      expect(due > TODAY && due <= date).toBe(true);
      const gap = daysBetweenIso(previous, due) ?? 0;
      expect(gap).toBeGreaterThanOrEqual(0);
      expect(gap).toBeLessThanOrEqual(3);
      previous = due;
    }
  });

  it('squeezes everything onto the day itself when the event is today', () => {
    const late = scheduled(TODAY).filter((slot) => slot.late);
    expect(late.every((slot) => slot.due === TODAY)).toBe(true);
  });

  it('swaps a task for its fallback when too little time is left, at the threshold too', () => {
    const attire = template('w-buy-attire');
    const minLeft = attire.minLeftDays ?? 0;
    const tooLate = scheduled(inDays(minLeft - 1)).find((slot) => slot.template.id === attire.id);
    const atThreshold = scheduled(inDays(minLeft)).find((slot) => slot.template.id === attire.id);
    expect(tooLate?.fallback).toBe(true);
    expect(atThreshold?.fallback).toBe(false);
  });

  it('drops a task with a minimum lead and no fallback when too little time is left', () => {
    const ctx = classified(birthday({ dateIso: inDays(5) }));
    const gifts = template('b-return-gifts');
    const { fallbackTitle: _drop, ...noFallback } = gifts;
    expect(slotsFor(ctx, [noFallback])).toEqual([]);
    expect(slotsFor(ctx, [gifts])[0]?.fallback).toBe(true);
  });
});

describe('slotsFor: undated and past', () => {
  it('leaves tasks undated with "choose your date" first', () => {
    const ctx = classified(undated(wedding()));
    const slots = slotsFor(ctx, selectTemplates(ctx));
    expect(slots[0]?.template.condition).toBe('date-undecided');
    expect(slots.every((slot) => slot.due === null)).toBe(true);
  });

  it('keeps only wrap-up tasks for a past date, dated after it', () => {
    const date = inDays(-10);
    const ctx = classified(wedding({ dateIso: date }));
    const slots = slotsFor(ctx, selectTemplates(ctx));
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((slot) => slot.template.phase === 'after' && (slot.due ?? '') > date)).toBe(
      true,
    );
  });
});

describe('keepPrerequisitesFirst (TL-07)', () => {
  it('moves a task to its prerequisite’s date and reports how many moved', () => {
    const venue = template('w-book-venue');
    const budget = template('w-set-budget');
    const slots: Slot[] = [
      { template: venue, due: inDays(1), late: true, fallback: false },
      { template: budget, due: inDays(5), late: true, fallback: false },
    ];
    expect(keepPrerequisitesFirst(slots)).toBe(1);
    expect(slots[0]?.due).toBe(inDays(5));
    expect(keepPrerequisitesFirst(slots)).toBe(0);
  });
});

describe('statusOf and byLeadThenId', () => {
  const base = { template: template('w-book-venue'), late: false, fallback: false };

  it('calls a task due within exactly a week "do now" and later ones upcoming', () => {
    expect(statusOf({ ...base, due: inDays(DAYS_PER_WEEK) }, TODAY)).toBe('do-now');
    expect(statusOf({ ...base, due: inDays(DAYS_PER_WEEK + 1) }, TODAY)).toBe('upcoming');
    expect(statusOf({ ...base, due: null }, TODAY)).toBe('upcoming');
    expect(statusOf({ ...base, due: TODAY, late: true }, TODAY)).toBe('urgent');
    expect(statusOf({ ...base, due: TODAY, fallback: true }, TODAY)).toBe('fallback');
    const after = { ...base, template: template('w-thank-yous'), due: inDays(3) };
    expect(statusOf(after, TODAY)).toBe('after-event');
  });

  it('sorts the longest lead first, then by id', () => {
    const sorted = [
      template('w-send-invitations'),
      template('w-book-venue'),
      template('w-set-budget'),
    ].sort(byLeadThenId);
    expect(sorted.map((t) => t.id)).toEqual(['w-book-venue', 'w-set-budget', 'w-send-invitations']);
  });
});
