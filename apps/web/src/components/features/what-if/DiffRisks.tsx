/**
 * Risks a change brings in or clears, each with its severity in words and a shape.
 *
 * Responsibility: a titled list (h4) of risk references from the engine's diff, using the
 * shared SeverityLabel so severity is never colour alone. Boundary: renders nothing for an
 * empty list; the diff decides which risks moved.
 */
import type { ReactElement } from 'react';
import type { PlanDiff } from '@intezaam/core/schemas';
import { SeverityLabel } from '../common/SeverityLabel';

export interface DiffRisksProps {
  readonly title: string;
  readonly risks: PlanDiff['newRisks'];
}

export function DiffRisks({ title, risks }: DiffRisksProps): ReactElement | null {
  if (risks.length === 0) return null;
  return (
    <>
      <h4>{title}</h4>
      <ul className="plain-list diff__risks" role="list">
        {risks.map((risk) => (
          <li key={risk.id}>
            <SeverityLabel severity={risk.severity} /> {risk.title}
          </li>
        ))}
      </ul>
    </>
  );
}
