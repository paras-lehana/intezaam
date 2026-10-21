/**
 * Ask Intezaam (feature #38), reachable from every tab: questions answered from the plan.
 *
 * Responsibility: the question box (English, Hindi or Hinglish), the conversation with up
 * to four earlier turns sent as context, answers that cite plan sections, refusals for
 * booking, payment or legal advice, provenance on every answer, and proposed changes shown
 * as a diff with Apply; Escape closes the tool and returns focus to its button. Boundary:
 * rules answer common questions on the server first and the model handles the rest;
 * nothing in the plan changes until the reader presses Apply. The conversation list is a
 * polite live region rendered from the start, so every answer — the first included — is
 * announced as it arrives.
 */
import type { ReactElement } from 'react';
import type { PanelProps } from '../panel-props';
import { AskForm } from './AskForm';
import { AskTurnView } from './AskTurnView';
import { useCloseOnEscape } from '../what-if/use-close-on-escape';
import { useAsk } from './use-ask';
import '../what-if/what-if.css';
import './ask.css';

export const CONVERSATION_LABEL = 'Conversation';

export function AskDrawer({ plan, context, todayIso, onApplyPatch }: PanelProps): ReactElement {
  const rootRef = useCloseOnEscape<HTMLDivElement>();
  const chat = useAsk(context, todayIso);
  return (
    <div className="tool" ref={rootRef}>
      <div className="tool-head">
        <h3>Ask Intezaam</h3>
        <p className="muted">
          Answers come from your plan. Ask for a change — “add 50 guests”, “budget 20 lakh kar do” —
          and you will see what it does before you apply it. Escape closes this tool.
        </p>
      </div>
      <div className="tool-body">
        {/* The live list exists before the first answer: a region inserted together with its
            text is not announced, so the first reply would otherwise be silent. */}
        <ol
          className="plain-list ask-thread"
          role="list"
          aria-label={CONVERSATION_LABEL}
          aria-live="polite"
          aria-relevant="additions"
        >
          {chat.turns.map((turn) => (
            <AskTurnView
              key={turn.id}
              turn={turn}
              plan={plan}
              context={context}
              todayIso={todayIso}
              onApplyPatch={onApplyPatch}
            />
          ))}
        </ol>
        <AskForm busy={chat.busy} error={chat.error} onAsk={chat.ask} />
      </div>
    </div>
  );
}
