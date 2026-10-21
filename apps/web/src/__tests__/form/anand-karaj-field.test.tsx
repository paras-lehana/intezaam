/**
 * Responsibility: the Anand Karaj question appears only for a wedding with the Punjabi / Sikh
 * tradition, shows the answer a filled context (a read brief) carries, and the answer the
 * family picks is what the form submits. Boundary: the wedding comes from core's sample;
 * labels come from the field's own table and the tradition's profile.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TRADITION_PROFILES, sampleContext } from '@intezaam/core/domain';
import { eventContextSchema } from '@intezaam/core/schemas';
import { ANAND_KARAJ_LABELS, ANAND_KARAJ_LEGEND } from '../../components/form/AnandKarajField';
import { DEFAULT_SUBMIT_LABEL, PlannerForm } from '../../components/form/PlannerForm';
import { TEST_TODAY_ISO } from '../helpers';

const SIKH_WEDDING = {
  ...sampleContext('jaipur-wedding', TEST_TODAY_ISO),
  tradition: 'punjabi-sikh' as const,
  anandKaraj: true,
};

function renderFilled(context: Record<string, unknown>): ReturnType<typeof vi.fn> {
  const onSubmit = vi.fn();
  render(
    <PlannerForm
      formId="planner"
      todayIso={TEST_TODAY_ISO}
      onSubmit={onSubmit}
      onReadBrief={vi.fn()}
      fill={{ id: 1, context: eventContextSchema.parse(context), complete: true }}
    />,
  );
  return onSubmit;
}

function question(): HTMLElement | null {
  return screen.queryByRole('group', { name: ANAND_KARAJ_LEGEND });
}

describe('Anand Karaj question', () => {
  it('shows the answer a Sikh wedding carries, and submits the one the family picks', async () => {
    const user = userEvent.setup();
    const onSubmit = renderFilled(SIKH_WEDDING);
    await user.click(screen.getByText('More details'));
    expect(screen.getByRole('radio', { name: ANAND_KARAJ_LABELS.yes })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: ANAND_KARAJ_LABELS.no }));
    await user.click(screen.getByRole('button', { name: DEFAULT_SUBMIT_LABEL }));
    expect(onSubmit).toHaveBeenCalledWith(
      eventContextSchema.parse({ ...SIKH_WEDDING, anandKaraj: false }),
    );
  });

  it('appears once the Punjabi / Sikh tradition is picked, and only then', async () => {
    const user = userEvent.setup();
    const { tradition: _none, anandKaraj: _unsaid, ...wedding } = SIKH_WEDDING;
    renderFilled(wedding);
    await user.click(screen.getByText('More details'));
    expect(question()).toBeNull();
    await user.selectOptions(
      screen.getByRole('combobox', { name: /Tradition/ }),
      TRADITION_PROFILES['punjabi-sikh'].label,
    );
    expect(question()).not.toBeNull();
    expect(screen.getByRole('radio', { name: ANAND_KARAJ_LABELS.unsaid })).toBeChecked();
  });
});
