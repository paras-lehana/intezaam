/**
 * The quote comparison: totals worked out by code, neutral differences, questions to ask.
 *
 * Responsibility: one row per quote — total for your expected guests with GST added where
 * the quote left it out, per guest, and the gap to your budget line in words ("over" /
 * "under") — then the differences and the questions the reader should put to each vendor,
 * tagged with the language they are written in. It never ranks or recommends a vendor. Boundary: display only; amounts come from the
 * server's code normalisation, not from the model.
 */
import type { ReactElement, ReactNode } from 'react';
import type { LanguageCode } from '@intezaam/core/domain';
import type { QuotesResponse } from '@intezaam/core/schemas';
import { MoneyCell } from '../common/MoneyCell';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { TableScroll } from '../common/TableScroll';
import { writtenLang } from '../common/written-language';

export interface QuoteResultsProps {
  readonly result: QuotesResponse;
  /** "Quote 1", "Quote 2"… by quote id, in the order the reader typed them. */
  readonly names: ReadonlyMap<string, string>;
  /** The plan's language: Gemini writes the differences and questions in it. */
  readonly language: LanguageCode;
}

export const NEVER_RECOMMENDS =
  'Intezaam does not pick a vendor for you: compare, ask the questions, then decide.';

/** A quote's distance from the budget line in words; positive means over. */
function budgetGap(gap: number | undefined): ReactNode {
  if (gap === undefined) return '—';
  if (gap === 0) return 'On the line';
  return (
    <>
      <MoneyCell amount={Math.abs(gap)} /> {gap > 0 ? 'over' : 'under'}
    </>
  );
}

export function QuoteResults({ result, names, language }: QuoteResultsProps): ReactElement {
  const nameOf = (id: string): string => names.get(id) ?? id;
  const lang = writtenLang(result.provenance, language);
  return (
    <div className="quote-results">
      <ProvenanceBadge state="ready" provenance={result.provenance} />
      <TableScroll label="Quotes worked out for your expected guests">
        <table className="data-table">
          <caption>Quotes worked out for your expected guests</caption>
          <thead>
            <tr>
              <th scope="col">Quote</th>
              <th scope="col" className="num">
                Total
              </th>
              <th scope="col" className="num">
                Per guest
              </th>
              <th scope="col">Against your budget line</th>
              <th scope="col">Notes</th>
            </tr>
          </thead>
          <tbody>
            {result.normalised.map((quote) => (
              <tr key={quote.quoteId}>
                <th scope="row">{nameOf(quote.quoteId)}</th>
                <td className="num">
                  {quote.totalInr === undefined ? (
                    'Not stated'
                  ) : (
                    <MoneyCell amount={quote.totalInr} />
                  )}
                </td>
                <td className="num">
                  {quote.perGuestInr === undefined ? '—' : <MoneyCell amount={quote.perGuestInr} />}
                </td>
                <td>{budgetGap(quote.vsBudgetLineInr)}</td>
                <td>
                  {[quote.gstAdded ? 'GST added' : '', ...quote.flags].filter(Boolean).join('; ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
      {result.differences.length === 0 ? null : (
        <>
          <h4>Differences</h4>
          <ul>
            {result.differences.map((difference) => (
              <li key={difference} lang={lang}>
                {difference}
              </li>
            ))}
          </ul>
        </>
      )}
      {result.questions.length === 0 ? null : (
        <>
          <h4>Questions to ask</h4>
          <ul>
            {result.questions.map((question) => (
              <li key={`${question.quoteId}-${question.text}`}>
                <strong>{nameOf(question.quoteId)}:</strong> <span lang={lang}>{question.text}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="muted">{NEVER_RECOMMENDS}</p>
    </div>
  );
}
