/**
 * Responsibility: Ask Intezaam's example chips — the Hindi starter question (and only it)
 * carries lang="hi", and pressing a chip asks that question straight away, showing a proposed
 * change without applying it. Boundary: the reply is core's offline twin (`askOffline`) for the
 * same sample plan; only the network is stubbed.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ASK_EXAMPLES } from '../../../components/features/ask/ask-copy';
import { AskDrawer } from '../../../components/features/ask/AskDrawer';
import { describePatch } from '../../../components/features/what-if/describe-patch';
import { jsonResponse, stubFetch } from '../../helpers';
import { askReply, samplePanel } from '../panel-fixtures';

/** Devanagari letters: a starter question written in them must say it is Hindi. */
const DEVANAGARI = /[ऀ-ॿ]/;

describe('AskDrawer examples', () => {
  it('marks the Hindi starter question as Hindi, and only that one', () => {
    render(<AskDrawer {...samplePanel('jaipur-wedding').props} />);
    const examples = screen.getByRole('list', { name: 'Example questions' });
    expect(ASK_EXAMPLES.some((example) => DEVANAGARI.test(example.text))).toBe(true);
    for (const example of ASK_EXAMPLES) {
      const chip = within(examples).getByRole('button', { name: example.text });
      if (DEVANAGARI.test(example.text)) expect(chip).toHaveAttribute('lang', 'hi');
      else expect(chip).not.toHaveAttribute('lang');
    }
  });

  it('asks an example question straight away', async () => {
    const setup = samplePanel('jaipur-wedding');
    const example = '50 log kam karo';
    const reply = askReply(example, setup);
    if (reply.patch === undefined) throw new Error('core turns "50 log kam karo" into a patch');
    const fetchMock = stubFetch(jsonResponse(reply));
    render(<AskDrawer {...setup.props} />);
    await userEvent.setup().click(screen.getByRole('button', { name: example }));
    expect(await screen.findByText(reply.answer)).toBeInTheDocument();
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      question: example,
    });
    expect(screen.getByText('Proposed change:').parentElement).toHaveTextContent(
      describePatch(reply.patch).join('; '),
    );
    expect(setup.onApplyPatch).not.toHaveBeenCalled();
  });
});
