/**
 * Permissions checklist (feature #34): loudspeaker, the 10 pm–6 am rule, pandal, procession,
 * fire, crackers and society approval — as a tickable list.
 *
 * Responsibility: the plan's permissions, blockers first, with a count of what is ticked
 * and the standing "verify with your local police station or municipal office" line.
 * Boundary: ticks are kept for this visit only; the engine decides what is needed.
 */
import { type ReactElement, useState } from 'react';
import { VERIFY_LOCALLY_NOTE } from '@intezaam/core/domain';
import type { Plan } from '@intezaam/core/schemas';
import { PanelSection } from '../common/PanelSection';
import { PermissionItem } from './PermissionItem';

export interface PermissionsChecklistProps {
  readonly plan: Plan;
}

export function PermissionsChecklist({ plan }: PermissionsChecklistProps): ReactElement {
  const [done, setDone] = useState<ReadonlySet<string>>(() => new Set());
  // Blockers first, then what is needed, then what may apply (a stable sort keeps the rest in order).
  const permissions = [...plan.permissions].sort(
    (a, b) => Number(b.blocker) - Number(a.blocker) || Number(b.required) - Number(a.required),
  );

  function toggle(id: string): void {
    setDone((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <PanelSection
      id="safety-permissions"
      title="Permissions"
      lede={`Rules differ by state and city. ${VERIFY_LOCALLY_NOTE}`}
    >
      {permissions.length === 0 ? (
        <p>No permissions are triggered by this plan. Check with your venue all the same.</p>
      ) : (
        <>
          <p className="muted" aria-live="polite">
            {done.size} of {permissions.length} ticked off.
          </p>
          <ul className="plain-list permissions" role="list">
            {permissions.map((permission) => (
              <PermissionItem
                key={permission.id}
                plan={plan}
                permission={permission}
                done={done.has(permission.id)}
                onToggle={toggle}
              />
            ))}
          </ul>
        </>
      )}
    </PanelSection>
  );
}
