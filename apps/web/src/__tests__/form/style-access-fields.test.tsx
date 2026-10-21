/**
 * Responsibility: the style chips record and drop styles in the order tapped, and the three
 * access needs are each recorded on their own switch. Boundary: rendered alone in the section
 * harness; labels come from core's style and access tables and the limit from core's schema
 * (the cap itself is exercised through the whole form in priority-fields.test.tsx).
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

  it('ticks each access need on its own switch', async () => {
    const { user, latest } = renderSection(StyleAccessFields);
    await user.click(screen.getByRole('checkbox', { name: ACCESS_NEED_LABELS.wheelchair }));
    expect(latest().accessibility).toEqual({
      ...EMPTY_FORM_STATE.accessibility,
      wheelchair: true,
    });
  });
});
