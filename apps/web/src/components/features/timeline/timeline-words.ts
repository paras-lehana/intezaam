/**
 * Timeline wording and grouping: task statuses, date-note kinds and phases.
 *
 * Responsibility: closed tables (a new status or note kind cannot ship without its words)
 * for how each task status and each date note reads, the done-task memory on this device,
 * and the grouping of tasks into the eight planning phases in order. Boundary: pure apart
 * from guarded storage; components render what this returns.
 */
import { z } from 'zod';
import { TIMELINE_PHASES, type TimelinePhase } from '@intezaam/core/domain';
import type { DateNoteKind, PlanTask, TaskStatus } from '@intezaam/core/schemas';
import { MAX_ID_CHARS, MAX_TASKS } from '@intezaam/core/schemas';
import { storePreference } from '../../../lib/preferences';
import { readStored } from '../common/stored-json';

interface StatusStyle {
  readonly label: string;
  /** A distinct shape per status, so it reads without colour. */
  readonly glyph: string;
}

export const TASK_STATUS_STYLES: Readonly<Record<TaskStatus, StatusStyle>> = {
  'do-now': { label: 'Do now', glyph: '●' },
  urgent: { label: 'Urgent', glyph: '▲' },
  fallback: { label: 'Plan B — too late for the usual way', glyph: '↺' },
  upcoming: { label: 'Upcoming', glyph: '○' },
  'after-event': { label: 'After the event', glyph: '✓' },
};

export const DATE_NOTE_LABELS: Readonly<Record<DateNoteKind, string>> = {
  'peak-season': 'Peak season',
  'off-peak': 'Off-peak',
  weekday: 'Weekday',
  muhurat: 'Muhurat (indicative)',
  'no-curated-muhurat': 'Muhurat (indicative)',
  'calendar-pause': 'Chaturmas or Kharmas',
  'festival-clash': 'Festival nearby',
  'rain-risk': 'Rain risk',
  'ceremony-window': 'Ceremony hours',
  'choose-date': 'Choose your date',
  'past-date': 'The date has passed',
};

export interface PhaseGroup {
  readonly phase: TimelinePhase;
  readonly tasks: readonly PlanTask[];
}

/**
 * Tasks grouped by phase, in planning order; empty phases are left out.
 * @example
 * groupByPhase(plan.timeline.tasks)[0]?.phase; // 'decide'
 */
export function groupByPhase(tasks: readonly PlanTask[]): readonly PhaseGroup[] {
  return TIMELINE_PHASES.flatMap((phase) => {
    const inPhase = tasks.filter((task) => task.phase === phase);
    return inPhase.length === 0 ? [] : [{ phase, tasks: inPhase }];
  });
}

/** Ticked tasks are remembered on this device; re-planning never unticks them (TL-06). */
export const DONE_STORAGE_KEY = 'intezaam:done-tasks';

const doneSchema = z.array(z.string().max(MAX_ID_CHARS)).max(MAX_TASKS);

/**
 * The task ids ticked on this device; empty when absent, blocked or malformed.
 * @example
 * readDoneTasks(); // Set {} on a first visit
 */
export function readDoneTasks(): ReadonlySet<string> {
  return new Set(readStored(DONE_STORAGE_KEY, doneSchema, []));
}

/**
 * Remembers the ticked task ids.
 * @example
 * storeDoneTasks(new Set(['w-book-venue']));
 */
export function storeDoneTasks(done: ReadonlySet<string>): void {
  storePreference(DONE_STORAGE_KEY, JSON.stringify([...done]));
}
