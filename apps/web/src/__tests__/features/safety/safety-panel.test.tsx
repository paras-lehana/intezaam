/**
 * Responsibility: the Safety tab — permissions (blockers first, authority, timing, a real
 * checkbox each, "verify locally"), crowd checks by footfall, the risk radar most severe
 * first with severity in words, and the accessibility plan whose ticked needs preview the
 * tasks they add. Boundary: every expectation is read from the engine's plan for a sample.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ACCESS_NEED_LABELS, VERIFY_LOCALLY_NOTE } from '@intezaam/core/domain';
import { SEVERITY_ORDER, SEVERITY_STYLES } from '../../../components/features/common/SeverityLabel';
import { accessPreview, withNeeds } from '../../../components/features/safety/access-preview';
import { CROWD_CLASS_TEXT } from '../../../components/features/safety/CrowdSafety';
import { SafetyPanel } from '../../../components/features/safety/SafetyPanel';
import { TEST_TODAY_ISO } from '../../helpers';
import { planFor, samplePanel } from '../panel-fixtures';

describe('SafetyPanel permissions', () => {
  it('lists every permission with its authority and timing, blockers first', () => {
    const { plan, props } = samplePanel('jaipur-wedding');
    render(<SafetyPanel {...props} />);
    const section = screen.getByRole('region', { name: 'Permissions' });
    expect(section).toHaveTextContent(VERIFY_LOCALLY_NOTE);
    const boxes = within(section).getAllByRole('checkbox');
    expect(boxes).toHaveLength(plan.permissions.length);
    const blocker = plan.permissions.find((permission) => permission.blocker);
    if (blocker === undefined) throw new Error('the wedding sample has the night-sound blocker');
    expect(boxes[0]).toHaveAccessibleName(blocker.title);
    expect(boxes[0]?.closest('li')).toHaveTextContent(SEVERITY_STYLES.blocker.label);
    for (const permission of plan.permissions) {
      const box = within(section).getByRole('checkbox', { name: permission.title });
      const item = box.closest('li');
      expect(item).toHaveTextContent(permission.authority);
      expect(item).toHaveTextContent(permission.when);
    }
  });

  it('counts what has been ticked off', async () => {
    const user = userEvent.setup();
    const { plan, props } = samplePanel('society-ganesh');
    const first = plan.permissions[0];
    if (first === undefined) throw new Error('the society sample needs permissions');
    render(<SafetyPanel {...props} />);
    await user.click(screen.getByRole('checkbox', { name: first.title }));
    expect(screen.getByText(`1 of ${plan.permissions.length} ticked off.`)).toBeInTheDocument();
  });
});

describe('SafetyPanel crowd and risks', () => {
  it('shows the footfall, its crowd class and every check switched on', () => {
    const { plan, props } = samplePanel('society-ganesh');
    render(<SafetyPanel {...props} />);
    const section = screen.getByRole('region', { name: 'Crowd safety' });
    expect(section).toHaveTextContent(String(plan.crowd.footfall));
    expect(section).toHaveTextContent(CROWD_CLASS_TEXT[plan.crowd.crowdClass]);
    for (const check of plan.crowd.checks)
      expect(within(section).getByText(check.title)).toBeInTheDocument();
  });

  it('puts the most severe risks first, each with severity in words, cause and fix', () => {
    const { plan, props } = samplePanel('jaipur-wedding');
    render(<SafetyPanel {...props} />);
    const section = screen.getByRole('region', { name: 'Risk radar' });
    const titles = within(section)
      .getAllByRole('heading', { level: 4 })
      .map((heading) => heading.textContent);
    const ordered = [...plan.risks].sort(
      (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
    );
    expect(titles).toEqual(ordered.map((risk) => risk.title));
    for (const risk of plan.risks) {
      const item = within(section).getByRole('heading', { name: risk.title }).closest('li');
      expect(item).toHaveTextContent(SEVERITY_STYLES[risk.severity].label);
      expect(item).toHaveTextContent(risk.detail);
      expect(item).toHaveTextContent(risk.fix);
    }
  });
});

describe('SafetyPanel accessibility plan', () => {
  it('previews the tasks a newly ticked need adds', async () => {
    const user = userEvent.setup();
    // The wedding planned with no access needs ticked, so ticking "elderly" adds the venue task.
    const wedding = samplePanel('jaipur-wedding');
    const context = withNeeds(wedding.context, new Set());
    const plan = planFor(context);
    render(<SafetyPanel {...wedding.props} context={context} plan={plan} />);
    await user.click(screen.getByRole('checkbox', { name: ACCESS_NEED_LABELS.elderly }));
    const preview = accessPreview(plan, context, TEST_TODAY_ISO, new Set(['elderly']));
    expect(preview?.addedTasks.length).toBeGreaterThan(0);
    for (const title of preview?.addedTasks ?? [])
      expect(screen.getByText(title)).toBeInTheDocument();
    for (const item of preview?.items ?? [])
      expect(screen.getByRole('heading', { name: item.title })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Your details' })).toHaveAttribute('href', '#details');
  });
});
