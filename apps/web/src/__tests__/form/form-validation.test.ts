/**
 * Responsibility: validation — the empty form needs the five essentials, the form-only budget
 * and date rules, schema messages land on the field that owns them, and a valid form returns
 * exactly what eventContextSchema outputs. Boundary: pure functions only; the rendered form is
 * tested in planner-form*.test.tsx.
 */
import { describe, expect, it } from 'vitest';
import { sampleContext } from '@intezaam/core/domain';
import { eventContextSchema } from '@intezaam/core/schemas';
import { contextInputFromState } from '../../components/form/form-context';
import { FIELD_MESSAGES, fieldForPath, plannerFieldId } from '../../components/form/form-fields';
import { EMPTY_FORM_STATE, fillState } from '../../components/form/form-state';
import { firstInvalidField, validatePlannerForm } from '../../components/form/form-validation';
import { TEST_TODAY_ISO } from '../helpers';

const ESSENTIALS = ['family', 'date', 'city', 'guests', 'budget'] as const;

function jaipurState(): typeof EMPTY_FORM_STATE {
  return fillState(EMPTY_FORM_STATE, sampleContext('jaipur-wedding', TEST_TODAY_ISO), true);
}

describe('validatePlannerForm', () => {
  it('asks for each of the five essentials on an empty form', () => {
    const result = validatePlannerForm(EMPTY_FORM_STATE);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    for (const field of ESSENTIALS) expect(result.errors[field]).toBe(FIELD_MESSAGES[field]);
    expect(firstInvalidField(result.errors)).toBe('family');
  });

  it('accepts "estimate it for me" and "date not fixed yet" instead of a value', () => {
    const state = { ...jaipurState(), budget: '', estimateBudget: true, dateFlexible: true };
    expect(validatePlannerForm(state).ok).toBe(true);
  });

  it('returns exactly the schema output for a valid form', () => {
    const state = jaipurState();
    const result = validatePlannerForm(state);
    expect(result).toEqual({
      ok: true,
      context: eventContextSchema.parse(contextInputFromState(state)),
    });
  });

  it('puts a typo in the guest box on the guests field', () => {
    const result = validatePlannerForm({ ...jaipurState(), guests: '2O0' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.guests).toBe(FIELD_MESSAGES.guests);
  });

  it('keeps the schema’s own sentence for cross-field rules', () => {
    const state = { ...jaipurState(), cut: 'catering' as const };
    const result = validatePlannerForm(state);
    const schema = eventContextSchema.safeParse(contextInputFromState(state));
    const custom = schema.error?.issues.find((issue) => issue.code === 'custom');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.priorities).toBe(custom?.message);
  });
});

describe('fieldForPath', () => {
  it('maps context paths to the field that shows them, unknown paths to the form', () => {
    expect(fieldForPath(['budgetInr'])).toBe('budget');
    expect(fieldForPath(['kind'])).toBe('family');
    expect(fieldForPath(['community', 'days'])).toBe('community');
    expect(fieldForPath(['nonsense'])).toBe('form');
    expect(fieldForPath([])).toBe('form');
    expect(plannerFieldId('city')).toBe('planner-field-city');
  });
});
