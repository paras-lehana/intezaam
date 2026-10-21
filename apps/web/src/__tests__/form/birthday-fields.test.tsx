/**
 * Responsibility: the birthday group keeps the age and the number of children exactly as typed
 * (validation parses them later), and shows its error and glow when validation sends the reader
 * here. Boundary: rendered alone in the section harness; the message is the form's own.
 */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BirthdayFields } from '../../components/form/BirthdayFields';
import { FIELD_MESSAGES, plannerFieldId } from '../../components/form/form-fields';
import { renderSection } from './section-harness';

/** A first birthday with a dozen children (test-owned input). */
const TYPED = { age: '1', kidsCount: '12' } as const;

describe('BirthdayFields', () => {
  it('keeps the age and the children coming as typed', async () => {
    const { user, latest } = renderSection(BirthdayFields);
    await user.type(screen.getByRole('textbox', { name: 'Age turning' }), TYPED.age);
    await user.type(screen.getByRole('textbox', { name: 'Children coming' }), TYPED.kidsCount);
    expect(latest().birthday).toEqual(TYPED);
    expect(screen.getByRole('textbox', { name: 'Children coming' })).toHaveValue(TYPED.kidsCount);
  });

  it('shows its error on the group and glows when validation points here', () => {
    renderSection(BirthdayFields, {
      errors: { birthday: FIELD_MESSAGES.birthday },
      attention: 'birthday',
    });
    const group = screen.getByRole('group', { name: 'Birthday details' });
    expect(group).toHaveClass('field--attention');
    expect(group).toHaveAccessibleDescription(FIELD_MESSAGES.birthday);
    expect(group.id).toBe(plannerFieldId('birthday'));
  });
});
