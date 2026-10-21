/**
 * Responsibility: ChoiceGroup — native radios in a labelled fieldset, the controlled value,
 * and the hint and error tied to the group with aria-describedby. Boundary: generic primitive;
 * form-specific use is tested with the planner form.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChoiceGroup, describedBy } from '../../components/ui/ChoiceGroup';

const OPTIONS = [
  { value: 'tea', label: 'Tea' },
  { value: 'coffee', label: 'Coffee', hint: 'Filter, please' },
] as const;

describe('ChoiceGroup', () => {
  it('reports the picked value and wires the hint and the error', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ChoiceGroup
        legend="Drink"
        name="drink"
        options={OPTIONS}
        value=""
        onChange={onChange}
        hint="Pick one"
        error="Choose a drink."
      />,
    );
    const group = screen.getByRole('group', { name: 'Drink' });
    expect(group).toHaveAttribute('aria-describedby', 'drink-hint drink-error');
    expect(screen.getByText('Choose a drink.')).toHaveAttribute('id', 'drink-error');
    expect(screen.getByText('Filter, please')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /Coffee/ }));
    expect(onChange).toHaveBeenCalledWith('coffee');
  });

  it('shows the controlled value as checked', () => {
    render(
      <ChoiceGroup legend="Drink" name="drink" options={OPTIONS} value="tea" onChange={vi.fn()} />,
    );
    expect(screen.getByRole('radio', { name: 'Tea' })).toBeChecked();
    expect(screen.getByRole('group', { name: 'Drink' })).not.toHaveAttribute('aria-describedby');
  });

  it('builds describedby ids only for what exists', () => {
    expect(describedBy('x', false, false)).toBeUndefined();
    expect(describedBy('x', true, false)).toBe('x-hint');
    expect(describedBy('x', false, true)).toBe('x-error');
  });
});
