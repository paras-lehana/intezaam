/**
 * Responsibility: the help level and the plan language — each option is labelled from core and
 * each language option carries its own lang tag; a pick lands in the state, a value outside the
 * list keeps the current language, and each field glows and shows its error on its own.
 * Boundary: rendered alone in the section harness; labels come from core's tables and messages
 * from the form's own table.
 */
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HELP_LEVEL_LABELS, LANGUAGES, languageLabel } from '@intezaam/core/domain';
import { HelpLanguageFields } from '../../components/form/HelpLanguageFields';
import { FIELD_MESSAGES, plannerFieldId } from '../../components/form/form-fields';
import { EMPTY_FORM_STATE } from '../../components/form/form-state';
import { renderSection } from './section-harness';

const LANGUAGE_NAME = 'Language for explanations and messages';

describe('HelpLanguageFields', () => {
  it('records who is planning and the language picked', async () => {
    const { user, latest } = renderSection(HelpLanguageFields);
    expect(
      screen.getByRole('radio', { name: HELP_LEVEL_LABELS[EMPTY_FORM_STATE.helpLevel] }),
    ).toBeChecked();
    await user.click(screen.getByRole('radio', { name: HELP_LEVEL_LABELS.planner }));
    await user.selectOptions(
      screen.getByRole('combobox', { name: LANGUAGE_NAME }),
      languageLabel('hi'),
    );
    expect(latest()).toMatchObject({ helpLevel: 'planner', language: 'hi' });
  });

  it('names each language in its own script, tagged for screen readers', () => {
    renderSection(HelpLanguageFields);
    expect(screen.getByRole('option', { name: languageLabel('ta') })).toHaveAttribute(
      'lang',
      LANGUAGES.ta.bcp47,
    );
  });

  it('keeps the current language when the select reports a value outside the list', () => {
    const { latest } = renderSection(HelpLanguageFields, { start: { language: 'mr' } });
    fireEvent.change(screen.getByRole('combobox', { name: LANGUAGE_NAME }), {
      target: { value: 'xx' },
    });
    expect(latest().language).toBe('mr');
  });

  it('glows on the help question and marks the language as invalid', () => {
    renderSection(HelpLanguageFields, {
      errors: { help: FIELD_MESSAGES.help, language: FIELD_MESSAGES.language },
      attention: 'help',
    });
    expect(document.getElementById(plannerFieldId('help'))).toHaveClass('field--attention');
    expect(document.getElementById(plannerFieldId('language'))).not.toHaveClass('field--attention');
    const select = screen.getByRole('combobox', { name: LANGUAGE_NAME });
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(select).toHaveAccessibleDescription(FIELD_MESSAGES.language);
  });

  it('glows on the language alone when that is the field to fix', () => {
    renderSection(HelpLanguageFields, { attention: 'language' });
    expect(document.getElementById(plannerFieldId('language'))).toHaveClass('field--attention');
    expect(document.getElementById(plannerFieldId('help'))).not.toHaveClass('field--attention');
  });
});
