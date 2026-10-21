/**
 * Headcount forecaster (feature #25): invited by segment → expected guests, plate guarantee,
 * cook-for count, rooms and the waste warning.
 *
 * Responsibility: show the engine's HC-01/HC-02 numbers as a small ledger table with the
 * in-town and travelling segments, plus the per-function guest counts and "Why this?".
 * Boundary: display only; every number comes from `plan.headcount` and `plan.functions`.
 */
import type { ReactElement } from 'react';
import type { Plan } from '@intezaam/core/schemas';
import { PanelSection } from '../common/PanelSection';
import { TraceDisclosure } from '../common/TraceDisclosure';

export interface HeadcountForecastProps {
  readonly plan: Plan;
}

const PERCENT = 100;

export function HeadcountForecast({ plan }: HeadcountForecastProps): ReactElement {
  const count = plan.headcount;
  const inTown = count.invited - count.outstationGuests;
  return (
    <PanelSection
      id="people-headcount"
      title="Headcount forecast"
      lede="Not everyone invited comes: travelling guests come less often than local ones."
    >
      <table className="people-table">
        <caption className="visually-hidden">Guests invited, expected and fed</caption>
        <tbody>
          <tr>
            <th scope="row">Invited from town</th>
            <td>{inTown}</td>
          </tr>
          <tr>
            <th scope="row">Invited from out of town</th>
            <td>{count.outstationGuests}</td>
          </tr>
          <tr>
            <th scope="row">Likely to come ({Math.round(count.attendanceRate * PERCENT)}%)</th>
            <td>{count.expected}</td>
          </tr>
          <tr>
            <th scope="row">Plates to guarantee the caterer</th>
            <td>{count.plateGuarantee}</td>
          </tr>
          <tr>
            <th scope="row">Food to cook for</th>
            <td>{count.cookFor}</td>
          </tr>
          <tr>
            <th scope="row">Rooms for travelling guests</th>
            <td>{count.rooms}</td>
          </tr>
          {count.returnGiftsToOrder === undefined ? null : (
            <tr>
              <th scope="row">Return gifts to order</th>
              <td>{count.returnGiftsToOrder}</td>
            </tr>
          )}
        </tbody>
      </table>
      {/* HC-02: 10–20% of wedding food is wasted (S-DTE-2018, S-HASSANCHEF-2026). */}
      <p className="callout people-warning">
        <span aria-hidden="true">⚠</span> Guaranteeing more than {count.wasteWarningAbove} plates is
        likely waste — Indian weddings waste 10–20% of the food cooked.
      </p>
      {plan.functions.length > 1 ? (
        <ul
          className="plain-list people-functions"
          role="list"
          aria-label="Guests at each function"
        >
          {plan.functions.map((entry) => (
            <li key={entry.functionKind}>
              {entry.label}: <strong>{entry.guests}</strong> guests
            </li>
          ))}
        </ul>
      ) : null}
      <TraceDisclosure plan={plan} traceIds={count.traceIds} subject="the headcount forecast" />
    </PanelSection>
  );
}
