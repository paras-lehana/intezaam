/**
 * Responsibility: the food group changes the menu (which prices the plates), ticks the Jain,
 * halal and no-onion-no-garlic needs one by one, and records whether alcohol is served.
 * Boundary: rendered alone in the section harness; menu labels come from core's diet table
 * and the starting choices from the form's empty state.
 */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DIET_PROFILE_INFO } from '@intezaam/core/domain';
import { FoodFields } from '../../components/form/FoodFields';
import { EMPTY_FORM_STATE } from '../../components/form/form-state';
import { renderSection } from './section-harness';

describe('FoodFields', () => {
  it('starts from the empty form’s vegetarian menu', () => {
    renderSection(FoodFields);
    expect(
      screen.getByRole('radio', { name: DIET_PROFILE_INFO[EMPTY_FORM_STATE.diet.menu].label }),
    ).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Alcohol/ })).not.toBeChecked();
  });

  it('records the menu, each special need and alcohol', async () => {
    const { user, latest } = renderSection(FoodFields);
    await user.click(screen.getByRole('radio', { name: DIET_PROFILE_INFO['non-veg'].label }));
    await user.click(screen.getByRole('checkbox', { name: /Jain/ }));
    await user.click(screen.getByRole('checkbox', { name: /Halal/ }));
    await user.click(screen.getByRole('checkbox', { name: /no-onion/ }));
    await user.click(screen.getByRole('checkbox', { name: /Alcohol/ }));
    expect(latest().diet).toEqual({ menu: 'non-veg', jainGuests: true, halal: true, satvik: true });
    expect(latest().alcohol).toBe(true);
  });

  it('unticks a need again', async () => {
    const { user, latest } = renderSection(FoodFields, {
      start: { diet: { ...EMPTY_FORM_STATE.diet, halal: true } },
    });
    await user.click(screen.getByRole('checkbox', { name: /Halal/ }));
    expect(latest().diet).toEqual(EMPTY_FORM_STATE.diet);
  });
});
