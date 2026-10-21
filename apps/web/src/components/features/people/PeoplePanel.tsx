/**
 * The People tab: headcount, food, space, the guest list, and the community
 * toolkit for community events.
 *
 * Responsibility: compose the People features in reading order — how many will come, what
 * to cook, whether the venue fits, the optional guest list — plus chanda, the ledger and
 * volunteers when the event is a community one. Boundary: composition only; numbers come
 * from the plan, and previews re-run the same engine in the browser.
 */
import type { ReactElement } from 'react';
import { PanelHeader } from '../common/PanelHeader';
import type { PanelProps } from '../panel-props';
import { CommunityToolkit } from './CommunityToolkit';
import { FoodPlanner } from './FoodPlanner';
import { GuestList } from './GuestList';
import { HeadcountForecast } from './HeadcountForecast';
import { SpaceCheck } from './SpaceCheck';
import './people.css';

export function PeoplePanel({ plan, context, todayIso, onApplyPatch }: PanelProps): ReactElement {
  return (
    <div className="people">
      <PanelHeader title="People">
        Who comes, what to cook and whether the venue fits — worked out from your guest count, city
        and menu.
      </PanelHeader>
      <HeadcountForecast plan={plan} />
      <FoodPlanner plan={plan} />
      <SpaceCheck plan={plan} context={context} todayIso={todayIso} />
      {plan.community === undefined ? null : (
        <CommunityToolkit
          plan={plan}
          community={plan.community}
          context={context}
          todayIso={todayIso}
        />
      )}
      <GuestList plan={plan} plannedGuests={context.guests} onApplyPatch={onApplyPatch} />
    </div>
  );
}
