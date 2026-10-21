/**
 * Responsibility: the invitation and message studio — kind × language × tone (and a vendor
 * for an enquiry) become one draft request; the reply is shown in its language with copy,
 * WhatsApp and Gmail links that are rebuilt here by core (never the server's URLs), plus its
 * provenance; after a Hinglish brief an English draft is asked for in Hinglish; a failure is
 * announced. Boundary: only the network is stubbed.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LANGUAGES, languageLabel } from '@intezaam/core/domain';
import { buildGmailComposeUrl, buildWhatsAppUrl } from '@intezaam/core/integrations';
import { provenanceText } from '../../../components/features/common/ProvenanceBadge';
import { MessageStudio } from '../../../components/features/ideas/MessageStudio';
import { HTTP_SERVER_ERROR, TEST_TODAY_ISO, jsonResponse, stubFetch } from '../../helpers';
import { GEMINI_PROVENANCE, draftReply, samplePanel } from '../panel-fixtures';

/** A message body and subject this test owns. */
const BODY = 'आपको सादर आमंत्रित करते हैं।';
const SUBJECT = 'निमंत्रण';

function requestBody(fetchMock: ReturnType<typeof stubFetch>): unknown {
  return JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
}

describe('MessageStudio', () => {
  it('sends the chosen kind, language, tone and signature, and shows a ready-to-send draft', async () => {
    const user = userEvent.setup();
    const { plan, context } = samplePanel('jaipur-wedding');
    const fetchMock = stubFetch(jsonResponse(draftReply(BODY, SUBJECT)));
    render(<MessageStudio plan={plan} context={context} todayIso={TEST_TODAY_ISO} />);
    await user.selectOptions(screen.getByLabelText('Message'), 'rsvp-reminder');
    await user.selectOptions(screen.getByLabelText('Language'), languageLabel('hi'));
    await user.click(screen.getByRole('radio', { name: 'Formal' }));
    await user.type(screen.getByLabelText('Sign it from (optional)'), 'The Sharma family');
    await user.click(screen.getByRole('button', { name: 'Write the message' }));
    const body = await screen.findByText(BODY);
    expect(body).toHaveAttribute('lang', LANGUAGES.hi.bcp47);
    expect(requestBody(fetchMock)).toMatchObject({
      kind: 'rsvp-reminder',
      language: 'hi',
      tone: 'formal',
      hostName: 'The Sharma family',
      todayIso: TEST_TODAY_ISO,
    });
    expect(requestBody(fetchMock)).not.toHaveProperty('vendorType');
    expect(requestBody(fetchMock)).not.toHaveProperty('hinglish');
    expect(screen.getByRole('link', { name: /Send on WhatsApp/ })).toHaveAttribute(
      'href',
      buildWhatsAppUrl(BODY),
    );
    expect(screen.getByRole('link', { name: /Open in Gmail/ })).toHaveAttribute(
      'href',
      buildGmailComposeUrl({ subject: SUBJECT, body: BODY }),
    );
    expect(screen.getByText(provenanceText('ready', GEMINI_PROVENANCE))).toBeInTheDocument();
  });

  it('names the vendor for an enquiry', async () => {
    const user = userEvent.setup();
    const { plan, context } = samplePanel('bengaluru-birthday');
    const vendor = plan.vendors[0]?.vendorType;
    const fetchMock = stubFetch(jsonResponse(draftReply('Hello, are you free on our date?')));
    render(<MessageStudio plan={plan} context={context} todayIso={TEST_TODAY_ISO} />);
    await user.selectOptions(screen.getByLabelText('Message'), 'vendor-enquiry');
    expect(screen.getByLabelText('Vendor')).toHaveValue(vendor);
    await user.click(screen.getByRole('button', { name: 'Write the message' }));
    await screen.findByText('Hello, are you free on our date?');
    expect(requestBody(fetchMock)).toMatchObject({ kind: 'vendor-enquiry', vendorType: vendor });
  });

  it('asks for an English draft in Hinglish after a Hinglish brief', async () => {
    const user = userEvent.setup();
    const { plan, context } = samplePanel('bengaluru-birthday');
    const fetchMock = stubFetch(jsonResponse(draftReply('Aap sab zaroor aana!')));
    render(<MessageStudio plan={plan} context={context} todayIso={TEST_TODAY_ISO} hinglish />);
    await user.selectOptions(screen.getByLabelText('Language'), languageLabel('en'));
    await user.click(screen.getByRole('button', { name: 'Write the message' }));
    await screen.findByText('Aap sab zaroor aana!');
    expect(requestBody(fetchMock)).toMatchObject({ language: 'en', hinglish: true });
  });

  it('announces a failure', async () => {
    const user = userEvent.setup();
    const { plan, context } = samplePanel('bengaluru-birthday');
    const message = 'The message service is busy. Please try again.';
    stubFetch(jsonResponse({ error: { code: 'UPSTREAM_FAILURE', message } }, HTTP_SERVER_ERROR));
    render(<MessageStudio plan={plan} context={context} todayIso={TEST_TODAY_ISO} />);
    await user.click(screen.getByRole('button', { name: 'Write the message' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });
});
