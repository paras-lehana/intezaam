/**
 * Style and accessibility: the look you want and who needs extra care.
 *
 * Responsibility: up to five style chips (ideas follow them) and the accessibility needs
 * that add ramps, seating, kids' safety and their vendor questions. Boundary: both
 * optional; nothing is ticked by default.
 */
import type { ReactElement } from 'react';
import {
  ACCESS_NEED_LABELS,
  ACCESS_NEEDS,
  STYLE_TAG_LABELS,
  STYLE_TAGS,
} from '@intezaam/core/domain';
import { MAX_STYLE_TAGS } from '@intezaam/core/schemas';
import { ChipGroup } from './ChipGroup';
import { GroupShell } from './GroupShell';
import type { SectionProps } from './form-fields';

const STYLE_OPTIONS = STYLE_TAGS.map((tag) => ({ value: tag, label: STYLE_TAG_LABELS[tag] }));

export function StyleAccessFields({
  state,
  update,
  errors,
  attention,
}: SectionProps): ReactElement {
  return (
    <>
      <GroupShell
        field="style"
        legend="Style"
        hint={`Up to ${MAX_STYLE_TAGS}. Ideas and themes follow these.`}
        error={errors.style}
        attention={attention === 'style'}
      >
        <ChipGroup
          name="planner-style"
          options={STYLE_OPTIONS}
          selected={state.styleTags}
          max={MAX_STYLE_TAGS}
          onChange={(styleTags) => update({ styleTags })}
        />
      </GroupShell>
      <GroupShell
        field="access"
        legend="Guests who need extra care"
        hint="Each tick adds tasks and questions for your venue and vendors."
        error={errors.access}
        attention={attention === 'access'}
      >
        {ACCESS_NEEDS.map((need) => (
          <label key={need} className="check">
            <input
              type="checkbox"
              checked={state.accessibility[need]}
              onChange={(event) =>
                update({ accessibility: { ...state.accessibility, [need]: event.target.checked } })
              }
            />
            <span>{ACCESS_NEED_LABELS[need]}</span>
          </label>
        ))}
      </GroupShell>
    </>
  );
}
