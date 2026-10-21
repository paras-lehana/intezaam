/**
 * The plan workspace: the plan's heading, provenance and estimates note, the two tools,
 * and the eight tabs.
 *
 * Responsibility: compose the workspace around one computed plan — the heading focus moves
 * to after planning (tabIndex -1), the honest provenance badge for the AI narration, the
 * standing "estimates, not quotes" note, What if and Ask reachable from every tab, and the
 * WAI-ARIA tabs deep-linked from the URL hash. It works out once which language the
 * narration is written in, so every panel can tag that text with `lang`. Boundary: no
 * planning here; the page passes the plan, its context and the change handler down to every
 * panel unchanged.
 */
import type { ReactElement } from 'react';
import type { Provenance } from '@intezaam/core/schemas';
import { PLAN_HEADING_ID } from '../../../lib/plan-state';
import { Tabs } from '../../ui/Tabs';
import { EstimateNote } from '../common/EstimateNote';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { writtenLang } from '../common/written-language';
import type { PanelProps } from '../panel-props';
import { useWorkspaceHash } from './use-workspace-hash';
import { buildWorkspaceTabs } from './workspace-tabs';
import { WorkspaceTools } from './WorkspaceTools';
import '../common/common.css';
import './workspace.css';

export interface WorkspaceProps extends PanelProps {
  readonly provenance?: Provenance | undefined;
}

/** The tabs' id prefix: tab ids read `plan-tab-money`, panels `plan-panel-money`. */
export const WORKSPACE_ID_PREFIX = 'plan';

export function Workspace({ provenance, ...props }: WorkspaceProps): ReactElement {
  const panelProps = { ...props, narrationLang: writtenLang(provenance, props.context.language) };
  const { plan, narrationState } = panelProps;
  const { tab, tool, selectTab, toggleTool } = useWorkspaceHash();
  return (
    <article className="workspace" aria-labelledby={PLAN_HEADING_ID}>
      <header className="workspace__header">
        <p className="eyebrow">Your plan</p>
        <h2 id={PLAN_HEADING_ID} className="workspace__title" tabIndex={-1}>
          {plan.title}
        </h2>
        <p className="workspace__headline">{plan.verdict.headline}</p>
        <div className="workspace__meta">
          <ProvenanceBadge state={narrationState} provenance={provenance} />
          <EstimateNote sources={plan.sources} />
        </div>
      </header>
      <WorkspaceTools openTool={tool} onToggle={toggleTool} panelProps={panelProps} />
      <Tabs
        idPrefix={WORKSPACE_ID_PREFIX}
        label="Plan sections"
        className="tabs--sticky workspace__tabs"
        items={buildWorkspaceTabs(panelProps, provenance)}
        selectedId={tab}
        onSelect={selectTab}
      />
    </article>
  );
}
