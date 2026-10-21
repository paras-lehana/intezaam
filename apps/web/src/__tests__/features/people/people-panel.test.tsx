/**
 * Responsibility: the People tab — the headcount forecast, the food planner and the venue
 * space check show the engine's numbers; a typed floor area re-plans through the engine;
 * the community toolkit appears only for community events. Boundary: every expectation is
 * read from `buildPlan` output for a sample; the community tools have their own test.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SPACE_LAYOUTS, SPACE_LAYOUT_PROFILES, layoutCapacity } from '@intezaam/core/domain';
import { COUNTER_LABELS } from '../../../components/features/people/FoodPlanner';
import { PeoplePanel } from '../../../components/features/people/PeoplePanel';
import { SPACE_STATUS_TEXT } from '../../../components/features/people/SpaceCheck';
import { previewPlan } from '../../../components/features/what-if/simulate';
import { TEST_TODAY_ISO } from '../../helpers';
import { samplePanel } from '../panel-fixtures';

/** A floor area this test owns (sq ft). */
const HALL_SQFT = 3_000;

function rowValue(table: HTMLElement, label: RegExp): string | null {
  return within(table).getByRole('row', { name: label }).querySelector('td')?.textContent ?? null;
}

describe('PeoplePanel headcount and food', () => {
  it('shows the engine’s headcount forecast and the waste warning', () => {
    const { plan, props } = samplePanel('jaipur-wedding');
    render(<PeoplePanel {...props} />);
    const table = screen.getByRole('table', { name: 'Guests invited, expected and fed' });
    const count = plan.headcount;
    expect(rowValue(table, /Invited from town/)).toBe(
      String(count.invited - count.outstationGuests),
    );
    expect(rowValue(table, /Invited from out of town/)).toBe(String(count.outstationGuests));
    expect(rowValue(table, /Likely to come/)).toBe(String(count.expected));
    expect(rowValue(table, /Plates to guarantee/)).toBe(String(count.plateGuarantee));
    expect(rowValue(table, /Food to cook for/)).toBe(String(count.cookFor));
    expect(rowValue(table, /Rooms/)).toBe(String(count.rooms));
    expect(
      screen.getByText(new RegExp(`more than ${count.wasteWarningAbove} plates`)),
    ).toBeInTheDocument();
  });

  it('lists the counters and diet rules the menu needs', () => {
    const { plan, props } = samplePanel('jaipur-wedding');
    render(<PeoplePanel {...props} />);
    const section = screen.getByRole('region', { name: 'Food planner' });
    expect(section).toHaveTextContent(
      `${plan.food.gramsPerAdult.min}–${plan.food.gramsPerAdult.max} g`,
    );
    for (const counter of plan.food.counters)
      expect(within(section).getByText(COUNTER_LABELS[counter])).toBeInTheDocument();
    for (const rule of plan.food.rules)
      expect(within(section).getByRole('heading', { name: rule.title })).toBeInTheDocument();
  });
});

describe('PeoplePanel venue space', () => {
  it('asks for the floor area until one is given', () => {
    const { plan, props } = samplePanel('bengaluru-birthday');
    expect(plan.space.status).toBe('unknown');
    render(<PeoplePanel {...props} />);
    expect(screen.getByRole('region', { name: 'Venue space check' })).toHaveTextContent(
      SPACE_STATUS_TEXT.unknown,
    );
  });

  it('re-plans with a typed area and lists every layout’s capacity', async () => {
    const user = userEvent.setup();
    const { context, props } = samplePanel('jaipur-wedding');
    render(<PeoplePanel {...props} />);
    await user.type(screen.getByLabelText('Floor area of the venue (sq ft)'), `${HALL_SQFT} sq ft`);
    const space = previewPlan({ ...context, areaSqft: HALL_SQFT }, TEST_TODAY_ISO)?.space;
    if (space === undefined) throw new Error('the engine plans the edited area');
    const section = screen.getByRole('region', { name: 'Venue space check' });
    expect(section).toHaveTextContent(SPACE_STATUS_TEXT[space.status]);
    expect(section).toHaveTextContent(`Holds about ${space.capacity ?? -1} guests`);
    const table = within(section).getByRole('table', {
      name: `Capacity of ${HALL_SQFT} sq ft by layout`,
    });
    for (const layout of SPACE_LAYOUTS) {
      const row = within(table)
        .getByRole('rowheader', { name: SPACE_LAYOUT_PROFILES[layout].label })
        .closest('tr');
      expect(row).toHaveTextContent(String(layoutCapacity(HALL_SQFT, layout)));
    }
    expect(within(section).getByRole('link', { name: 'Your details' })).toHaveAttribute(
      'href',
      '#details',
    );
  });
});

describe('PeoplePanel community toolkit', () => {
  it('appears for a community event only', () => {
    const { unmount } = render(<PeoplePanel {...samplePanel('jaipur-wedding').props} />);
    expect(screen.queryByRole('region', { name: 'Volunteer roster' })).not.toBeInTheDocument();
    unmount();
    render(<PeoplePanel {...samplePanel('society-ganesh').props} />);
    expect(
      screen.getByRole('region', { name: 'Contribution (chanda) planner' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Ledger: collected and spent' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Volunteer roster' })).toBeInTheDocument();
  });
});
