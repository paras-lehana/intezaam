/**
 * Responsibility: the priority section, an input to the budget engine's priority shift —
 * priorities are recorded in the order ticked; at MAX_PRIORITIES every unticked chip says so
 * with aria-disabled and a tick on it changes nothing, while unticking one frees the rest; a
 * category ticked as a priority stops being the one to cut (the cut resets to "Nothing in
 * particular") and is never offered as a cut while it is a priority. Boundary: rendered alone
 * in the section harness; categories and the cap come from core, the tick order from the test.
 */
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CATEGORY_PROFILES, type RankableCategory, RANKABLE_CATEGORIES } from '@intezaam/core/domain';
import { MAX_PRIORITIES } from '@intezaam/core/schemas';
import { PriorityFields } from '../../components/form/PriorityFields';
import { renderSection } from './section-harness';

const CUT_LABEL = 'One thing to spend less on (optional)';
const NO_CUT = 'Nothing in particular';

/** The cap's worth of categories, plus one more to try ticking past it. */
const TICKED = RANKABLE_CATEGORIES.slice(0, MAX_PRIORITIES);
const EXTRA = RANKABLE_CATEGORIES[MAX_PRIORITIES];

function priorityChip(category: RankableCategory): HTMLElement {
  return within(screen.getByRole('group', { name: 'What matters most' })).getByRole('checkbox', {
    name: CATEGORY_PROFILES[category].label,
  });
}

function cutSelect(): HTMLElement {
  return screen.getByRole('combobox', { name: CUT_LABEL });
}

describe('PriorityFields', () => {
  it('records priorities in the order they are ticked', async () => {
    const { user, latest } = renderSection(PriorityFields);
    const ranked = [...TICKED].reverse();
    for (const category of ranked) await user.click(priorityChip(category));
    expect(latest().priorities).toEqual(ranked);
  });

  it(`stops at ${MAX_PRIORITIES}: the rest say so, and a tick on them changes nothing`, async () => {
    if (EXTRA === undefined) throw new Error('core ranks more categories than the cap');
    const { user, latest } = renderSection(PriorityFields);
    for (const category of TICKED) await user.click(priorityChip(category));
    const blocked = priorityChip(EXTRA);
    expect(blocked).toHaveAttribute('aria-disabled', 'true');
    for (const category of TICKED) {
      expect(priorityChip(category)).toHaveAttribute('aria-disabled', 'false');
    }
    await user.click(blocked);
    expect(blocked).not.toBeChecked();
    expect(latest().priorities).toEqual(TICKED);

    const [first, ...rest] = TICKED;
    if (first === undefined) throw new Error('the cap is at least one');
    await user.click(priorityChip(first));
    expect(blocked).toHaveAttribute('aria-disabled', 'false');
    await user.click(blocked);
    expect(blocked).toBeChecked();
    expect(latest().priorities).toEqual([...rest, EXTRA]);
  });

  it('clears the cut when the same category becomes a priority', async () => {
    const [category] = TICKED;
    if (category === undefined) throw new Error('the cap is at least one');
    const { user, latest } = renderSection(PriorityFields);
    await user.selectOptions(cutSelect(), category);
    expect(latest().cut).toBe(category);
    await user.click(priorityChip(category));
    expect(latest().cut).toBe('');
    expect(cutSelect()).toHaveDisplayValue(NO_CUT);
    expect(
      within(cutSelect()).queryByRole('option', { name: CATEGORY_PROFILES[category].label }),
    ).not.toBeInTheDocument();
  });

  it('never offers a current priority as the cut', () => {
    renderSection(PriorityFields, { start: { priorities: TICKED } });
    const offered = within(cutSelect())
      .getAllByRole('option')
      .map((option) => option.textContent);
    for (const category of TICKED) expect(offered).not.toContain(CATEGORY_PROFILES[category].label);
    expect(offered).toContain(NO_CUT);
  });
});
