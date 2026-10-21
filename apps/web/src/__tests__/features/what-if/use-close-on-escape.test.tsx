/**
 * Responsibility: keyboard behaviour of the two tools inside the real workspace wiring —
 * Escape anywhere in What if or Ask closes it through its disclosure button and puts focus
 * back on that button; outside the workspace (no controlling button) Escape changes
 * nothing. Boundary: the workspace's WorkspaceTools is used as-is; only state is a harness.
 */
import { type ReactElement, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { PanelProps } from '../../../components/features/panel-props';
import { controllerOf } from '../../../components/features/what-if/use-close-on-escape';
import { WhatIfDrawer } from '../../../components/features/what-if/WhatIfDrawer';
import type { WorkspaceTool } from '../../../components/features/workspace/use-workspace-hash';
import { WorkspaceTools } from '../../../components/features/workspace/WorkspaceTools';
import { samplePanel } from '../panel-fixtures';

interface ToolsHarnessProps {
  readonly panelProps: PanelProps;
}

/** The workspace's tools with the open/closed state the plan page normally keeps. */
function ToolsHarness({ panelProps }: ToolsHarnessProps): ReactElement {
  const [tool, setTool] = useState<WorkspaceTool | null>(null);
  return (
    <WorkspaceTools
      openTool={tool}
      onToggle={(next) => setTool((open) => (open === next ? null : next))}
      panelProps={panelProps}
    />
  );
}

describe('Escape closes a tool', () => {
  it('closes What if and returns focus to its button', async () => {
    const user = userEvent.setup();
    render(<ToolsHarness panelProps={samplePanel('jaipur-wedding').props} />);
    const button = screen.getByRole('button', { name: 'What if…' });
    await user.click(button);
    await user.click(await screen.findByLabelText('Guests'));
    expect(button).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
    expect(document.getElementById('what-if')).not.toBeVisible();
  });

  it('closes Ask from inside the question box', async () => {
    const user = userEvent.setup();
    render(<ToolsHarness panelProps={samplePanel('bengaluru-birthday').props} />);
    const button = screen.getByRole('button', { name: 'Ask Intezaam' });
    await user.click(button);
    await user.click(await screen.findByLabelText(/Your question/));
    await user.keyboard('{Escape}');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });

  it('leaves focus alone when the tool is not inside the workspace', async () => {
    const user = userEvent.setup();
    render(<WhatIfDrawer {...samplePanel('jaipur-wedding').props} />);
    const slider = screen.getByLabelText('Guests');
    await user.click(slider);
    await user.keyboard('{Escape}');
    expect(slider).toHaveFocus();
    expect(controllerOf(slider)).toBeNull();
  });
});
