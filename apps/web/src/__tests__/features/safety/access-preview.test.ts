/**
 * Responsibility: what ticking an access need does — the context carries exactly the ticked
 * needs, and the preview's checks and added or removed tasks are the engine's own re-plan
 * and diff. Boundary: expectations come from `buildPlan` and `diffPlans`.
 */
import { describe, expect, it } from 'vitest';
import type { AccessNeed } from '@intezaam/core/domain';
import { diffPlans } from '@intezaam/core/engine';
import { accessPreview, withNeeds } from '../../../components/features/safety/access-preview';
import { TEST_TODAY_ISO } from '../../helpers';
import { planFor, samplePanel } from '../panel-fixtures';

describe('withNeeds', () => {
  it('sets exactly the ticked needs', () => {
    const { context } = samplePanel('jaipur-wedding');
    expect(withNeeds(context, new Set<AccessNeed>(['wheelchair'])).accessibility).toEqual({
      elderly: false,
      wheelchair: true,
      kids: false,
    });
  });
});

describe('accessPreview', () => {
  it('changes nothing for the needs the plan already has', () => {
    const { plan, context } = samplePanel('chennai-60th');
    const preview = accessPreview(plan, context, TEST_TODAY_ISO, new Set(plan.accessibility.needs));
    expect(preview).toEqual({ items: plan.accessibility.items, addedTasks: [], removedTasks: [] });
  });

  it('reports the engine’s checks and task changes for a new need', () => {
    // The wedding planned with no needs ticked: ticking "elderly" brings in the venue task.
    const context = withNeeds(samplePanel('jaipur-wedding').context, new Set());
    const plan = planFor(context);
    const needs = new Set<AccessNeed>(['elderly']);
    const replanned = planFor(withNeeds(context, needs));
    const added = diffPlans(plan, replanned)
      .taskChanges.filter((change) => change.change === 'added')
      .map((change) => change.title);
    expect(added.length).toBeGreaterThan(0);
    expect(accessPreview(plan, context, TEST_TODAY_ISO, needs)).toEqual({
      items: replanned.accessibility.items,
      addedTasks: added,
      removedTasks: [],
    });
  });
});
