/**
 * Responsibility: the Timeline tab renders its plan section — a one-line time summary, the
 * date notes with their sources, the checklist grouped by phase with real labelled checkboxes
 * whose ticks are remembered on this device, status in words, Google Calendar links per task,
 * the function cards with day offsets and the run sheet. Boundary: plans from the engine;
 * expected words from the components' own tables.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PHASE_LABELS } from '@intezaam/core/domain';
import { dayOffsetText } from '../../../components/features/timeline/FunctionCards';
import { ICS_BUTTON } from '../../../components/features/timeline/IcsDownload';
import {
  TimelinePanel,
  timelineSummary,
} from '../../../components/features/timeline/TimelinePanel';
import {
  DATE_NOTE_LABELS,
  TASK_STATUS_STYLES,
  groupByPhase,
  readDoneTasks,
} from '../../../components/features/timeline/timeline-words';
import { panelProps } from '../plan-fixtures';

describe('TimelinePanel', () => {
  it('opens with the time situation in one sentence', () => {
    const props = panelProps('jaipur-wedding');
    render(<TimelinePanel {...props} />);
    expect(screen.getByText(timelineSummary(props.plan))).toBeInTheDocument();
    expect(props.plan.timeline.compressed).toBe(true);
    expect(timelineSummary(props.plan)).toMatch(/Time is short/);
  });

  it('lists each date note with its kind and sources', () => {
    const props = panelProps('society-ganesh');
    render(<TimelinePanel {...props} />);
    const notes = screen.getByRole('region', { name: 'About your date' });
    for (const note of props.plan.timeline.dateNotes) {
      expect(within(notes).getAllByText(DATE_NOTE_LABELS[note.kind]).length).toBeGreaterThan(0);
    }
    expect(props.plan.timeline.dateNotes.map((note) => note.kind)).toContain('festival-clash');
  });

  it('groups tasks by phase, each a labelled checkbox with status and a calendar link', () => {
    const props = panelProps('bengaluru-birthday');
    const { tasks } = props.plan.timeline;
    render(<TimelinePanel {...props} />);
    const checklist = screen.getByRole('region', { name: 'Checklist' });
    const phases = within(checklist)
      .getAllByRole('heading', { level: 4 })
      .map((heading) => heading.textContent);
    const groups = groupByPhase(tasks);
    expect(phases).toHaveLength(groups.length);
    groups.forEach((group, index) => {
      expect(phases[index]).toContain(PHASE_LABELS[group.phase].label);
    });
    expect(within(checklist).getAllByRole('checkbox')).toHaveLength(tasks.length);
    const [task] = tasks;
    expect(within(checklist).getByRole('checkbox', { name: task?.title ?? '' })).not.toBeChecked();
    const status = TASK_STATUS_STYLES[task?.status ?? 'upcoming'].label;
    expect(within(checklist).getAllByText(status).length).toBeGreaterThan(0);
    const calendarLinks = within(checklist).getAllByRole('link', {
      name: /^Add to Google Calendar/,
    });
    expect(calendarLinks).toHaveLength(tasks.filter((t) => t.calendarUrl !== undefined).length);
    const taskLink = within(checklist).getByRole('link', {
      name: (name) => name.startsWith(`Add to Google Calendar: ${task?.title ?? ''}`),
    });
    expect(taskLink).toHaveAttribute('href', task?.calendarUrl);
  });

  it('remembers a ticked task on this device', async () => {
    const user = userEvent.setup();
    const props = panelProps('bengaluru-birthday');
    const [task] = props.plan.timeline.tasks;
    const { unmount } = render(<TimelinePanel {...props} />);
    await user.click(screen.getByRole('checkbox', { name: task?.title ?? '' }));
    expect(readDoneTasks()).toEqual(new Set([task?.id]));
    expect(
      screen.getByText(new RegExp(`^1 of ${props.plan.timeline.tasks.length} done`)),
    ).toBeInTheDocument();
    unmount();
    render(<TimelinePanel {...props} />);
    expect(screen.getByRole('checkbox', { name: task?.title ?? '' })).toBeChecked();
  });

  it('shows the functions with their day offsets and a run sheet per function', () => {
    const props = panelProps('jaipur-wedding');
    render(<TimelinePanel {...props} />);
    const functions = screen.getByRole('region', { name: 'Functions and days' });
    for (const fn of props.plan.functions) {
      expect(within(functions).getByRole('heading', { name: fn.label })).toBeInTheDocument();
      expect(
        within(functions).getAllByText(new RegExp(dayOffsetText(fn.dayOffset))).length,
      ).toBeGreaterThan(0);
    }
    const sheets = props.plan.runSheet.filter((sheet) => sheet.slots.length > 0);
    const runSheet = screen.getByRole('region', { name: 'Run sheet for the day' });
    expect(within(runSheet).getAllByRole('table')).toHaveLength(sheets.length);
  });

  it('offers the calendar download for a dated plan', () => {
    render(<TimelinePanel {...panelProps('chennai-60th')} />);
    expect(screen.getByRole('button', { name: ICS_BUTTON })).toBeInTheDocument();
  });
});

describe('words', () => {
  it('describes day offsets around the main day', () => {
    expect(dayOffsetText(0)).toBe('The main day');
    expect(dayOffsetText(-1)).toBe('1 day before the main day');
    expect(dayOffsetText(2)).toBe('2 days after the main day');
  });

  it('ignores tampered done-task storage', () => {
    window.localStorage.setItem('intezaam:done-tasks', '{"not":"a list"}');
    expect(readDoneTasks()).toEqual(new Set());
  });
});
