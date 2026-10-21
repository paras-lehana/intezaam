/**
 * Responsibility: the What-if tool speaks once — a slider move is summarised in one live
 * region only after it settles, and each slider's readout stays quiet so screen readers do
 * not hear every step. Boundary: the expected sentence comes from `diffSummary` over
 * `simulatePatch` on the same sample plan; timers are faked, nothing is stubbed.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ContextPatch } from '@intezaam/core/schemas';
import { SETTLE_MS } from '../../../components/ui/use-settled-value';
import { diffSummary } from '../../../components/features/what-if/diff-summary';
import { simulatePatch } from '../../../components/features/what-if/simulate';
import { WhatIfDrawer } from '../../../components/features/what-if/WhatIfDrawer';
import { TEST_TODAY_ISO } from '../../helpers';
import { samplePanel } from '../panel-fixtures';

/** The guest move this test owns (a multiple of the slider's step of five). */
const FEWER = 50;

/** The tool's one announcer (each slider's `<output>` also has the status role, but is quiet). */
function spokenRegion(): HTMLElement {
  const [region, ...others] = screen
    .getAllByRole('status')
    .filter((element) => element.tagName !== 'OUTPUT');
  if (region === undefined || others.length > 0) throw new Error('one live summary expected');
  return region;
}

describe('WhatIfDrawer announcements', () => {
  it('speaks one summary once the slider settles, and the readout is not live', () => {
    vi.useFakeTimers();
    const setup = samplePanel('jaipur-wedding');
    render(<WhatIfDrawer {...setup.props} />);
    const slider = screen.getByLabelText('Guests');
    expect(spokenRegion()).toBeEmptyDOMElement();
    expect(slider.parentElement?.querySelector('output')).toHaveAttribute('aria-live', 'off');
    for (const step of [FEWER / 2, FEWER]) {
      fireEvent.change(slider, { target: { value: String(setup.context.guests - step) } });
    }
    const status = spokenRegion();
    expect(status).toBeEmptyDOMElement();
    act(() => {
      vi.advanceTimersByTime(SETTLE_MS);
    });
    const patch: ContextPatch = { ops: [{ op: 'setGuests', value: setup.context.guests - FEWER }] };
    const outcome = simulatePatch(setup.context, setup.plan, patch, TEST_TODAY_ISO);
    if (!outcome.ok) throw new Error(outcome.error);
    expect(status).toHaveTextContent(diffSummary(patch, outcome.value.diff));
  });
});
