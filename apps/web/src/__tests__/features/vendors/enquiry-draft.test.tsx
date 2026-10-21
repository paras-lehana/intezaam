/**
 * Responsibility: "Draft an enquiry" — sends a request the server's strict schema accepts (the
 * plan's language, the vendor type), then offers Gmail, WhatsApp and Copy with the provenance
 * badge; an error is shown as an alert; the button stays focusable while busy. Boundary: fetch
 * is stubbed with a reply parsed through core's schema; links are built by core.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DEFAULT_MESSAGE_BY_CODE } from '@intezaam/core';
import { buildGmailComposeUrl, buildWhatsAppUrl } from '@intezaam/core/integrations';
import { draftRequestSchema, draftResponseSchema } from '@intezaam/core/schemas';
import { provenanceText } from '../../../components/features/common/ProvenanceBadge';
import {
  DRAFT_BUTTON,
  EnquiryDraft,
  type EnquiryDraftProps,
  draftText,
} from '../../../components/features/vendors/EnquiryDraft';
import { API_PATHS } from '../../../lib/api';
import { HTTP_SERVER_ERROR, jsonResponse, stubFetch } from '../../helpers';
import { GEMINI_PROVENANCE, panelProps } from '../plan-fixtures';

const { context, todayIso, plan } = panelProps('chennai-60th');
const [vendor] = plan.vendors;
const vendorType = vendor?.vendorType ?? 'venue';
const vendorLabel = vendor?.label ?? '';

/** The drafted message (a test-owned reply). */
const SUBJECT = 'Enquiry for a 60th birthday in Chennai';
const BODY = 'Vanakkam, we are planning a 60th birthday and would like a quote.';
const DRAFT = draftResponseSchema.parse({
  subject: SUBJECT,
  body: BODY,
  gmailUrl: buildGmailComposeUrl({ subject: SUBJECT, body: BODY }),
  whatsappUrl: buildWhatsAppUrl(BODY),
  provenance: GEMINI_PROVENANCE,
});

function renderDraft(overrides: Partial<EnquiryDraftProps> = {}): void {
  render(
    <EnquiryDraft
      context={context}
      todayIso={todayIso}
      vendorType={vendorType}
      vendorLabel={vendorLabel}
      {...overrides}
    />,
  );
}

describe('EnquiryDraft', () => {
  it('asks for a vendor enquiry in the plan’s language', async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch(jsonResponse(DRAFT));
    renderDraft();
    await user.click(screen.getByRole('button', { name: `${DRAFT_BUTTON} to the ${vendorLabel}` }));
    const [path, init] = fetchMock.mock.calls[0] ?? [];
    expect(path).toBe(API_PATHS.drafts);
    const body: unknown = JSON.parse(String(init?.body));
    const sent = draftRequestSchema.parse(body);
    expect(sent).toMatchObject({ kind: 'vendor-enquiry', vendorType, language: context.language });
  });

  it('asks for Hinglish only when the plan is in English and the brief was Hinglish', async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch(jsonResponse(DRAFT), jsonResponse(DRAFT));
    renderDraft({ context: { ...context, language: 'en' }, hinglish: true });
    renderDraft({ hinglish: true });
    const buttons = screen.getAllByRole('button', {
      name: `${DRAFT_BUTTON} to the ${vendorLabel}`,
    });
    for (const button of buttons) await user.click(button);
    const sent = fetchMock.mock.calls.map(([, init]) =>
      draftRequestSchema.parse(JSON.parse(String(init?.body))),
    );
    expect(sent.map((request) => request.hinglish)).toEqual([true, undefined]);
  });

  it('offers Gmail, WhatsApp and Copy with the provenance', async () => {
    const user = userEvent.setup();
    stubFetch(jsonResponse(DRAFT));
    renderDraft();
    await user.click(screen.getByRole('button', { name: `${DRAFT_BUTTON} to the ${vendorLabel}` }));
    expect(await screen.findByText(BODY)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Open in Gmail/ })).toHaveAttribute(
      'href',
      DRAFT.gmailUrl,
    );
    expect(screen.getByRole('link', { name: /^Send on WhatsApp/ })).toHaveAttribute(
      'href',
      DRAFT.whatsappUrl,
    );
    expect(screen.getByRole('button', { name: /Copy message/ })).toBeInTheDocument();
    expect(screen.getByText(provenanceText('ready', GEMINI_PROVENANCE))).toBeInTheDocument();
    expect(screen.getByText(`Enquiry to the ${vendorLabel} drafted.`)).toHaveAttribute(
      'role',
      'status',
    );
  });

  it('shows the server’s message as an alert when drafting fails', async () => {
    const user = userEvent.setup();
    const message = DEFAULT_MESSAGE_BY_CODE.INTERNAL;
    stubFetch(jsonResponse({ error: { code: 'INTERNAL', message } }, HTTP_SERVER_ERROR));
    renderDraft();
    await user.click(screen.getByRole('button', { name: `${DRAFT_BUTTON} to the ${vendorLabel}` }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });

  it('puts the subject above the body when copying', () => {
    expect(draftText(DRAFT)).toBe(`${SUBJECT}\n\n${BODY}`);
    expect(draftText({ body: BODY })).toBe(BODY);
  });
});
