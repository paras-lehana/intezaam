/**
 * The plan in plain words: the AI's headline, summary and reasons, then three next steps.
 *
 * Responsibility: show the narration with its provenance badge (Gemini with model and
 * seconds, or the offline planner), keep the section `aria-busy` while it is on its way,
 * link every reason the model cites to its "Why this?" trace, and always list three next
 * steps with due dates from the plan. The narration's own words carry `lang` (it may be in
 * Hindi, Tamil or another chosen language); the English labels around them do not.
 * Boundary: the narration is checked for faithfulness on the server; this component only
 * shows it.
 */
import type { ReactElement } from 'react';
import type { Narration, Plan, Provenance } from '@intezaam/core/schemas';
import { formatIsoDate } from '../common/dates';
import { PanelSection } from '../common/PanelSection';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { TraceDisclosure } from '../common/TraceDisclosure';
import type { NarrationState } from '../panel-props';
import { nextActions } from './next-actions';

export interface NarrativeSectionProps {
  readonly plan: Plan;
  readonly narration?: Narration | undefined;
  readonly narrationState: NarrationState;
  readonly provenance?: Provenance | undefined;
  /** BCP-47 tag of the narration's language (from the workspace). */
  readonly lang?: string | undefined;
}

/** What the section says while there is no narration to show. */
export const NARRATION_PLACEHOLDER: Readonly<Record<NarrationState, string>> = {
  idle: 'The summary appears once the plan is explained.',
  loading: 'Gemini is reading your plan and writing a short summary…',
  ready: 'The summary is ready.',
  offline:
    'The AI summary is not available right now. Every number here still comes from the planner’s tested rules.',
};

export function NarrativeSection({
  plan,
  narration,
  narrationState,
  provenance,
  lang,
}: NarrativeSectionProps): ReactElement {
  const actions = nextActions(plan, narration);
  return (
    <PanelSection id="overview-summary" title="Summary and next steps">
      <ProvenanceBadge state={narrationState} provenance={provenance} />
      <div className="narrative" aria-busy={narrationState === 'loading'}>
        {narration === undefined ? (
          <p className="muted">{NARRATION_PLACEHOLDER[narrationState]}</p>
        ) : (
          <>
            <p className="narrative__headline" lang={lang}>
              {narration.headline}
            </p>
            <p lang={lang}>{narration.summary}</p>
            {narration.reasons.length === 0 ? null : (
              <ul className="narrative__reasons">
                {narration.reasons.map((reason, index) => (
                  <li key={reason.traceId}>
                    <span lang={lang}>{reason.text}</span>
                    <TraceDisclosure
                      plan={plan}
                      traceIds={[reason.traceId]}
                      subject={`reason ${index + 1}`}
                    />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
      <h4 className="narrative__steps-title">Your next steps</h4>
      <ol className="next-actions">
        {actions.map((action) => (
          <li key={action.id}>
            <span lang={action.fromNarration ? lang : undefined}>{action.text}</span>
            {action.dueIso === undefined ? null : (
              <span className="muted"> — by {formatIsoDate(action.dueIso)}</span>
            )}
          </li>
        ))}
      </ol>
    </PanelSection>
  );
}
