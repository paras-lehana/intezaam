/**
 * Which workspace tab and which tool (What if, Ask) are open — kept in the URL hash.
 *
 * Responsibility: open the tab or tool a `/plan#money` or `/plan#what-if` link names (the
 * home page's feature tiles use these), follow later hash changes, and write the current
 * tab back to the hash so a reload or a copied link lands in the same place. Boundary: the
 * hash is replaced, not pushed — switching tabs must not fill the Back button's history.
 */
import { useEffect, useState } from 'react';
import {
  type PlanAnchor,
  type WorkspaceTab,
  WORKSPACE_TABS,
  planAnchorFromHash,
} from '../panel-props';

/** The two tools reachable from every tab. */
export const WORKSPACE_TOOLS = ['what-if', 'ask'] as const;

export type WorkspaceTool = (typeof WORKSPACE_TOOLS)[number];

export interface WorkspaceHash {
  readonly tab: WorkspaceTab;
  readonly tool: WorkspaceTool | null;
  readonly selectTab: (id: string) => void;
  readonly toggleTool: (tool: WorkspaceTool) => void;
}

function currentAnchor(): PlanAnchor | undefined {
  return planAnchorFromHash(window.location.hash);
}

/**
 * The tab an anchor names, if it names one.
 * @example
 * tabFromAnchor('money'); // 'money'
 * tabFromAnchor('ask'); // undefined
 */
export function tabFromAnchor(anchor: PlanAnchor | undefined): WorkspaceTab | undefined {
  return WORKSPACE_TABS.find((tab) => tab === anchor);
}

/**
 * The tool an anchor names, if it names one.
 * @example
 * toolFromAnchor('what-if'); // 'what-if'
 */
export function toolFromAnchor(anchor: PlanAnchor | undefined): WorkspaceTool | undefined {
  return WORKSPACE_TOOLS.find((tool) => tool === anchor);
}

function writeAnchor(anchor: PlanAnchor): void {
  window.history.replaceState(window.history.state, '', `#${anchor}`);
}

/**
 * Tab and tool state mirrored in the URL hash.
 * @example
 * const { tab, selectTab } = useWorkspaceHash();
 */
export function useWorkspaceHash(): WorkspaceHash {
  const [tab, setTab] = useState<WorkspaceTab>(() => tabFromAnchor(currentAnchor()) ?? 'overview');
  const [tool, setTool] = useState<WorkspaceTool | null>(
    () => toolFromAnchor(currentAnchor()) ?? null,
  );

  useEffect(() => {
    function followHash(): void {
      const anchor = currentAnchor();
      const nextTab = tabFromAnchor(anchor);
      const nextTool = toolFromAnchor(anchor);
      if (nextTab !== undefined) setTab(nextTab);
      if (nextTool !== undefined) setTool(nextTool);
    }
    window.addEventListener('hashchange', followHash);
    return () => window.removeEventListener('hashchange', followHash);
  }, []);

  function selectTab(id: string): void {
    const next = WORKSPACE_TABS.find((known) => known === id);
    if (next === undefined) return;
    setTab(next);
    writeAnchor(next);
  }

  function toggleTool(next: WorkspaceTool): void {
    const open = tool === next ? null : next;
    setTool(open);
    if (open !== null) writeAnchor(open);
  }

  return { tab, tool, selectTab, toggleTool };
}
