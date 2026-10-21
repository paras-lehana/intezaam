/**
 * Adjust the split: switch categories on or off, and pick what matters most.
 *
 * Responsibility: two groups of controls that re-plan at once through the typed change
 * contract — a checkbox per category (off moves its share to the others, BUD-06) and a
 * pressed-state button per rankable category that makes it the top priority (BUD-05).
 * Contingency is never offered: it has a floor (BUD-07). Boundary: sends ContextPatch ops;
 * the engine does the rebalancing.
 */
import type { ReactElement } from 'react';
import {
  type BudgetCategory,
  CATEGORY_PROFILES,
  RANKABLE_CATEGORIES,
  type RankableCategory,
} from '@intezaam/core/domain';
import type { ContextPatch, EventContext, Plan } from '@intezaam/core/schemas';
import { PanelSection } from '../common/PanelSection';

export interface CategoryControlsProps {
  readonly plan: Plan;
  readonly context: EventContext;
  readonly onApplyPatch: (patch: ContextPatch) => void;
}

/**
 * Categories the reader may switch: every planned line plus every switched-off one, never
 * contingency, in the plan's order.
 * @example
 * toggleableCategories(plan, context).includes('contingency'); // false
 */
export function toggleableCategories(plan: Plan, context: EventContext): readonly BudgetCategory[] {
  const planned = plan.budget.lines.map((line) => line.category);
  return [...new Set([...planned, ...context.disabledCategories])].filter(
    (category) => category !== 'contingency',
  );
}

function isRankable(category: BudgetCategory): category is RankableCategory {
  return RANKABLE_CATEGORIES.some((rankable) => rankable === category);
}

export function CategoryControls({
  plan,
  context,
  onApplyPatch,
}: CategoryControlsProps): ReactElement {
  const categories = toggleableCategories(plan, context);
  const rankable = plan.budget.lines.map((line) => line.category).filter(isRankable);
  return (
    <PanelSection
      id="money-adjust"
      title="Adjust the split"
      lede="Switch a category off and its share moves to the others; make one a priority and it gets more. The plan updates at once."
    >
      <fieldset className="money-controls">
        <legend className="money-controls__legend">Categories in the plan</legend>
        <div className="chips">
          {categories.map((category) => (
            <label key={category} className="chip-option">
              <input
                type="checkbox"
                checked={!context.disabledCategories.includes(category)}
                onChange={(event) =>
                  onApplyPatch({
                    ops: [{ op: 'toggleCategory', value: category, enabled: event.target.checked }],
                  })
                }
              />
              {CATEGORY_PROFILES[category].label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="money-controls">
        <legend className="money-controls__legend">Make it the top priority</legend>
        <div className="chips">
          {rankable.map((category) => (
            <button
              key={category}
              type="button"
              className="chip-option"
              aria-pressed={context.priorities.includes(category)}
              onClick={() => onApplyPatch({ ops: [{ op: 'setPriority', value: category }] })}
            >
              {CATEGORY_PROFILES[category].label}
            </button>
          ))}
        </div>
      </fieldset>
    </PanelSection>
  );
}
