/**
 * Overview: the verdict, the plan in plain words, readiness, the top risks and key numbers.
 *
 * Responsibility: the first tab a new plan opens on — answer "can this work?" (verdict
 * stamp with reasons), "what next?" (narration and three steps), "how far along?"
 * (readiness), "what could go wrong?" (top risks) and "how much, how many?" (key numbers).
 * Boundary: shipped with the workspace (not lazy) because every plan opens here.
 */
import type { ReactElement } from 'react';
import type { Provenance } from '@intezaam/core/schemas';
import { PanelHeader } from '../common/PanelHeader';
import type { PanelProps } from '../panel-props';
import { KeyNumbers } from './KeyNumbers';
import { NarrativeSection } from './NarrativeSection';
import { ReadinessScore } from './ReadinessScore';
import { TopRisks } from './TopRisks';
import { VerdictCard } from './VerdictCard';
import './overview.css';

export interface OverviewPanelProps extends PanelProps {
  /** Who wrote the narration; the workspace passes it so the badge sits beside the text. */
  readonly provenance?: Provenance | undefined;
}

export function OverviewPanel({
  plan,
  narration,
  narrationState,
  narrationLang,
  provenance,
}: OverviewPanelProps): ReactElement {
  return (
    <div className="panel overview">
      <PanelHeader title="Overview">
        Can this budget and date work, what to do next, and the numbers that matter.
      </PanelHeader>
      <VerdictCard plan={plan} />
      <NarrativeSection
        plan={plan}
        narration={narration}
        narrationState={narrationState}
        provenance={provenance}
        lang={narrationLang}
      />
      <TopRisks plan={plan} />
      <ReadinessScore plan={plan} />
      <KeyNumbers plan={plan} />
    </div>
  );
}
