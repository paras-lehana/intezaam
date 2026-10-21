/**
 * Style quiz (feature #30): eight A-or-B questions → style tags → a change to the plan.
 *
 * Responsibility: one radio pair per question (native radios in labelled fieldsets, so
 * arrow keys and screen readers work), the tags the answers add up to, and "Use this in my
 * plan", which sends the typed change (venue setting, top priority) through the engine.
 * Boundary: the patch is built in style-quiz.ts; nothing applies until the reader presses.
 */
import { type ReactElement, useState } from 'react';
import { STYLE_AXES, STYLE_QUIZ, STYLE_TAG_LABELS } from '@intezaam/core/domain';
import type { ContextPatch, EventContext } from '@intezaam/core/schemas';
import { ChoiceGroup } from '../../ui/ChoiceGroup';
import { PanelSection } from '../common/PanelSection';
import { describePatch } from '../what-if/describe-patch';
import { type QuizAnswer, answersFromTags, quizPatch, quizTags } from './style-quiz';

export interface StyleQuizProps {
  readonly context: EventContext;
  readonly onApplyPatch: (patch: ContextPatch) => void;
}

export function StyleQuiz({ context, onApplyPatch }: StyleQuizProps): ReactElement {
  const [answers, setAnswers] = useState(() => answersFromTags(context.styleTags));
  const tags = quizTags(answers);
  const patch = quizPatch(tags, context);
  return (
    <PanelSection
      id="ideas-quiz"
      title="Style quiz"
      lede="Eight quick choices. Your answers steer the ideas, and can set your venue and top budget priority."
    >
      <div className="quiz">
        {STYLE_AXES.map((axis) => {
          const pair = STYLE_QUIZ[axis];
          const options: { value: QuizAnswer; label: string }[] = [
            { value: 'a', label: STYLE_TAG_LABELS[pair.a] },
            { value: 'b', label: STYLE_TAG_LABELS[pair.b] },
          ];
          return (
            <ChoiceGroup
              key={axis}
              legend={pair.question}
              name={`quiz-${axis}`}
              variant="chips"
              options={options}
              value={answers[axis] ?? ''}
              onChange={(answer) => setAnswers((current) => ({ ...current, [axis]: answer }))}
            />
          );
        })}
      </div>
      <p aria-live="polite">
        {tags.length === 0
          ? 'Answer any of the questions to see your style.'
          : `Your style: ${tags.map((tag) => STYLE_TAG_LABELS[tag]).join(', ')}.`}
      </p>
      {patch === null ? null : (
        <div className="quiz__apply">
          <p>Using it changes: {describePatch(patch).join('; ')}.</p>
          <button type="button" className="button button--cta" onClick={() => onApplyPatch(patch)}>
            Use this style in my plan
          </button>
        </div>
      )}
    </PanelSection>
  );
}
