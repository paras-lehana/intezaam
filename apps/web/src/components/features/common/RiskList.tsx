/**
 * A list of risks, each with its severity, cause, fix and "Why this?".
 *
 * Responsibility: render risks in the order given — severity in words and a shape, the title
 * as an h4, the cause and the fix — or a plain line when there are none. Shared by the
 * Overview's top risks and the Safety tab's radar so both read the same. Boundary: display
 * only; callers choose and order the risks, and the engine decides every risk.
 */
import type { ReactElement } from 'react';
import type { Plan, Risk } from '@intezaam/core/schemas';
import { SeverityLabel } from './SeverityLabel';
import { TraceDisclosure } from './TraceDisclosure';

export interface RiskListProps {
  /** The plan the "Why this?" trace is read from. */
  readonly plan: Plan;
  readonly risks: readonly Risk[];
  /** Layout class: the Overview's compact list or the radar's cards. */
  readonly className: string;
  /** A surface for each item, such as the radar's `edge-card`; none by default. */
  readonly itemClassName?: string;
}

export function RiskList({
  plan,
  risks,
  className,
  itemClassName = '',
}: RiskListProps): ReactElement {
  if (risks.length === 0) return <p>No risks found for this plan as described.</p>;
  return (
    <ul className={`plain-list ${className}`} role="list">
      {risks.map((risk) => (
        <li key={risk.id} className={`risk risk--${risk.severity} ${itemClassName}`.trimEnd()}>
          <SeverityLabel severity={risk.severity} />
          <h4 className="risk__title">{risk.title}</h4>
          <p>
            <strong>Cause:</strong> {risk.detail}
          </p>
          <p>
            <strong>Fix:</strong> {risk.fix}
          </p>
          <TraceDisclosure plan={plan} traceIds={risk.traceIds} subject={risk.title} />
        </li>
      ))}
    </ul>
  );
}
