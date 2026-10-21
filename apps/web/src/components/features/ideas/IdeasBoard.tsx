/**
 * Personalised ideas board (feature #29): ideas within the plan's limits, filterable by
 * category, plus colour themes.
 *
 * Responsibility: show the narration's ideas (written by Gemini, or by the server's offline
 * idea library when no model answered — filtered by diet, season, setting and budget by
 * code) with a category filter, and the suggested themes, tagged with the narration's
 * language; say plainly when ideas are on their way or the server cannot be reached.
 * Boundary: display only; the plan itself never depends on ideas.
 */
import { type ReactElement, useState } from 'react';
import { IDEA_CATEGORIES, type IdeaCategory } from '@intezaam/core/domain';
import type { Narration } from '@intezaam/core/schemas';
import { ChoiceGroup } from '../../ui/ChoiceGroup';
import { PanelSection } from '../common/PanelSection';
import type { NarrationState } from '../panel-props';
import { IdeaCard } from './IdeaCard';
import { IDEA_CATEGORY_LABELS } from './idea-labels';

export interface IdeasBoardProps {
  readonly narration?: Narration | undefined;
  readonly narrationState: NarrationState;
  /** BCP-47 tag of the language the ideas are written in (the narration's). */
  readonly lang?: string | undefined;
}

type Filter = IdeaCategory | 'all';

export const IDEAS_WAITING = 'Ideas are on their way — they arrive with the plan’s explanation.';
export const IDEAS_UNREACHABLE =
  'Ideas come from our planning service, which cannot be reached right now. Your plan, budget and checklists still work.';

export function IdeasBoard({ narration, narrationState, lang }: IdeasBoardProps): ReactElement {
  const [filter, setFilter] = useState<Filter>('all');
  if (narration === undefined) {
    return (
      <PanelSection id="ideas-board" title="Ideas for you">
        <p role="status">{narrationState === 'offline' ? IDEAS_UNREACHABLE : IDEAS_WAITING}</p>
      </PanelSection>
    );
  }
  const present = IDEA_CATEGORIES.filter((category) =>
    narration.ideas.some((idea) => idea.category === category),
  );
  const options = [
    { value: 'all' as const, label: 'All' },
    ...present.map((category) => ({ value: category, label: IDEA_CATEGORY_LABELS[category] })),
  ];
  const shown = narration.ideas.filter((idea) => filter === 'all' || idea.category === filter);
  return (
    <PanelSection
      id="ideas-board"
      title="Ideas for you"
      lede="Picked to fit your budget, season, venue and menu. Cost bands come from your budget lines — never a price."
    >
      <ChoiceGroup
        legend="Show"
        name="idea-filter"
        variant="chips"
        options={options}
        value={filter}
        onChange={setFilter}
      />
      <ul className="plain-list ideas-grid" role="list" aria-live="polite">
        {shown.map((idea) => (
          <IdeaCard key={`${idea.category}-${idea.title}`} idea={idea} lang={lang} />
        ))}
      </ul>
      {narration.themes === undefined || narration.themes.length === 0 ? null : (
        <>
          <h4>Colour themes</h4>
          <ul className="plain-list ideas-themes" role="list">
            {narration.themes.map((theme) => (
              <li key={theme.name} className="chip" lang={lang}>
                <strong>{theme.name}</strong>: {theme.paletteWords.join(', ')}
              </li>
            ))}
          </ul>
        </>
      )}
    </PanelSection>
  );
}
