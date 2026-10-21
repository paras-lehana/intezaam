/**
 * Responsibility: the community group sets where the event is held (which decides the pandal
 * and police permissions) and keeps each number as typed, leaving the others at the form's
 * defaults. Boundary: rendered alone in the section harness; labels come from core's premises
 * table and the defaults from the form's empty state.
 */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PREMISES_LABELS } from '@intezaam/core/domain';
import { CommunityFields } from '../../components/form/CommunityFields';
import { EMPTY_FORM_STATE } from '../../components/form/form-state';
import { renderSection } from './section-harness';

/** A society festival's head count (test-owned input). */
const HOUSEHOLDS = '240';

describe('CommunityFields', () => {
  it('moves the event onto public ground and keeps the households as typed', async () => {
    const { user, latest } = renderSection(CommunityFields);
    expect(screen.getByRole('radio', { name: PREMISES_LABELS.private })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: PREMISES_LABELS.public }));
    await user.type(screen.getByRole('textbox', { name: 'Households contributing' }), HOUSEHOLDS);
    expect(latest().community).toEqual({
      ...EMPTY_FORM_STATE.community,
      premises: 'public',
      households: HOUSEHOLDS,
    });
  });

  it('shows the form’s default length of one day', () => {
    renderSection(CommunityFields);
    expect(screen.getByRole('textbox', { name: 'Number of days' })).toHaveValue(
      EMPTY_FORM_STATE.community.days,
    );
  });
});
