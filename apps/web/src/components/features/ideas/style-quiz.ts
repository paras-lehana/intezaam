/**
 * The 8-pair style quiz (feature #30): answers → style tags → a typed change to the plan.
 *
 * Responsibility: read the quiz answers (A or B per axis of core's STYLE_QUIZ) into style
 * tags, start from the tags the reader already chose, and turn the tags that cost money
 * into a ContextPatch the engine can apply: "under the sky / under a roof" sets the venue,
 * and the first style that leans on one budget line makes that line a top priority (the
 * BUD-05 priority shift). Boundary: pure; the panel shows the questions and applies.
 */
import {
  STYLE_AXES,
  STYLE_QUIZ,
  type RankableCategory,
  type StyleAxis,
  type StyleTag,
  type VenueSetting,
} from '@intezaam/core/domain';
import type { ContextPatch, EventContext, PatchOp } from '@intezaam/core/schemas';

export type QuizAnswer = 'a' | 'b';

export type QuizAnswers = Readonly<Partial<Record<StyleAxis, QuizAnswer>>>;

/**
 * Styles that lean on one budget line (our mapping, a planning judgement): flowers on decor,
 * a grand scale on the venue, a royal look on outfits, quirky fun on entertainment, and the
 * food answers on catering. Other tags change the ideas, not the money.
 */
const STYLE_PRIORITY: Readonly<Partial<Record<StyleTag, RankableCategory>>> = {
  floral: 'decor',
  grand: 'venue',
  royal: 'attire',
  quirky: 'entertainment',
  regional: 'catering',
  fusion: 'catering',
};

/** The setting question maps straight onto the venue setting. */
const STYLE_SETTING: Readonly<Partial<Record<StyleTag, VenueSetting>>> = {
  outdoor: 'outdoor',
  indoor: 'indoor',
};

/**
 * Answers already implied by the reader's chosen style tags.
 * @example
 * answersFromTags(['royal', 'floral']); // { decor: 'a', mood: 'a' }
 */
export function answersFromTags(tags: readonly StyleTag[]): QuizAnswers {
  const answers: Partial<Record<StyleAxis, QuizAnswer>> = {};
  for (const axis of STYLE_AXES) {
    const pair = STYLE_QUIZ[axis];
    if (tags.includes(pair.a)) answers[axis] = 'a';
    else if (tags.includes(pair.b)) answers[axis] = 'b';
  }
  return answers;
}

/**
 * The style tags the answers stand for, in quiz order.
 * @example
 * quizTags({ tradition: 'a', setting: 'b' }); // ['traditional', 'indoor']
 */
export function quizTags(answers: QuizAnswers): StyleTag[] {
  return STYLE_AXES.flatMap((axis) => {
    const answer = answers[axis];
    return answer === undefined ? [] : [STYLE_QUIZ[axis][answer]];
  });
}

/**
 * The plan change the tags imply, or null when the plan already matches them.
 * @example
 * quizPatch(['floral', 'outdoor'], context); // { ops: [{ op: 'setVenueSetting', value: 'outdoor' }, { op: 'setPriority', value: 'decor' }] }
 */
export function quizPatch(tags: readonly StyleTag[], context: EventContext): ContextPatch | null {
  const ops: PatchOp[] = [];
  const setting = tags.map((tag) => STYLE_SETTING[tag]).find((value) => value !== undefined);
  if (setting !== undefined && setting !== context.venueSetting) {
    ops.push({ op: 'setVenueSetting', value: setting });
  }
  const priority = tags.map((tag) => STYLE_PRIORITY[tag]).find((value) => value !== undefined);
  if (priority !== undefined && context.priorities[0] !== priority) {
    ops.push({ op: 'setPriority', value: priority });
  }
  return ops.length === 0 ? null : { ops };
}
