/**
 * The workspace's tab set: Overview · Money · Timeline · Vendors · People · Ideas · Safety ·
 * Share, each with its panel.
 *
 * Responsibility: one builder that turns the closed tab list into Tabs items, Overview
 * eager and the rest lazy inside Suspense with an announced fallback. Boundary: pure
 * (no state); the Workspace owns the selected tab.
 */
import { type ReactNode, Suspense } from 'react';
import type { Provenance } from '@intezaam/core/schemas';
import { LoadingFallback } from '../../ui/LoadingFallback';
import type { TabItem } from '../../ui/Tabs';
import { OverviewPanel } from '../overview/OverviewPanel';
import {
  type PanelProps,
  WORKSPACE_TAB_LABELS,
  WORKSPACE_TABS,
  type WorkspaceTab,
} from '../panel-props';
import { LAZY_TAB_PANELS } from './lazy-panels';

function panelFor(tab: WorkspaceTab, props: PanelProps, provenance?: Provenance): ReactNode {
  if (tab === 'overview') return <OverviewPanel {...props} provenance={provenance} />;
  const Panel = LAZY_TAB_PANELS[tab];
  return (
    <Suspense fallback={<LoadingFallback label={`Loading ${WORKSPACE_TAB_LABELS[tab]}…`} />}>
      <Panel {...props} />
    </Suspense>
  );
}

/**
 * The eight tabs in order, each with its panel.
 * @example
 * buildWorkspaceTabs(panelProps).map((tab) => tab.id); // ['overview', 'money', …, 'share']
 */
export function buildWorkspaceTabs(props: PanelProps, provenance?: Provenance): readonly TabItem[] {
  return WORKSPACE_TABS.map((tab) => ({
    id: tab,
    label: WORKSPACE_TAB_LABELS[tab],
    panel: panelFor(tab, props, provenance),
  }));
}
