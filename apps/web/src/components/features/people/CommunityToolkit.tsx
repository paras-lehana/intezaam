/**
 * Community toolkit (synthesis §3 H): chanda, the ledger, volunteers and sponsor ideas.
 *
 * Responsibility: shown only for community events — the contribution planner (when the
 * committee has given its community details), the collected-vs-spent ledger, the volunteer
 * roster and sponsor ideas. Boundary: composition only; each part owns its own state.
 */
import type { ReactElement } from 'react';
import type { CommunityPlan, EventContext, Plan } from '@intezaam/core/schemas';
import { PanelSection } from '../common/PanelSection';
import { ChandaPlanner } from './ChandaPlanner';
import { CommunityLedger } from './CommunityLedger';
import { VolunteerRoster } from './VolunteerRoster';

export interface CommunityToolkitProps {
  readonly plan: Plan;
  readonly community: CommunityPlan;
  readonly context: EventContext;
  readonly todayIso: string;
}

export function CommunityToolkit({
  plan,
  community,
  context,
  todayIso,
}: CommunityToolkitProps): ReactElement {
  return (
    <>
      {context.community === undefined ? (
        <p className="notice">
          Add the households, sponsors and RWA fund under <a href="#details">Your details</a> to
          work out each household’s contribution.
        </p>
      ) : (
        <ChandaPlanner
          plan={plan}
          community={community}
          extras={context.community}
          context={context}
          todayIso={todayIso}
        />
      )}
      <CommunityLedger community={community} title={plan.title} />
      <VolunteerRoster plan={plan} community={community} />
      <PanelSection id="people-sponsors" title="Sponsor ideas">
        <ul>
          {community.sponsorIdeas.map((idea) => (
            <li key={idea}>{idea}</li>
          ))}
        </ul>
      </PanelSection>
    </>
  );
}
