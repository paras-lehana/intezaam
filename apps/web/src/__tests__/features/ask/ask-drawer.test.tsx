/**
 * Responsibility: Ask Intezaam — an answer cites the plan sections it used (each linking to
 * its tab), a proposed change is shown as a diff and applied ONLY when Apply is pressed, a
 * refusal is explained in plain words, an empty question or a server error is announced,
 * and the first answer lands in a live list that was already there (the example chips are in
 * ask-examples.test.tsx). Boundary: replies are core's
 * offline twin (`askOffline`) for the same sample plan; only the network is stubbed.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  REFUSAL_COPY,
  SECTION_LABELS,
  SECTION_TABS,
} from '../../../components/features/ask/ask-copy';
import { AskDrawer, CONVERSATION_LABEL } from '../../../components/features/ask/AskDrawer';
import { EMPTY_QUESTION } from '../../../components/features/ask/use-ask';
import { provenanceText } from '../../../components/features/common/ProvenanceBadge';
import { describePatch } from '../../../components/features/what-if/describe-patch';
import { jsonResponse, stubFetch } from '../../helpers';
import { OFFLINE_PROVENANCE, askReply, samplePanel } from '../panel-fixtures';

/** HTTP status the server sends when the AI rate limit is hit. */
const TOO_MANY_REQUESTS = 429;

/** The question box, by role: the conversation list's own label also starts "Your question". */
function questionBox(): HTMLElement {
  return screen.getByRole('textbox', { name: /^Your question/ });
}

async function ask(question: string): Promise<void> {
  const user = userEvent.setup();
  await user.type(questionBox(), question);
  await user.click(screen.getByRole('button', { name: 'Ask' }));
}

describe('AskDrawer', () => {
  it('shows a proposed change as a diff and applies it only on Apply', async () => {
    const user = userEvent.setup();
    const setup = samplePanel('jaipur-wedding');
    const reply = askReply('add 50 guests', setup);
    if (reply.patch === undefined) throw new Error('core turns "add 50 guests" into a patch');
    stubFetch(jsonResponse(reply));
    render(<AskDrawer {...setup.props} />);
    await ask('add 50 guests');
    expect(await screen.findByText(reply.answer)).toBeInTheDocument();
    expect(screen.getByText('Proposed change:').parentElement).toHaveTextContent(
      describePatch(reply.patch).join('; '),
    );
    expect(screen.getByRole('table', { name: 'Key figures' })).toBeInTheDocument();
    expect(setup.onApplyPatch).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Apply this change' }));
    expect(setup.onApplyPatch).toHaveBeenCalledTimes(1);
    expect(setup.onApplyPatch).toHaveBeenCalledWith(reply.patch);
    expect(screen.getByRole('status')).toHaveTextContent('Applied to your plan.');
    expect(screen.queryByRole('button', { name: 'Apply this change' })).not.toBeInTheDocument();
  });

  it('cites the plan sections an answer used, linking to their tabs, with provenance', async () => {
    const setup = samplePanel('jaipur-wedding');
    const reply = askReply('Kitne plates order karein?', setup);
    stubFetch(jsonResponse(reply));
    render(<AskDrawer {...setup.props} />);
    await ask('Kitne plates order karein?');
    expect(await screen.findByText(reply.answer)).toBeInTheDocument();
    expect(reply.sources.length).toBeGreaterThan(0);
    for (const section of reply.sources) {
      expect(screen.getByRole('link', { name: SECTION_LABELS[section] })).toHaveAttribute(
        'href',
        `#${SECTION_TABS[section]}`,
      );
    }
    expect(screen.getByText(provenanceText('ready', OFFLINE_PROVENANCE))).toBeInTheDocument();
    expect(questionBox()).toHaveValue('');
  });

  it('explains a refusal in plain words', async () => {
    const setup = samplePanel('jaipur-wedding');
    const reply = askReply('pay the caterer advance', setup);
    if (reply.refusal === undefined) throw new Error('core refuses payment requests');
    stubFetch(jsonResponse(reply));
    render(<AskDrawer {...setup.props} />);
    await ask('pay the caterer advance');
    expect(
      await screen.findByText(REFUSAL_COPY[reply.refusal.reason], { exact: false }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply this change' })).not.toBeInTheDocument();
  });

  it('asks for a question before calling the server', async () => {
    const fetchMock = stubFetch();
    render(<AskDrawer {...samplePanel('bengaluru-birthday').props} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ask' }));
    expect(screen.getByRole('alert')).toHaveTextContent(EMPTY_QUESTION);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('announces a server error and keeps the question to try again', async () => {
    const message = 'Too many questions in a minute — wait a moment and ask again.';
    stubFetch(jsonResponse({ error: { code: 'RATE_LIMITED', message } }, TOO_MANY_REQUESTS));
    render(<AskDrawer {...samplePanel('bengaluru-birthday').props} />);
    await ask('What should I do first?');
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(questionBox()).toHaveValue('What should I do first?');
  });

  it('announces the first answer: the live list is there before any question', async () => {
    const setup = samplePanel('jaipur-wedding');
    const reply = askReply('What should I do first?', setup);
    stubFetch(jsonResponse(reply));
    render(<AskDrawer {...setup.props} />);
    const thread = screen.getByRole('list', { name: CONVERSATION_LABEL });
    expect(thread).toHaveAttribute('aria-live', 'polite');
    expect(thread).toBeEmptyDOMElement();
    await ask('What should I do first?');
    expect(await within(thread).findByText(reply.answer)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: CONVERSATION_LABEL })).toBe(thread);
  });
});
