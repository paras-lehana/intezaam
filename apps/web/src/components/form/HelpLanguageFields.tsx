/**
 * Help level and plan language.
 *
 * Responsibility: who is doing the work (it decides delegation and whether a planner
 * line appears) and the language explanations and drafts are written in (11 languages,
 * each named in its own script). Boundary: the defaults are "family helping" and English;
 * the screens themselves stay in English.
 */
import type { ReactElement } from 'react';
import {
  HELP_LEVEL_LABELS,
  HELP_LEVELS,
  type HelpLevel,
  LANGUAGE_CODES,
  LANGUAGES,
  languageLabel,
} from '@intezaam/core/domain';
import { ChoiceGroup } from '../ui/ChoiceGroup';
import { FieldShell } from './FieldShell';
import { type SectionProps, plannerFieldId } from './form-fields';

const HELP_OPTIONS = HELP_LEVELS.map((level) => ({
  value: level,
  label: HELP_LEVEL_LABELS[level],
}));

export function HelpLanguageFields({
  state,
  update,
  errors,
  attention,
}: SectionProps): ReactElement {
  return (
    <>
      <div
        id={plannerFieldId('help')}
        className={attention === 'help' ? 'field field--attention' : 'field'}
      >
        <ChoiceGroup<HelpLevel>
          legend="Who is doing the planning?"
          name="planner-help"
          variant="chips"
          options={HELP_OPTIONS}
          value={state.helpLevel}
          onChange={(helpLevel) => update({ helpLevel })}
          error={errors.help}
        />
      </div>
      <FieldShell
        field="language"
        inputId="planner-language"
        label="Language for explanations and messages"
        error={errors.language}
        attention={attention === 'language'}
        renderControl={(a11y) => (
          <select
            {...a11y}
            value={state.language}
            onChange={(event) =>
              update({
                language:
                  LANGUAGE_CODES.find((code) => code === event.target.value) ?? state.language,
              })
            }
          >
            {LANGUAGE_CODES.map((code) => (
              <option key={code} value={code} lang={LANGUAGES[code].bcp47}>
                {languageLabel(code)}
              </option>
            ))}
          </select>
        )}
      />
    </>
  );
}
