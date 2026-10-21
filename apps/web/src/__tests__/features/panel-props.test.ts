/**
 * Responsibility: the plan anchors — every workspace tab is an anchor, every anchor has a
 * label, and a URL hash narrows to a known anchor or to nothing. Boundary: pure data checks;
 * panels themselves are tested with the features work.
 */
import { describe, expect, it } from 'vitest';
import {
  PLAN_ANCHOR_LABELS,
  PLAN_ANCHORS,
  WORKSPACE_TABS,
  planAnchorFromHash,
} from '../../components/features/panel-props';

describe('plan anchors', () => {
  it('include the details form, every tab and the two tools', () => {
    expect(PLAN_ANCHORS).toEqual(['details', ...WORKSPACE_TABS, 'what-if', 'ask']);
    for (const anchor of PLAN_ANCHORS) expect(PLAN_ANCHOR_LABELS[anchor].length).toBeGreaterThan(0);
  });

  it('narrow a hash with or without the #', () => {
    expect(planAnchorFromHash('#money')).toBe('money');
    expect(planAnchorFromHash('what-if')).toBe('what-if');
    expect(planAnchorFromHash('#nowhere')).toBeUndefined();
    expect(planAnchorFromHash('')).toBeUndefined();
  });
});
