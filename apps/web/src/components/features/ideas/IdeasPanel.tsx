/**
 * The Ideas tab: personalised ideas, the style quiz, wedding hashtags and
 * the invitation and message studio.
 *
 * Responsibility: compose the creative side of the plan — ideas the model writes inside
 * limits code sets, a quiz that can steer the plan, hashtags for couples and drafted
 * messages in 11 languages. Boundary: composition only; money and dates stay the engine's.
 */
import type { ReactElement } from 'react';
import { PanelHeader } from '../common/PanelHeader';
import type { PanelProps } from '../panel-props';
import { HashtagMaker } from './HashtagMaker';
import { IdeasBoard } from './IdeasBoard';
import { MessageStudio } from './MessageStudio';
import { StyleQuiz } from './StyleQuiz';
import './ideas.css';

export function IdeasPanel({
  plan,
  context,
  todayIso,
  onApplyPatch,
  narration,
  narrationState,
  narrationLang,
  hinglish,
}: PanelProps): ReactElement {
  return (
    <div className="ideas">
      <PanelHeader title="Ideas">
        Themes, decor, menu, activities and favours that fit your budget, season and style — and the
        messages to send.
      </PanelHeader>
      <IdeasBoard narration={narration} narrationState={narrationState} lang={narrationLang} />
      <StyleQuiz context={context} onApplyPatch={onApplyPatch} />
      {plan.contextEcho.family === 'wedding' ? <HashtagMaker /> : null}
      <MessageStudio plan={plan} context={context} todayIso={todayIso} hinglish={hinglish} />
    </div>
  );
}
