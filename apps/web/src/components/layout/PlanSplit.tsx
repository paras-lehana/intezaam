/**
 * The plan page's responsive split: details form and plan workspace.
 *
 * Responsibility: on wide screens (≥ 64 rem) the form sits on the left and the workspace on
 * the right, each scrolling on its own; on phones a segmented "Details | Plan" control
 * shows one pane at a time and a sticky bar carries "Update plan". Boundary: both panes
 * stay mounted in the same place in both layouts (CSS hides the inactive pane on phones),
 * so resizing or switching never resets the form or the workspace.
 */
import type { ReactElement, ReactNode } from 'react';
import { type SplitView, SplitSwitch } from './SplitSwitch';
import { StickyActionBar } from './StickyActionBar';

export const DEFAULT_ACTION_LABEL = 'Update plan';

/** The pane ids double as `/plan#details` targets for the home page's feature tiles. */
export const DETAILS_PANE_ID = 'details';
export const PLAN_PANE_ID = 'plan-workspace';

export interface PlanSplitProps {
  readonly view: SplitView;
  readonly onViewChange: (view: SplitView) => void;
  /** The planner form (its <form> must carry `formId`). */
  readonly details: ReactNode;
  readonly workspace: ReactNode;
  readonly formId: string;
  readonly planReady: boolean;
  readonly actionLabel?: string;
  readonly actionStatus?: ReactNode;
}

export function PlanSplit({
  view,
  onViewChange,
  details,
  workspace,
  formId,
  planReady,
  actionLabel = DEFAULT_ACTION_LABEL,
  actionStatus,
}: PlanSplitProps): ReactElement {
  return (
    <div className="plan-split" data-view={view}>
      <SplitSwitch view={view} onViewChange={onViewChange} planReady={planReady} />
      <section
        id={DETAILS_PANE_ID}
        className="plan-split__pane plan-split__pane--details"
        aria-label="Your details"
      >
        {details}
      </section>
      <section
        id={PLAN_PANE_ID}
        className="plan-split__pane plan-split__pane--plan"
        aria-label="Your plan"
      >
        {workspace}
      </section>
      <StickyActionBar formId={formId} label={actionLabel} status={actionStatus} />
    </div>
  );
}
