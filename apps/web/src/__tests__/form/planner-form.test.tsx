/**
 * Responsibility: PlannerForm, part 1 — it opens empty; an empty submit shows each essential's
 * error inline (aria-invalid + aria-describedby), focuses and glows the first field and never
 * submits; a filled form submits exactly eventContextSchema.parse of its input; a broken
 * optional field opens "More details" before taking focus. Boundary: only the typed values are
 * pinned; the rest of the expected payload comes from the form's own empty state.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { eventContextSchema } from '@intezaam/core/schemas';
import { FAMILY_PROFILES } from '@intezaam/core/domain';
import { DEFAULT_SUBMIT_LABEL, PlannerForm } from '../../components/form/PlannerForm';
import { contextInputFromState } from '../../components/form/form-context';
import { FIELD_MESSAGES, plannerFieldId } from '../../components/form/form-fields';
import { EMPTY_FORM_STATE } from '../../components/form/form-state';
import { TEST_TODAY_ISO } from '../helpers';

/** Inputs this test types; everything else keeps the form's defaults. */
const TYPED = { date: '2027-02-14', city: 'Jaipur', guests: 250, budget: 1_500_000 } as const;

function renderForm(onSubmit = vi.fn()): ReturnType<typeof vi.fn> {
  render(
    <PlannerForm
      formId="planner"
      todayIso={TEST_TODAY_ISO}
      onSubmit={onSubmit}
      onReadBrief={vi.fn()}
    />,
  );
  return onSubmit;
}

describe('PlannerForm validation', () => {
  it('opens empty', () => {
    renderForm();
    expect(screen.getByRole('textbox', { name: /Describe it in your words/ })).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'City or town' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'Guests invited' })).toHaveValue('');
    expect(screen.getByRole('radio', { name: FAMILY_PROFILES.wedding.label })).not.toBeChecked();
  });

  it('shows every missing essential inline and focuses the first, without submitting', async () => {
    const user = userEvent.setup();
    const onSubmit = renderForm();
    await user.click(screen.getByRole('button', { name: DEFAULT_SUBMIT_LABEL }));
    expect(onSubmit).not.toHaveBeenCalled();
    for (const message of [
      FIELD_MESSAGES.family,
      FIELD_MESSAGES.date,
      FIELD_MESSAGES.city,
      FIELD_MESSAGES.guests,
      FIELD_MESSAGES.budget,
    ]) {
      expect(screen.getByText(message)).toBeInTheDocument();
    }
    const city = screen.getByRole('combobox', { name: 'City or town' });
    expect(city).toHaveAttribute('aria-invalid', 'true');
    expect(city.getAttribute('aria-describedby')).toContain('planner-city-error');
    expect(screen.getByRole('radio', { name: FAMILY_PROFILES.wedding.label })).toHaveFocus();
    expect(document.getElementById(plannerFieldId('family'))).toHaveClass('field--attention');
    expect(screen.getByRole('alert')).toHaveTextContent('5 details need attention');
  });

  it('clears an error as soon as the field is fixed', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('button', { name: DEFAULT_SUBMIT_LABEL }));
    await user.type(screen.getByRole('combobox', { name: 'City or town' }), TYPED.city);
    expect(screen.queryByText(FIELD_MESSAGES.city)).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'City or town' })).toHaveAttribute(
      'aria-invalid',
      'false',
    );
  });

  it('submits exactly what the schema makes of the typed input', async () => {
    const user = userEvent.setup();
    const onSubmit = renderForm();
    await user.click(screen.getByRole('radio', { name: FAMILY_PROFILES.wedding.label }));
    await user.type(screen.getByLabelText('Date of the main day'), TYPED.date);
    await user.type(screen.getByRole('combobox', { name: 'City or town' }), TYPED.city);
    await user.type(screen.getByRole('textbox', { name: 'Guests invited' }), String(TYPED.guests));
    await user.type(
      screen.getByRole('textbox', { name: 'Budget in rupees (₹)' }),
      String(TYPED.budget),
    );
    await user.click(screen.getByRole('button', { name: DEFAULT_SUBMIT_LABEL }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      eventContextSchema.parse({
        ...contextInputFromState(EMPTY_FORM_STATE),
        family: 'wedding',
        kind: 'wedding',
        dateIso: TYPED.date,
        city: TYPED.city,
        guests: TYPED.guests,
        budgetInr: TYPED.budget,
      }),
    );
  });

  it('accepts "Estimate it for me" and "Date not fixed yet"', async () => {
    const user = userEvent.setup();
    const onSubmit = renderForm();
    await user.click(screen.getByRole('radio', { name: FAMILY_PROFILES.birthday.label }));
    await user.click(screen.getByRole('checkbox', { name: 'Date not fixed yet' }));
    await user.type(screen.getByRole('combobox', { name: 'City or town' }), 'Pune');
    await user.type(screen.getByRole('textbox', { name: 'Guests invited' }), '30');
    await user.click(screen.getByRole('checkbox', { name: 'Estimate it for me' }));
    await user.click(screen.getByRole('button', { name: DEFAULT_SUBMIT_LABEL }));
    const submitted = eventContextSchema.parse(onSubmit.mock.calls[0]?.[0]);
    expect(submitted.dateFlexible).toBe(true);
    expect(submitted.budgetInr).toBeUndefined();
    expect(submitted.family).toBe('birthday');
  });

  it('opens "More details" to focus a broken optional field', async () => {
    const user = userEvent.setup();
    const onSubmit = renderForm();
    await user.click(screen.getByRole('radio', { name: FAMILY_PROFILES.wedding.label }));
    await user.type(screen.getByLabelText('Date of the main day'), TYPED.date);
    await user.type(screen.getByRole('combobox', { name: 'City or town' }), TYPED.city);
    await user.type(screen.getByRole('textbox', { name: 'Guests invited' }), '100');
    await user.click(screen.getByRole('checkbox', { name: 'Estimate it for me' }));
    await user.click(screen.getByText('More details'));
    const share = screen.getByRole('textbox', { name: 'Share travelling in (%)' });
    await user.clear(share);
    await user.type(share, '250');
    await user.click(screen.getByText('More details'));
    await user.click(screen.getByRole('button', { name: DEFAULT_SUBMIT_LABEL }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('group', { name: 'Guests from out of town' })).toBeVisible();
    expect(share).toHaveFocus();
    expect(screen.getByText(FIELD_MESSAGES.travel)).toBeInTheDocument();
  });
});
