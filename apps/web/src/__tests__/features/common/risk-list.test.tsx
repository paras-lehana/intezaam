/**
 * Responsibility: the shared risk list renders risks in the order given, each as an h4 with
 * its severity in words, cause, fix and a "Why this?" button, inside the caller's list and
 * item classes — and a plain line when there are none. Boundary: risks come from a plan the
 * engine built; nothing is typed by hand.
 */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RiskList } from '../../../components/features/common/RiskList';
import { SEVERITY_STYLES } from '../../../components/features/common/SeverityLabel';
import { WHY_THIS } from '../../../components/features/common/TraceDisclosure';
import { traceItemsFor } from '../../../components/features/common/trace-lookup';
import { samplePlan } from '../plan-fixtures';

const { plan } = samplePlan('jaipur-wedding');
const LAYOUT_CLASS = 'risk-list';
const ITEM_CLASS = 'edge-card';

describe('RiskList', () => {
  it('keeps the caller order and shows severity, cause, fix and "Why this?"', () => {
    const risks = [...plan.risks].reverse();
    expect(risks.length).toBeGreaterThan(1);
    render(<RiskList plan={plan} risks={risks} className={LAYOUT_CLASS} />);
    const list = screen.getByRole('list');
    expect(list).toHaveClass('plain-list', LAYOUT_CLASS);
    const titles = within(list)
      .getAllByRole('heading', { level: 4 })
      .map((heading) => heading.textContent);
    expect(titles).toEqual(risks.map((risk) => risk.title));
    for (const risk of risks) {
      const item = within(list).getByRole('heading', { name: risk.title }).closest('li');
      expect(item).toHaveClass(`risk--${risk.severity}`);
      expect(item).toHaveTextContent(SEVERITY_STYLES[risk.severity].label);
      expect(item).toHaveTextContent(`Cause: ${risk.detail}`);
      expect(item).toHaveTextContent(`Fix: ${risk.fix}`);
      const explained = traceItemsFor(plan, risk.traceIds).length > 0;
      const why = within(item ?? list).queryByRole('button', { name: `${WHY_THIS} ${risk.title}` });
      expect(why !== null).toBe(explained);
    }
  });

  it('adds the caller surface to every item', () => {
    render(
      <RiskList
        plan={plan}
        risks={plan.risks}
        className={LAYOUT_CLASS}
        itemClassName={ITEM_CLASS}
      />,
    );
    for (const risk of plan.risks) {
      const item = screen.getByRole('heading', { name: risk.title }).closest('li');
      expect(item).toHaveClass('risk', ITEM_CLASS);
    }
  });

  it('says so plainly when there are no risks', () => {
    render(<RiskList plan={plan} risks={[]} className={LAYOUT_CLASS} />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByText('No risks found for this plan as described.')).toBeInTheDocument();
  });
});
