/**
 * Responsibility: the quote reader flow — nothing to compare asks for a quote without a call;
 * pasted quotes go out in a request the server's strict schema accepts and come back as
 * totals per quote against the budget line, differences and questions, never a
 * recommendation; a photo or PDF is read into the quote's box for the family to check.
 * Boundary: fetch is stubbed; the comparison is derived from core's offline reader and
 * normaliser — the same code the server runs — for a plan the engine built.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { compareQuotesOffline, formatInr, normaliseQuotes } from '@intezaam/core';
import {
  quoteReadRequestSchema,
  quoteReadResponseSchema,
  quotesRequestSchema,
  quotesResponseSchema,
} from '@intezaam/core/schemas';
import {
  COMPARE_BUTTON,
  EMPTY_QUOTES,
  QuoteReader,
} from '../../../components/features/vendors/QuoteReader';
import { QUOTE_FILE_PRIVACY_NOTE } from '../../../components/features/vendors/QuoteFileField';
import { NEVER_RECOMMENDS } from '../../../components/features/vendors/QuoteResults';
import { API_PATHS } from '../../../lib/api';
import { jsonResponse, stubFetch } from '../../helpers';
import { GEMINI_PROVENANCE, panelProps } from '../plan-fixtures';

const { plan, context, todayIso } = panelProps('jaipur-wedding');

/** Two caterers' quotes as families paste them (test-owned inputs). */
const QUOTES = [
  { id: 'quote-1', text: 'Veg buffet ₹950 per plate, GST extra, min 300 plates' },
  { id: 'quote-2', text: 'Full package ₹4,50,000 including GST and service' },
] as const;

const COMPARISON = quotesResponseSchema.parse({
  ...normaliseQuotes(compareQuotesOffline(QUOTES, 'caterer'), QUOTES, 'caterer', plan),
  provenance: GEMINI_PROVENANCE,
});

/** The transcript the reader returns for an uploaded file (test-owned). */
const TRANSCRIPT = 'Veg thali ₹900 per plate, GST 5% extra';
/** "%PDF-1.4" — a real PDF signature, so core's magic-byte check passes. */
const PDF_BYTES = '%PDF-1.4\n%quote';

function renderReader(): void {
  render(<QuoteReader plan={plan} context={context} todayIso={todayIso} />);
}

describe('QuoteReader', () => {
  it('asks for a quote before comparing nothing, without calling the server', async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch();
    renderReader();
    await user.click(screen.getByRole('button', { name: COMPARE_BUTTON }));
    expect(screen.getByText(EMPTY_QUOTES)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('compares pasted quotes against the budget line and never recommends', async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch(jsonResponse(COMPARISON));
    renderReader();
    expect(screen.getByRole('combobox', { name: 'Vendor type' })).toHaveValue('caterer');
    for (const [index, quote] of QUOTES.entries()) {
      const box = screen.getByRole('textbox', { name: new RegExp(`^Quote ${index + 1}:`) });
      await user.type(box, quote.text);
    }
    await user.click(screen.getByRole('button', { name: COMPARE_BUTTON }));
    const table = await screen.findByRole('table', {
      name: 'Quotes worked out for your expected guests',
    });
    const [path, init] = fetchMock.mock.calls[0] ?? [];
    expect(path).toBe(API_PATHS.quotesCompare);
    const sent = quotesRequestSchema.parse(JSON.parse(String(init?.body)));
    expect(sent.quotes).toEqual(QUOTES);
    expect(sent.category).toBe('caterer');
    for (const quote of COMPARISON.normalised) {
      if (quote.totalInr === undefined) continue;
      expect(within(table).getAllByText(formatInr(quote.totalInr)).length).toBeGreaterThan(0);
    }
    expect(within(table).getByRole('rowheader', { name: 'Quote 1' })).toBeInTheDocument();
    expect(screen.getByText(NEVER_RECOMMENDS)).toBeInTheDocument();
    expect(screen.getByText('Compared 2 quotes.')).toBeInTheDocument();
  });

  it('reads a PDF into the quote’s box for the family to check', async () => {
    const user = userEvent.setup();
    const reply = quoteReadResponseSchema.parse({
      text: TRANSCRIPT,
      redactions: [],
      provenance: GEMINI_PROVENANCE,
    });
    const fetchMock = stubFetch(jsonResponse(reply));
    renderReader();
    const file = new File([PDF_BYTES], 'caterer-quote.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText('Or read a photo or PDF of Quote 1'), file);
    const box = screen.getByRole('textbox', { name: /^Quote 1:/ });
    await screen.findByText(/Read Quote 1 from caterer-quote\.pdf/);
    expect(box).toHaveValue(TRANSCRIPT);
    const [path, init] = fetchMock.mock.calls[0] ?? [];
    expect(path).toBe(API_PATHS.quotesRead);
    const sent = quoteReadRequestSchema.parse(JSON.parse(String(init?.body)));
    expect(sent.file).toMatchObject({ mimeType: 'application/pdf', fileName: 'caterer-quote.pdf' });
  });

  it('says, before a file is chosen, that the file goes to Gemini as-is', () => {
    renderReader();
    const upload = screen.getByLabelText('Or read a photo or PDF of Quote 1');
    expect(upload).toHaveAccessibleDescription(QUOTE_FILE_PRIVACY_NOTE);
    expect(screen.getAllByText(QUOTE_FILE_PRIVACY_NOTE)[0]).toBeVisible();
  });

  it('refuses a file whose bytes are not what its type says, before uploading', async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch();
    renderReader();
    const renamed = new File(['<svg onload="x"></svg>'], 'quote.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Or read a photo or PDF of Quote 1'), renamed);
    expect(await screen.findByText(/not a PDF, JPEG, PNG or WebP/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('adds a third box, and no more', async () => {
    const user = userEvent.setup();
    renderReader();
    await user.click(screen.getByRole('button', { name: 'Add another quote' }));
    expect(screen.getByRole('textbox', { name: /^Quote 3:/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add another quote' })).not.toBeInTheDocument();
  });
});
