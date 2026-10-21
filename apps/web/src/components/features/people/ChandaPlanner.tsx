/**
 * Contribution (chanda) planner (feature #32): per-household amount, flat or tiered, after
 * sponsors, the RWA fund and tickets, with the funding gap or surplus.
 *
 * Responsibility: the calculator inputs beside the engine's answer — planned spend, offsets,
 * the net households cover, each household's share (rounded up to ₹10) and the VER-F funding
 * status. Boundary: the maths is core's (re-planned on each edit); edits are a preview until
 * saved under "Your details".
 */
import type { ReactElement } from 'react';
import { formatInr } from '@intezaam/core';
import { FLAT_SIZE_WEIGHTS } from '@intezaam/core/domain';
import { FUNDING_LABELS } from '@intezaam/core/engine';
import type { CommunityExtras, CommunityPlan, EventContext, Plan } from '@intezaam/core/schemas';
import { MoneyCell } from '../common/MoneyCell';
import { PanelSection } from '../common/PanelSection';
import { TraceDisclosure } from '../common/TraceDisclosure';
import { ChandaInputs } from './ChandaInputs';
import { useChanda } from './use-chanda';

export interface ChandaPlannerProps {
  readonly plan: Plan;
  readonly community: CommunityPlan;
  readonly extras: CommunityExtras;
  readonly context: EventContext;
  readonly todayIso: string;
}

export function ChandaPlanner({
  plan,
  community,
  extras,
  context,
  todayIso,
}: ChandaPlannerProps): ReactElement {
  const chanda = useChanda(plan, community, extras, context, todayIso);
  const money = chanda.community.contribution;
  const funding = chanda.funding;
  return (
    <PanelSection
      id="people-chanda"
      title="Contribution (chanda) planner"
      lede="What each household pays after sponsors, the RWA fund and ticket sales."
    >
      <div className="chanda">
        <ChandaInputs draft={chanda.draft} onChange={chanda.setDraft} />
        <div className="chanda-result" aria-live="polite">
          <table className="people-table">
            <caption className="visually-hidden">Who pays for the event</caption>
            <tbody>
              <tr>
                <th scope="row">Planned spend</th>
                <td>
                  <MoneyCell amount={money.plannedInr} />
                </td>
              </tr>
              <tr>
                <th scope="row">Less sponsors, RWA fund and tickets</th>
                <td>
                  −<MoneyCell amount={money.sponsorsInr + money.rwaFundInr + money.ticketsInr} />
                </td>
              </tr>
              <tr>
                <th scope="row">Households cover</th>
                <td>
                  <MoneyCell amount={money.netInr} />
                </td>
              </tr>
              {money.mode === 'flat' && money.perHouseholdInr !== undefined ? (
                <tr>
                  <th scope="row">Each of {money.households} households</th>
                  <td>
                    <strong>
                      <MoneyCell amount={money.perHouseholdInr} />
                    </strong>
                  </td>
                </tr>
              ) : null}
              {money.tiers.map((tier) => (
                <tr key={tier.size}>
                  <th scope="row">
                    {tier.households} {tier.size} flats (×{FLAT_SIZE_WEIGHTS[tier.size]})
                  </th>
                  <td>
                    <strong>
                      <MoneyCell amount={tier.perHouseholdInr} />
                    </strong>{' '}
                    each
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {funding === undefined ? null : (
            <p className={`callout people-status people-status--${funding.status}`}>
              <strong>{FUNDING_LABELS[funding.status]}</strong>
              {funding.gapInr > 0 ? ` — ${formatInr(funding.gapInr)} still to find.` : null}
              {funding.surplusInr > 0 ? ` — ${formatInr(funding.surplusInr)} to spare.` : null}{' '}
              {funding.reason}
            </p>
          )}
          {chanda.invalid ? (
            <p className="field__error" role="alert">
              Those numbers are out of range, so the plan’s own figures are shown.
            </p>
          ) : null}
          {chanda.edited && !chanda.invalid ? (
            <p className="muted">
              A preview — to keep it, enter the same numbers under{' '}
              <a href="#details">Your details</a>.
            </p>
          ) : null}
        </div>
      </div>
      <TraceDisclosure plan={plan} traceIds={community.traceIds} subject="the contribution" />
    </PanelSection>
  );
}
