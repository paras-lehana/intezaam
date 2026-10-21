/**
 * Responsibility: a wide table's scroll box is a region named by its label, reachable with the
 * Tab key so a keyboard user can scroll it, and keeps the caller's extra layout class.
 * Boundary: a plain table built in the test.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  SCROLL_REGION_TAB_INDEX,
  TableScroll,
} from '../../../components/features/common/TableScroll';

const LABEL = 'Budget by category';

function renderBox(className?: string): void {
  render(
    <TableScroll label={LABEL} className={className}>
      <table>
        <caption>{LABEL}</caption>
        <tbody>
          <tr>
            <td>Venue</td>
          </tr>
        </tbody>
      </table>
    </TableScroll>,
  );
}

describe('TableScroll', () => {
  it('is a named region in the tab order', async () => {
    renderBox();
    const region = screen.getByRole('region', { name: LABEL });
    expect(region).toHaveAttribute('tabindex', String(SCROLL_REGION_TAB_INDEX));
    expect(region).toHaveClass('table-scroll');
    expect(region).toContainElement(screen.getByRole('table', { name: LABEL }));
    await userEvent.setup().tab();
    expect(region).toHaveFocus();
  });

  it('keeps an extra layout class', () => {
    renderBox('run-sheet');
    expect(screen.getByRole('region', { name: LABEL })).toHaveClass('table-scroll', 'run-sheet');
  });
});
