/**
 * Responsibility: the workspace — the plan's focusable heading, provenance and estimates note;
 * WAI-ARIA tabs Overview · Money · Timeline · Vendors · People · Ideas · Safety · Share in that
 * order, each panel loading lazily on first visit and the choice written to the URL hash; a
 * `#tab` link opens that tab; What if and Ask open as disclosures from any tab.
 * Boundary: plans from the engine; the lazily loaded panels are the real ones.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { estimateNoteText } from '../../../components/features/common/EstimateNote';
import { provenanceText } from '../../../components/features/common/ProvenanceBadge';
import { WORKSPACE_TAB_LABELS, WORKSPACE_TABS } from '../../../components/features/panel-props';
import { Workspace } from '../../../components/features/workspace/Workspace';
import { TOOL_INFO } from '../../../components/features/workspace/WorkspaceTools';
import { PLAN_HEADING_ID } from '../../../lib/plan-state';
import { GEMINI_PROVENANCE, panelProps } from '../plan-fixtures';

const props = panelProps('jaipur-wedding', { narrationState: 'ready' });

/** A lazy panel's chunk is transformed on first import, which is slow in a loaded test run. */
const LAZY_PANEL_TIMEOUT_MS = 5000;
/** Room for the lazy import plus the clicks around it. */
const FLOW_TEST_TIMEOUT_MS = 15_000;

function renderWorkspace(): void {
  render(<Workspace {...props} provenance={GEMINI_PROVENANCE} />);
}

afterEach(() => {
  window.history.replaceState(null, '', '#');
});

describe('Workspace', () => {
  it('heads the plan with a focusable title, its provenance and the estimates note', () => {
    renderWorkspace();
    const heading = screen.getByRole('heading', { level: 2, name: props.plan.title });
    expect(heading).toHaveAttribute('id', PLAN_HEADING_ID);
    expect(heading).toHaveAttribute('tabindex', '-1');
    expect(screen.getAllByText(provenanceText('ready', GEMINI_PROVENANCE)).length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText(estimateNoteText(props.plan.sources))).toBeInTheDocument();
  });

  it('lists the eight tabs in order with Overview selected', () => {
    renderWorkspace();
    const tablist = screen.getByRole('tablist', { name: 'Plan sections' });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(
      WORKSPACE_TABS.map((tab) => WORKSPACE_TAB_LABELS[tab]),
    );
    expect(within(tablist).getByRole('tab', { name: 'Overview' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tabpanel', { name: 'Overview' })).toBeInTheDocument();
  });

  it.each(WORKSPACE_TABS.filter((tab) => tab !== 'overview'))(
    'loads the %s panel on first visit and records it in the hash',
    async (tab) => {
      const user = userEvent.setup();
      renderWorkspace();
      const label = WORKSPACE_TAB_LABELS[tab];
      await user.click(screen.getByRole('tab', { name: label }));
      const panel = screen.getByRole('tabpanel', { name: label });
      const heading = within(panel).findByRole(
        'heading',
        { level: 2, name: label },
        { timeout: LAZY_PANEL_TIMEOUT_MS },
      );
      expect(await heading).toBeInTheDocument();
      expect(window.location.hash).toBe(`#${tab}`);
    },
    FLOW_TEST_TIMEOUT_MS,
  );

  it(
    'opens the tab a #link names',
    async () => {
      window.history.replaceState(null, '', '#vendors');
      renderWorkspace();
      expect(screen.getByRole('tab', { name: 'Vendors' })).toHaveAttribute('aria-selected', 'true');
      const panel = screen.getByRole('tabpanel', { name: 'Vendors' });
      const heading = within(panel).findByRole(
        'heading',
        { level: 2, name: 'Vendors' },
        { timeout: LAZY_PANEL_TIMEOUT_MS },
      );
      expect(await heading).toBeInTheDocument();
    },
    FLOW_TEST_TIMEOUT_MS,
  );

  it('moves between tabs with the arrow keys', async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await user.click(screen.getByRole('tab', { name: 'Overview' }));
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Money' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Money' })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('tools for every tab', () => {
  it.each(['what-if', 'ask'] as const)('opens and closes %s as a disclosure', async (tool) => {
    const user = userEvent.setup();
    renderWorkspace();
    const { label } = TOOL_INFO[tool];
    const button = screen.getByRole('button', { name: label });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region', { name: label })).not.toBeInTheDocument();
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: label })).toBeInTheDocument();
    expect(window.location.hash).toBe(`#${tool}`);
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens a tool a #link names', () => {
    window.history.replaceState(null, '', '#ask');
    renderWorkspace();
    expect(screen.getByRole('button', { name: TOOL_INFO.ask.label })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});
