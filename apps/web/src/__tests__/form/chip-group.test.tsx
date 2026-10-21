/**
 * Responsibility: the multi-select chips keep the order ticked, untick on a second tap, and at
 * the maximum ignore a new tick while marking the unticked chips aria-disabled (never removed
 * or disabled, so they stay reachable). Boundary: a test-owned option list in a small stateful
 * host; no form state involved.
 */
import { type ReactElement, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ChipGroup } from '../../components/form/ChipGroup';

const OPTIONS = [
  { value: 'tea', label: 'Tea' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'lassi', label: 'Lassi' },
] as const;

type Drink = (typeof OPTIONS)[number]['value'];

/** Two picks out of three, so the limit can be reached and tested. */
const MAX_DRINKS = 2;

interface ChipHostProps {
  readonly max?: number;
}

function ChipHost({ max }: ChipHostProps): ReactElement {
  const [selected, setSelected] = useState<readonly Drink[]>([]);
  return (
    <>
      <ChipGroup
        name="drinks"
        options={OPTIONS}
        selected={selected}
        onChange={setSelected}
        {...(max === undefined ? {} : { max })}
      />
      <output>{selected.join(' > ')}</output>
    </>
  );
}

function drink(label: string): HTMLElement {
  return screen.getByRole('checkbox', { name: label });
}

describe('ChipGroup', () => {
  it('keeps the order ticked and unticks on a second tap', async () => {
    const user = userEvent.setup();
    render(<ChipHost />);
    await user.click(drink('Lassi'));
    await user.click(drink('Tea'));
    expect(screen.getByRole('status')).toHaveTextContent('lassi > tea');
    await user.click(drink('Lassi'));
    expect(screen.getByRole('status')).toHaveTextContent(/^tea$/);
    expect(drink('Lassi')).not.toBeChecked();
  });

  it('ignores a tick past the maximum and marks the rest aria-disabled', async () => {
    const user = userEvent.setup();
    render(<ChipHost max={MAX_DRINKS} />);
    await user.click(drink('Tea'));
    await user.click(drink('Coffee'));
    expect(drink('Lassi')).toHaveAttribute('aria-disabled', 'true');
    expect(drink('Tea')).toHaveAttribute('aria-disabled', 'false');
    await user.click(drink('Lassi'));
    expect(drink('Lassi')).not.toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent('tea > coffee');
  });
});
