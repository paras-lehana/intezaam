/**
 * Venue space check (feature #27): floor area + seating layout → capacity → a warning.
 *
 * Responsibility: show the plan's SPACE-01 result, and let the reader try a venue's floor
 * area here — the engine re-plans with that area (same rule, same layout, same expected
 * guests) and every layout's capacity is listed beside it. Boundary: a preview; the area is
 * kept by entering it under "Your details", because the typed change list has no area op.
 */
import { type ReactElement, useMemo, useState } from 'react';
import { SPACE_LAYOUTS, SPACE_LAYOUT_PROFILES, layoutCapacity } from '@intezaam/core/domain';
import type { EventContext, Plan, SPACE_STATUSES } from '@intezaam/core/schemas';
import { PanelSection } from '../common/PanelSection';
import { TraceDisclosure } from '../common/TraceDisclosure';
import { previewPlan } from '../what-if/simulate';
import { readWhole } from './chanda';
import { WholeField } from './WholeField';

export interface SpaceCheckProps {
  readonly plan: Plan;
  readonly context: EventContext;
  readonly todayIso: string;
}

type SpaceStatus = (typeof SPACE_STATUSES)[number];

export const SPACE_STATUS_TEXT: Readonly<Record<SpaceStatus, string>> = {
  ok: 'Fits comfortably.',
  tight: 'Tight: less than a tenth of the floor to spare.',
  over: 'Too small for the guests expected at the biggest function.',
  unknown: 'Add the floor area to check the capacity.',
};

export function SpaceCheck({ plan, context, todayIso }: SpaceCheckProps): ReactElement {
  const [areaText, setAreaText] = useState(
    context.areaSqft === undefined ? '' : String(context.areaSqft),
  );
  const area = readWhole(areaText);
  // Efficiency: one engine run per edited area, not per render.
  const space = useMemo(() => {
    if (area === undefined || area === context.areaSqft) return plan.space;
    return previewPlan({ ...context, areaSqft: area }, todayIso)?.space ?? plan.space;
  }, [area, context, plan.space, todayIso]);
  return (
    <PanelSection id="people-space" title="Venue space check">
      <WholeField
        id="space-area"
        label="Floor area of the venue (sq ft)"
        hint="Ask the venue for the usable floor area of the hall or lawn."
        value={areaText}
        onChange={setAreaText}
      />
      <p className={`callout people-status people-status--${space.status}`} role="status">
        {space.capacity === undefined ? null : (
          <>
            Holds about <strong>{space.capacity}</strong> guests seated as “
            {SPACE_LAYOUT_PROFILES[space.layout].label.toLowerCase()}”.{' '}
          </>
        )}
        {SPACE_STATUS_TEXT[space.status]}
      </p>
      {area === undefined ? null : (
        <table className="people-table">
          <caption>Capacity of {area} sq ft by layout</caption>
          <thead>
            <tr>
              <th scope="col">Layout</th>
              <th scope="col">Sq ft a guest</th>
              <th scope="col">Guests</th>
            </tr>
          </thead>
          <tbody>
            {SPACE_LAYOUTS.map((layout) => (
              <tr key={layout}>
                <th scope="row">{SPACE_LAYOUT_PROFILES[layout].label}</th>
                <td>{SPACE_LAYOUT_PROFILES[layout].defaultSqftPerGuest}</td>
                <td>{layoutCapacity(area, layout)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {area === undefined || area === context.areaSqft ? null : (
        <p className="muted">
          A preview — to keep this area in the plan, enter it under{' '}
          <a href="#details">Your details</a>.
        </p>
      )}
      <TraceDisclosure plan={plan} traceIds={plan.space.traceIds} subject="the venue space check" />
    </PanelSection>
  );
}
