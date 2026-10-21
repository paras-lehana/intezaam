/**
 * Tests for schemas/plan-time.ts: timeline, function and run-sheet contracts.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { FUNCTION_PROFILES } from '../domain/functions.js';
import {
  dateNoteSchema,
  planFunctionSchema,
  planTaskSchema,
  runSheetSchema,
  timelineSchema,
} from '../schemas/plan-time.js';
import { buildFixturePlan } from './fixtures/plan-fixture.js';

const plan = buildFixturePlan();
const sangeet = FUNCTION_PROFILES.sangeet;

describe('time contracts', () => {
  it('accept the fixture timeline and its tasks', () => {
    expect(timelineSchema.safeParse(plan.timeline).success).toBe(true);
    for (const task of plan.timeline.tasks)
      expect(planTaskSchema.safeParse(task).success).toBe(true);
  });

  it('rejects an unknown task status and a lead beyond the planning window', () => {
    const [task] = plan.timeline.tasks;
    expect(planTaskSchema.safeParse({ ...task, status: 'someday' }).success).toBe(false);
    expect(planTaskSchema.safeParse({ ...task, leadDays: 100_000 }).success).toBe(false);
  });

  it('accepts a function card and a run sheet built from a function profile', () => {
    const card = {
      functionKind: 'sangeet',
      label: sangeet.label,
      dayOffset: sangeet.dayOffset,
      startHhmm: sangeet.defaultStartHhmm,
      endHhmm: sangeet.defaultStartHhmm,
      guests: 0,
      budgetInr: 0,
      ceremonies: [],
      traceIds: [],
    };
    expect(planFunctionSchema.safeParse(card).success).toBe(true);
    const slots = [{ atHhmm: sangeet.defaultStartHhmm, title: 'Start', owner: 'Family' }];
    const sheet = { functionKind: 'sangeet', label: sangeet.label, slots, traceIds: [] };
    expect(runSheetSchema.safeParse(sheet).success).toBe(true);
    expect(
      runSheetSchema.safeParse({ ...sheet, slots: [{ ...slots[0], atHhmm: '25:00' }] }).success,
    ).toBe(false);
  });

  it('date notes need a known kind and rule', () => {
    const note = {
      kind: 'muhurat',
      ruleId: 'DATE-02',
      text: 'Confirm with your pandit.',
      sourceIds: [],
      traceIds: [],
    };
    expect(dateNoteSchema.safeParse(note).success).toBe(true);
    expect(dateNoteSchema.safeParse({ ...note, kind: 'horoscope' }).success).toBe(false);
  });
});
