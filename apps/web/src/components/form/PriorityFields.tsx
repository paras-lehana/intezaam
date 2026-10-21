/**
 * Priorities: up to three categories to spend more on, and one to cut.
 *
 * Responsibility: the ranked top three (the order ticked is the rank) and the category
 * that gives up money first (BUD-05). Boundary: a category cannot be both — ticking the
 * one marked to cut clears the cut, and the cut list leaves out current priorities.
 */
import type { ReactElement } from 'react';
import { CATEGORY_PROFILES, RANKABLE_CATEGORIES } from '@intezaam/core/domain';
import { MAX_PRIORITIES } from '@intezaam/core/schemas';
import { ChipGroup } from './ChipGroup';
import { FieldShell } from './FieldShell';
import { GroupShell } from './GroupShell';
import type { SectionProps } from './form-fields';

const CATEGORY_OPTIONS = RANKABLE_CATEGORIES.map((category) => ({
  value: category,
  label: CATEGORY_PROFILES[category].label,
}));

export function PriorityFields({ state, update, errors, attention }: SectionProps): ReactElement {
  const cutOptions = CATEGORY_OPTIONS.filter((option) => !state.priorities.includes(option.value));
  return (
    <GroupShell
      field="priorities"
      legend="What matters most"
      hint={`Tick up to ${MAX_PRIORITIES}, most important first. They get a larger share.`}
      error={errors.priorities}
      attention={attention === 'priorities'}
    >
      <ChipGroup
        name="planner-priorities"
        options={CATEGORY_OPTIONS}
        selected={state.priorities}
        max={MAX_PRIORITIES}
        onChange={(priorities) =>
          update({
            priorities,
            cut: state.cut !== '' && priorities.includes(state.cut) ? '' : state.cut,
          })
        }
      />
      <FieldShell
        inputId="planner-cut"
        label="One thing to spend less on (optional)"
        renderControl={(a11y) => (
          <select
            {...a11y}
            value={state.cut}
            onChange={(event) =>
              update({
                cut: RANKABLE_CATEGORIES.find((category) => category === event.target.value) ?? '',
              })
            }
          >
            <option value="">Nothing in particular</option>
            {cutOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      />
    </GroupShell>
  );
}
