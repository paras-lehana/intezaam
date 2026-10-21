/**
 * One decision rule behind a number: what rule, which of your details it read, what it
 * did, how sure we are and where the fact comes from.
 *
 * Responsibility: render a trace item — rule id and title, the inputs
 * used as a description list, the effect sentence, the confidence grade with the
 * assumption badge, and the source links. Boundary: display only; TraceDisclosure decides
 * when it shows.
 */
import type { ReactElement } from 'react';
import type { Plan, TraceItem } from '@intezaam/core/schemas';
import { ConfidenceLabel } from './ConfidenceLabel';
import { SourceLinks } from './SourceLinks';
import { sourcesFor } from './trace-lookup';

export interface TraceItemViewProps {
  readonly item: TraceItem;
  readonly plan: Plan;
}

export function TraceItemView({ item, plan }: TraceItemViewProps): ReactElement {
  return (
    <div className="trace-item">
      <p className="trace-item__title">
        <span className="trace-item__rule">{item.ruleId}</span> {item.title}
      </p>
      <p className="trace-item__effect">{item.effect}</p>
      {item.inputs.length === 0 ? null : (
        <dl className="trace-item__inputs" aria-label="Your details this rule used">
          {item.inputs.map((input, index) => (
            <div key={`${input.key}-${index}`} className="trace-item__input">
              <dt>{input.key}</dt>
              <dd>{input.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="trace-item__grade">
        <ConfidenceLabel grade={item.confidence} assumption={item.assumption} />
      </p>
      <SourceLinks sources={sourcesFor(plan, item.sourceIds)} />
    </div>
  );
}
