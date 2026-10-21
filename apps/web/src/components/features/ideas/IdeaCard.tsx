/**
 * One personalised idea: what it is, its cost band, effort, eco tag, why it fits you and a
 * YouTube search for a how-to.
 *
 * Responsibility: show an idea from the narration with the cost band CODE attached (never a
 * rupee amount from the model) and a YouTube link rebuilt here with core
 * `buildYoutubeSearchUrl`, so only a youtube.com search can ever be linked. The idea's own
 * words carry `lang` (the narration's language); the English labels around them do not.
 * Boundary: display only.
 */
import type { ReactElement } from 'react';
import { COST_BAND_LABELS } from '@intezaam/core/domain';
import { buildYoutubeSearchUrl } from '@intezaam/core/integrations';
import type { Idea } from '@intezaam/core/schemas';
import {
  COST_BAND_GLYPHS,
  EFFORT_LABELS,
  IDEA_CATEGORY_LABELS,
  SIGNAL_LABELS,
} from './idea-labels';

export interface IdeaCardProps {
  readonly idea: Idea;
  /** BCP-47 tag of the language the idea is written in. */
  readonly lang?: string | undefined;
}

export function IdeaCard({ idea, lang }: IdeaCardProps): ReactElement {
  return (
    <li className="idea panel-soft stack">
      <p className="idea__category">{IDEA_CATEGORY_LABELS[idea.category]}</p>
      <h4 className="idea__title" lang={lang}>
        {idea.title}
      </h4>
      <ul className="plain-list idea__tags" role="list" aria-label="About this idea">
        <li className={`chip idea__band idea__band--${idea.costBand}`}>
          <span aria-hidden="true">{COST_BAND_GLYPHS[idea.costBand]}</span>{' '}
          {COST_BAND_LABELS[idea.costBand]}
        </li>
        <li className="chip">{EFFORT_LABELS[idea.effort]}</li>
        {idea.eco ? (
          <li className="chip">
            <span aria-hidden="true">♻</span> Eco-friendly
          </li>
        ) : null}
      </ul>
      <p lang={lang}>{idea.description}</p>
      <p className="idea__why">
        <span className="idea__why-label">
          Why this fits you ({SIGNAL_LABELS[idea.whyItFits.signal]}):
        </span>{' '}
        <span lang={lang}>{idea.whyItFits.text}</span>
      </p>
      <a href={buildYoutubeSearchUrl(idea.youtubeQuery)} target="_blank" rel="noopener noreferrer">
        Watch how on YouTube
        <span className="visually-hidden">
          : <span lang={lang}>{idea.title}</span> (opens in a new tab)
        </span>
      </a>
    </li>
  );
}
