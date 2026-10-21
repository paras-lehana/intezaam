/**
 * One question and its answer: the reply or a refusal, the plan sections it cites, who
 * answered, and any proposed change.
 *
 * Responsibility: show the answer with links to the tabs it draws on (#money, #safety…),
 * explain a refusal in plain words (no booking, no payments, no legal advice), the
 * provenance badge, and a proposed change as a diff with Apply. The answer carries `lang`
 * for the language it is written in (the plan's, when Gemini answered). Boundary: display;
 * the proposal applies only through ProposedChange's button.
 */
import type { ReactElement } from 'react';
import type { ContextPatch, EventContext, Plan } from '@intezaam/core/schemas';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { writtenLang } from '../common/written-language';
import { REFUSAL_COPY, SECTION_LABELS, SECTION_TABS } from './ask-copy';
import { ProposedChange } from './ProposedChange';
import type { AskTurn } from './use-ask';

export interface AskTurnViewProps {
  readonly turn: AskTurn;
  readonly plan: Plan;
  readonly context: EventContext;
  readonly todayIso: string;
  readonly onApplyPatch: (patch: ContextPatch) => void;
}

export function AskTurnView({
  turn,
  plan,
  context,
  todayIso,
  onApplyPatch,
}: AskTurnViewProps): ReactElement {
  const { response } = turn;
  return (
    <li className="ask-turn">
      <p className="ask-turn__question">
        <span className="visually-hidden">You asked: </span>
        {turn.question}
      </p>
      <div className="ask-turn__answer panel-flat stack">
        {response.refusal === undefined ? null : (
          <p className="ask-turn__refusal">
            <span aria-hidden="true">⚠</span> {REFUSAL_COPY[response.refusal.reason]}
          </p>
        )}
        <p lang={writtenLang(response.provenance, context.language)}>{response.answer}</p>
        {response.sources.length === 0 ? null : (
          <p className="ask-turn__sources">
            From your plan:{' '}
            {response.sources.map((section, index) => (
              <span key={section}>
                {index > 0 ? ', ' : null}
                <a href={`#${SECTION_TABS[section]}`}>{SECTION_LABELS[section]}</a>
              </span>
            ))}
          </p>
        )}
        <ProvenanceBadge state="ready" provenance={response.provenance} />
        {response.patch === undefined ? null : (
          <ProposedChange
            patch={response.patch}
            plan={plan}
            context={context}
            todayIso={todayIso}
            onApplyPatch={onApplyPatch}
          />
        )}
      </div>
    </li>
  );
}
