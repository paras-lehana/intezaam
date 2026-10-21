/**
 * Responsibility: the style quiz as data — answers implied by the tags a family already
 * chose, the tags answers stand for, and the typed change the tags imply (venue setting,
 * top priority), which core's `applyPatch` accepts. Boundary: pure; the radios are tested
 * with the panel.
 */
import { describe, expect, it } from 'vitest';
import { STYLE_AXES, STYLE_QUIZ } from '@intezaam/core/domain';
import { applyPatch } from '@intezaam/core/engine';
import { contextPatchSchema } from '@intezaam/core/schemas';
import {
  answersFromTags,
  quizPatch,
  quizTags,
} from '../../../components/features/ideas/style-quiz';
import { samplePanel } from '../panel-fixtures';

const QUIZ_TAGS = new Set(STYLE_AXES.flatMap((axis) => [STYLE_QUIZ[axis].a, STYLE_QUIZ[axis].b]));

describe('answersFromTags and quizTags', () => {
  it('round-trip the quiz tags a family already chose', () => {
    const { context } = samplePanel('jaipur-wedding');
    const chosen = context.styleTags.filter((tag) => QUIZ_TAGS.has(tag));
    expect(chosen.length).toBeGreaterThan(0);
    expect([...quizTags(answersFromTags(context.styleTags))].sort()).toEqual([...chosen].sort());
  });

  it('give one tag per answered axis, in quiz order', () => {
    expect(quizTags({ setting: 'b', tradition: 'a' })).toEqual([
      STYLE_QUIZ.tradition.a,
      STYLE_QUIZ.setting.b,
    ]);
    expect(quizTags({})).toEqual([]);
  });
});

describe('quizPatch', () => {
  it('sets the venue and the top priority the tags lean on', () => {
    const { context } = samplePanel('jaipur-wedding');
    const patch = quizPatch(['floral', 'outdoor'], context);
    expect(patch?.ops).toEqual([
      { op: 'setVenueSetting', value: 'outdoor' },
      { op: 'setPriority', value: 'decor' },
    ]);
    expect(contextPatchSchema.safeParse(patch).success).toBe(true);
    if (patch === null) return;
    const applied = applyPatch(context, patch);
    expect(applied.venueSetting).toBe('outdoor');
    expect(applied.priorities[0]).toBe('decor');
  });

  it('is null when the plan already matches the tags, or they cost nothing', () => {
    const { context } = samplePanel('jaipur-wedding');
    const matching = {
      ...context,
      venueSetting: 'indoor' as const,
      priorities: ['venue' as const],
    };
    expect(quizPatch(['indoor', 'grand'], matching)).toBeNull();
    expect(quizPatch(['pastel', 'classic'], context)).toBeNull();
  });
});
