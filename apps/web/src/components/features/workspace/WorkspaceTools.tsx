/**
 * What if and Ask Intezaam: the two tools reachable from every tab.
 *
 * Responsibility: two disclosure buttons (aria-expanded + aria-controls) above the tabs,
 * each revealing its drawer in place — non-modal, so the plan stays readable beside the
 * answer. A drawer mounts the first time it opens and then stays mounted, so a question
 * asked or a what-if set up survives closing and reopening. Boundary: the drawers
 * themselves are separate features loaded lazily.
 */
import { type ReactElement, Suspense, useState } from 'react';
import { Icon, type IconName } from '../../ui/Icon';
import { LoadingFallback } from '../../ui/LoadingFallback';
import type { PanelProps } from '../panel-props';
import { LAZY_TOOLS } from './lazy-panels';
import { WORKSPACE_TOOLS, type WorkspaceTool } from './use-workspace-hash';

interface ToolInfo {
  readonly label: string;
  readonly icon: IconName;
}

export const TOOL_INFO: Readonly<Record<WorkspaceTool, ToolInfo>> = {
  'what-if': { label: 'What if…', icon: 'sparkle' },
  ask: { label: 'Ask Intezaam', icon: 'chat' },
};

export interface WorkspaceToolsProps {
  readonly openTool: WorkspaceTool | null;
  readonly onToggle: (tool: WorkspaceTool) => void;
  readonly panelProps: PanelProps;
}

export function WorkspaceTools({
  openTool,
  onToggle,
  panelProps,
}: WorkspaceToolsProps): ReactElement {
  const [opened, setOpened] = useState<ReadonlySet<WorkspaceTool>>(() => new Set());
  // Adjusting state while rendering (React's documented pattern): a tool opened by a link
  // or a click must mount in this same render.
  if (openTool !== null && !opened.has(openTool)) setOpened(new Set([...opened, openTool]));

  return (
    <div className="workspace-tools">
      <div className="workspace-tools__buttons" role="group" aria-label="Tools for every tab">
        {WORKSPACE_TOOLS.map((tool) => (
          <button
            key={tool}
            type="button"
            className="button button--secondary workspace-tools__button"
            aria-expanded={openTool === tool}
            aria-controls={tool}
            onClick={() => onToggle(tool)}
          >
            <Icon name={TOOL_INFO[tool].icon} />
            {TOOL_INFO[tool].label}
          </button>
        ))}
      </div>
      {WORKSPACE_TOOLS.map((tool) => {
        const Drawer = LAZY_TOOLS[tool];
        return (
          <section
            key={tool}
            id={tool}
            className="workspace-drawer card"
            aria-label={TOOL_INFO[tool].label}
            hidden={openTool !== tool}
          >
            {opened.has(tool) || openTool === tool ? (
              <Suspense fallback={<LoadingFallback label={`Loading ${TOOL_INFO[tool].label}`} />}>
                <Drawer {...panelProps} />
              </Suspense>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
