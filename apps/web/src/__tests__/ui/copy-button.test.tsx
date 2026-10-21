/**
 * Responsibility: CopyButton — a successful copy is announced, and a missing clipboard is
 * announced too. Boundary: the clipboard is user-event's stub, spied per test.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { COPY_UNAVAILABLE, CopyButton } from '../../components/ui/CopyButton';

describe('CopyButton', () => {
  it('copies the text and announces it', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    render(<CopyButton text="Plan summary" label="Copy summary" copiedMessage="Summary copied." />);
    await user.click(screen.getByRole('button', { name: /Copy summary/ }));
    expect(writeText).toHaveBeenCalledWith('Plan summary');
    expect(screen.getByRole('status')).toHaveTextContent('Summary copied.');
  });

  it('says so when the clipboard is unavailable', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
    render(<CopyButton text="Plan summary" label="Copy summary" copiedMessage="Summary copied." />);
    await user.click(screen.getByRole('button', { name: /Copy summary/ }));
    expect(screen.getByRole('status')).toHaveTextContent(COPY_UNAVAILABLE);
  });
});
