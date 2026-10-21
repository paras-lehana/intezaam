/**
 * The plan pane before there is a plan.
 *
 * Responsibility: say what will appear and how to get it, and — when this device planned
 * something before — offer "Continue your last plan" with one tap. Boundary: the form
 * still opens empty; nothing is restored unless the reader asks.
 */
import type { ReactElement } from 'react';
import { EVENT_KIND_PROFILES } from '@intezaam/core/domain';
import type { EventContext } from '@intezaam/core/schemas';

export interface EmptyWorkspaceProps {
  readonly lastContext: EventContext | undefined;
  readonly onContinue: () => void;
}

export const EMPTY_TITLE = 'Your plan appears here';

/**
 * The words on the "continue" button: what was planned and where.
 * @example
 * continueLabel(context); // 'Continue your last plan: Wedding in Jaipur'
 */
export function continueLabel(context: EventContext): string {
  return `Continue your last plan: ${EVENT_KIND_PROFILES[context.kind].label} in ${context.city}`;
}

export function EmptyWorkspace({ lastContext, onContinue }: EmptyWorkspaceProps): ReactElement {
  return (
    <div className="workspace-empty card ledger">
      <h2>{EMPTY_TITLE}</h2>
      <p>
        Answer the five questions — or try a sample — and press “Plan my celebration”. The plan is
        worked out in your browser at once: a verdict on money and time, the budget, the timeline,
        vendor checklists, people, ideas, safety and ways to share. The AI explanation follows a
        moment later.
      </p>
      {lastContext === undefined ? null : (
        <button type="button" className="button button--secondary" onClick={onContinue}>
          {continueLabel(lastContext)}
        </button>
      )}
    </div>
  );
}
