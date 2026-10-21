/**
 * Compare quotes: up to three vendor quotes, normalised against your budget line.
 *
 * Responsibility: choose the vendor type, paste (or read from a photo or PDF) one to three
 * quotes, and compare — the server reads them, code works out totals for the expected
 * guests with GST, and the result lists neutral differences and questions. The compare
 * button is never disabled while busy (aria-disabled plus a guard). Boundary: never ranks
 * or recommends a vendor; that decision stays with the family.
 */
import { type ReactElement, useState } from 'react';
import type { VendorType } from '@intezaam/core/domain';
import { MAX_QUOTES, type QuotesResponse } from '@intezaam/core/schemas';
import { compareQuotes } from '../../../lib/api';
import { LiveRegion } from '../../ui/LiveRegion';
import { PanelSection } from '../common/PanelSection';
import type { PanelProps } from '../panel-props';
import { QuoteInput } from './QuoteInput';
import { QuoteResults } from './QuoteResults';

type QuoteReaderProps = Pick<PanelProps, 'plan' | 'context' | 'todayIso'>;

export const COMPARE_BUTTON = 'Compare quotes';
export const EMPTY_QUOTES = 'Paste at least one quote, or read one from a photo or PDF.';

/** Quote ids and names in the order the reader sees them ("Quote 1"…). */
const QUOTE_SLOTS = Array.from({ length: MAX_QUOTES }, (_, index) => ({
  id: `quote-${index + 1}`,
  name: `Quote ${index + 1}`,
}));

const QUOTE_NAMES: ReadonlyMap<string, string> = new Map(
  QUOTE_SLOTS.map((slot) => [slot.id, slot.name]),
);

/** Catering is the largest line and the quote families compare most, so it is the default. */
const DEFAULT_QUOTE_VENDOR: VendorType = 'caterer';

/** Two boxes to start: most families compare two quotes before looking for a third. */
const STARTING_QUOTES: readonly string[] = ['', ''];

export function QuoteReader({ plan, context, todayIso }: QuoteReaderProps): ReactElement {
  const [category, setCategory] = useState<VendorType>(
    () =>
      plan.vendors.find((vendor) => vendor.vendorType === DEFAULT_QUOTE_VENDOR)?.vendorType ??
      plan.vendors[0]?.vendorType ??
      DEFAULT_QUOTE_VENDOR,
  );
  const [texts, setTexts] = useState<readonly string[]>(STARTING_QUOTES);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<QuotesResponse | undefined>(undefined);

  function compare(): void {
    if (busy) return;
    const quotes = QUOTE_SLOTS.flatMap((slot, index) => {
      const text = texts[index]?.trim() ?? '';
      return text === '' ? [] : [{ id: slot.id, text }];
    });
    if (quotes.length === 0) {
      setMessage(EMPTY_QUOTES);
      return;
    }
    setBusy(true);
    setMessage('Comparing…');
    void compareQuotes({ context, todayIso, category, quotes }).then((compared) => {
      setBusy(false);
      setResult(compared.ok ? compared.value : undefined);
      setMessage(
        compared.ok
          ? `Compared ${quotes.length} ${quotes.length === 1 ? 'quote' : 'quotes'}.`
          : compared.error.message,
      );
    });
  }

  return (
    <PanelSection
      id="vendors-quotes"
      title="Compare quotes"
      lede="Paste up to three quotes. Code works out each total for your guests, with GST, against your budget line. It never picks a vendor for you."
    >
      <div className="quote-category">
        <label htmlFor="quote-category">Vendor type</label>
        <select
          id="quote-category"
          value={category}
          onChange={(event) => {
            const next = plan.vendors.find((vendor) => vendor.vendorType === event.target.value);
            if (next !== undefined) setCategory(next.vendorType);
          }}
        >
          {plan.vendors.map((vendor) => (
            <option key={vendor.vendorType} value={vendor.vendorType}>
              {vendor.label}
            </option>
          ))}
        </select>
      </div>
      {texts.map((text, index) => {
        const slot = QUOTE_SLOTS[index];
        if (slot === undefined) return null;
        return (
          <QuoteInput
            key={slot.id}
            id={slot.id}
            name={slot.name}
            text={text}
            onChange={(next) => setTexts(texts.map((old, at) => (at === index ? next : old)))}
          />
        );
      })}
      <div className="quote-reader__actions">
        {texts.length < MAX_QUOTES ? (
          <button
            type="button"
            className="button button--ghost"
            onClick={() => setTexts([...texts, ''])}
          >
            Add another quote
          </button>
        ) : null}
        <button type="button" className="button button--cta" aria-disabled={busy} onClick={compare}>
          {busy ? 'Comparing…' : COMPARE_BUTTON}
        </button>
      </div>
      <LiveRegion message={message} visible className="quote-reader__status" />
      {result === undefined ? null : (
        <QuoteResults result={result} names={QUOTE_NAMES} language={context.language} />
      )}
    </PanelSection>
  );
}
