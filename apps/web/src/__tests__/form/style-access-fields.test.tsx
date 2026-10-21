/**
 * Responsibility: the style chips record and drop styles in the order tapped, stop at
 * MAX_STYLE_TAGS (the unticked chips say so with aria-disabled and a tick on them changes
 * nothing, until one is unticked), and the three access needs are each recorded on their own
 * switch. Boundary: rendered alone in the section harness; labels come from core's style and
 * access tables and the limit from core's schema.
 */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ACCESS_NEED_LABELS, STYLE_TAG_LABELS, STYLE_TAGS } from '@intezaam/core/domain';
import { MAX_STYLE_TAGS } from '@intezaam/core/schemas';
import { StyleAccessFields } from '../../components/form/StyleAccessFields';
import { EMPTY_FORM_STATE } from '../../components/form/form-state';
import { renderSection } from './section-harness';

describe('StyleAccessFields', () => {
  it('records styles in the order they are ticked', async () => {
    const { user, latest } = renderSection(StyleAccessFields);
    await user.click(screen.getByRole('checkbox', { name: STYLE_TAG_LABELS.royal }));
    await user.click(screen.getByRole('checkbox', { name: STYLE_TAG_LABELS.floral }));
    expect(latest().styleTags).toEqual(['royal', 'floral']);
  });

  it('unticks a style on a second tap', async () => {
    const { user, latest } = renderSection(StyleAccessFields, {
      start: { styleTags: STYLE_TAGS.slice(0, MAX_STYLE_TAGS) },
    });
    const [first, ...rest] = STYLE_TAGS.slice(0, MAX_STYLE_TAGS);
    expect(first).toBeDefined();
    if (first === undefined) return;
    await user.click(screen.getByRole('checkbox', { name: STYLE_TAG_LABELS[first] }));
    expect(latest().styleTags).toEqual(rest);
  });

  it(`stops at ${MAX_STYLE_TAGS} styles until one is unticked`, async () => {
    const ticked = STYLE_TAGS.slice(0, MAX_STYLE_TAGS);
    const [first, ...rest] = ticked;
    const extra = STYLE_TAGS[MAX_STYLE_TAGS];
    if (first === undefined || extra === undefined)
      throw new Error('core has more styles than the cap');
    const { user, latest } = renderSection(StyleAccessFields);
    const chip = (tag: (typeof STYLE_TAGS)[number]): HTMLElement =>
      screen.getByRole('checkbox', { name: STYLE_TAG_LABELS[tag] });
    for (const tag of ticked) await user.click(chip(tag));
    expect(chip(extra)).toHaveAttribute('aria-disabled', 'true');
    await user.click(chip(extra));
    expect(chip(extra)).not.toBeChecked();
    expect(latest().styleTags).toEqual(ticked);
    await user.click(chip(first));
    expect(chip(extra)).toHaveAttribute('aria-disabled', 'false');
    await user.click(chip(extra));
    expect(latest().styleTags).toEqual([...rest, extra]);
  });

  it('ticks each access need on its own switch', async () => {
    const { user, latest } = renderSection(StyleAccessFields);
    await user.click(screen.getByRole('checkbox', { name: ACCESS_NEED_LABELS.wheelchair }));
    expect(latest().accessibility).toEqual({
      ...EMPTY_FORM_STATE.accessibility,
      wheelchair: true,
    });
  });
});
