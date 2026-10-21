/**
 * Accessibility and elders plan (feature #36): ramps, an accessible toilet, a step-free
 * route, elders' seating, first aid and lit paths — and what ticking a need adds.
 *
 * Responsibility: real labelled checkboxes for the needs; the checks that apply; the
 * timeline tasks a newly ticked need adds (the engine re-plans in the browser); and how to
 * keep the change. Boundary: a preview until the needs are saved under "Your details"
 * (typed changes carry no access needs); the rules are core's ACC-01…06.
 */
import { type ReactElement, useMemo, useState } from 'react';
import { ACCESS_NEEDS, ACCESS_NEED_LABELS, type AccessNeed } from '@intezaam/core/domain';
import type { EventContext, Plan } from '@intezaam/core/schemas';
import { PanelSection } from '../common/PanelSection';
import { TraceDisclosure } from '../common/TraceDisclosure';
import { accessPreview } from './access-preview';

export interface AccessPlanProps {
  readonly plan: Plan;
  readonly context: EventContext;
  readonly todayIso: string;
}

function sameNeeds(a: ReadonlySet<AccessNeed>, b: readonly AccessNeed[]): boolean {
  return a.size === b.length && b.every((need) => a.has(need));
}

export function AccessPlan({ plan, context, todayIso }: AccessPlanProps): ReactElement {
  const saved = plan.accessibility.needs;
  const [base, setBase] = useState(saved);
  const [needs, setNeeds] = useState<ReadonlySet<AccessNeed>>(() => new Set(saved));
  // Adjusting state while rendering (React's documented pattern): a re-planned event starts
  // the ticks again from its own saved needs.
  if (base !== saved) {
    setBase(saved);
    setNeeds(new Set(saved));
  }
  const changed = !sameNeeds(needs, plan.accessibility.needs);
  // Efficiency: one engine run per ticked change, and none while the ticks match the plan.
  const preview = useMemo(
    () => (changed ? accessPreview(plan, context, todayIso, needs) : null),
    [changed, plan, context, todayIso, needs],
  );
  const items = preview?.items ?? plan.accessibility.items;

  function toggle(need: AccessNeed): void {
    setNeeds((current) => {
      const next = new Set(current);
      if (next.has(need)) next.delete(need);
      else next.add(need);
      return next;
    });
  }

  return (
    <PanelSection id="safety-access" title="Accessibility and elders">
      <fieldset className="access-needs">
        <legend>Who is coming that needs care</legend>
        {ACCESS_NEEDS.map((need) => (
          <label key={need} className="check">
            <input type="checkbox" checked={needs.has(need)} onChange={() => toggle(need)} />
            {ACCESS_NEED_LABELS[need]}
          </label>
        ))}
      </fieldset>
      <ul className="plain-list access-items" role="list" aria-live="polite">
        {items.map((item) => (
          <li key={item.id}>
            <h4>{item.title}</h4>
            <p>{item.detail}</p>
          </li>
        ))}
      </ul>
      {preview === null ? null : (
        <div className="access-preview callout" role="status">
          {preview.addedTasks.length > 0 ? (
            <>
              <p>This adds {preview.addedTasks.length} timeline tasks:</p>
              <ul>
                {preview.addedTasks.map((title) => (
                  <li key={title}>{title}</li>
                ))}
              </ul>
            </>
          ) : null}
          {preview.removedTasks.length > 0 ? (
            <p>This removes: {preview.removedTasks.join('; ')}.</p>
          ) : null}
          <p className="muted">
            To keep it in the plan, tick the same needs under <a href="#details">Your details</a>.
          </p>
        </div>
      )}
      <TraceDisclosure
        plan={plan}
        traceIds={plan.accessibility.traceIds}
        subject="the accessibility plan"
      />
    </PanelSection>
  );
}
