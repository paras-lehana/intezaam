/**
 * "Try a sample": one button per persona sample.
 *
 * Responsibility: fill the whole form with a realistic celebration (dated relative to
 * today, so samples never go stale) so a first-time visitor sees a complete plan in one
 * more tap. Boundary: filling never submits — the reader still presses the plan button.
 */
import type { ReactElement } from 'react';
import { SAMPLE_CONTEXTS, SAMPLE_IDS, type SampleId } from '@intezaam/core/domain';

export interface SampleButtonsProps {
  readonly onPick: (id: SampleId) => void;
}

export function SampleButtons({ onPick }: SampleButtonsProps): ReactElement {
  return (
    <div className="samples" role="group" aria-labelledby="planner-samples-label">
      <p id="planner-samples-label" className="samples__label">
        Try a sample <span className="muted">(fills the form, you press Plan)</span>
      </p>
      <ul className="plain-list samples__list" role="list">
        {SAMPLE_IDS.map((id) => (
          <li key={id}>
            <button type="button" className="sample" onClick={() => onPick(id)}>
              <span className="sample__label">{SAMPLE_CONTEXTS[id].label}</span>
              <span className="sample__description">{SAMPLE_CONTEXTS[id].description}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
