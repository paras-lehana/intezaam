/**
 * Responsibility: Ask's conversation state — history sent with a question is the last turns
 * (oldest first) within the request schema's cap, an earlier turn travels with the next
 * question, and a second press while one question is in flight sends nothing. Boundary: the
 * hook against a stubbed network; replies are core's offline twin for the sample plan.
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MAX_HISTORY_TURNS } from '@intezaam/core/schemas';
import { type AskTurn, historyOf, useAsk } from '../../../components/features/ask/use-ask';
import { TEST_TODAY_ISO, jsonResponse, stubFetch } from '../../helpers';
import { askReply, samplePanel } from '../panel-fixtures';

function turnsFor(count: number): AskTurn[] {
  const setup = samplePanel('jaipur-wedding');
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    question: `Question ${index + 1}?`,
    response: askReply('What should I do first?', setup),
  }));
}

describe('historyOf', () => {
  it('keeps only the last turns, oldest first, within the cap', () => {
    const turns = turnsFor(MAX_HISTORY_TURNS + 2);
    const history = historyOf(turns);
    expect(history).toHaveLength(MAX_HISTORY_TURNS);
    expect(history[0]?.question).toBe(turns[2]?.question);
    expect(history.at(-1)?.answer).toBe(turns.at(-1)?.response.answer);
  });
});

describe('useAsk', () => {
  it('sends the earlier turn as history with the next question', async () => {
    const setup = samplePanel('jaipur-wedding');
    const first = askReply('What should I do first?', setup);
    const second = askReply('Kitne plates order karein?', setup);
    const fetchMock = stubFetch(jsonResponse(first), jsonResponse(second));
    const { result } = renderHook(() => useAsk(setup.context, TEST_TODAY_ISO));
    await act(async () => {
      await result.current.ask('What should I do first?');
    });
    await act(async () => {
      await result.current.ask('Kitne plates order karein?');
    });
    expect(result.current.turns.map((turn) => turn.response.answer)).toEqual([
      first.answer,
      second.answer,
    ]);
    const body: unknown = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(body).toMatchObject({
      history: [{ question: 'What should I do first?', answer: first.answer }],
    });
  });

  it('ignores a second question while one is in flight', async () => {
    const setup = samplePanel('jaipur-wedding');
    const fetchMock = stubFetch(jsonResponse(askReply('What should I do first?', setup)));
    const { result } = renderHook(() => useAsk(setup.context, TEST_TODAY_ISO));
    let answers: boolean[] = [];
    await act(async () => {
      answers = await Promise.all([
        result.current.ask('What should I do first?'),
        result.current.ask('And then?'),
      ]);
    });
    expect(answers).toEqual([true, false]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
