/**
 * Responsibility: the Ideas tab — honest waiting and offline messages, every idea from the
 * narration with its code-set cost band and a YouTube search link rebuilt by core, the
 * category filter, the style quiz emitting the typed change its answers imply, and couple
 * hashtags for weddings only. Boundary: the narration is the server's offline twin for the
 * same sample plan; the message studio has its own test.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { COST_BAND_LABELS, STYLE_QUIZ, STYLE_TAG_LABELS } from '@intezaam/core/domain';
import { buildYoutubeSearchUrl, hashtagBlends } from '@intezaam/core/integrations';
import { IDEA_CATEGORY_LABELS } from '../../../components/features/ideas/idea-labels';
import { IDEAS_UNREACHABLE, IDEAS_WAITING } from '../../../components/features/ideas/IdeasBoard';
import { IdeasPanel } from '../../../components/features/ideas/IdeasPanel';
import {
  answersFromTags,
  quizPatch,
  quizTags,
} from '../../../components/features/ideas/style-quiz';
import { offlineNarration, samplePanel } from '../panel-fixtures';

function narrated(id: Parameters<typeof samplePanel>[0]): ReturnType<typeof samplePanel> {
  const base = samplePanel(id);
  return samplePanel(id, {
    narration: offlineNarration(base.plan, base.context),
    narrationState: 'ready',
  });
}

describe('IdeasPanel', () => {
  it('says ideas are on their way, or that the service cannot be reached', () => {
    const { rerender } = render(
      <IdeasPanel {...samplePanel('jaipur-wedding', { narrationState: 'loading' }).props} />,
    );
    expect(screen.getByText(IDEAS_WAITING)).toBeInTheDocument();
    rerender(
      <IdeasPanel {...samplePanel('jaipur-wedding', { narrationState: 'offline' }).props} />,
    );
    expect(screen.getByText(IDEAS_UNREACHABLE)).toBeInTheDocument();
  });

  it('shows every idea with its cost band and a YouTube search link', () => {
    const { props } = narrated('bengaluru-birthday');
    const ideas = props.narration?.ideas ?? [];
    expect(ideas.length).toBeGreaterThan(0);
    render(<IdeasPanel {...props} />);
    const board = screen.getByRole('region', { name: 'Ideas for you' });
    for (const idea of ideas) {
      const card = within(board).getByRole('heading', { name: idea.title }).closest('li');
      if (card === null) throw new Error(`no card for ${idea.title}`);
      expect(card).toHaveTextContent(COST_BAND_LABELS[idea.costBand]);
      expect(card).toHaveTextContent(idea.whyItFits.text);
      expect(within(card).getByRole('link', { name: /Watch how on YouTube/ })).toHaveAttribute(
        'href',
        buildYoutubeSearchUrl(idea.youtubeQuery),
      );
    }
  });

  it('filters the board by category', async () => {
    const user = userEvent.setup();
    const { props } = narrated('jaipur-wedding');
    const ideas = props.narration?.ideas ?? [];
    const category = ideas[0]?.category;
    if (category === undefined) throw new Error('the offline library has ideas for the wedding');
    render(<IdeasPanel {...props} />);
    await user.click(screen.getByRole('radio', { name: IDEA_CATEGORY_LABELS[category] }));
    const board = screen.getByRole('region', { name: 'Ideas for you' });
    for (const idea of ideas) {
      const shown = within(board).queryByRole('heading', { name: idea.title });
      if (idea.category === category) expect(shown).toBeInTheDocument();
      else expect(shown).not.toBeInTheDocument();
    }
  });

  it('turns quiz answers into the typed change they imply, applied only on press', async () => {
    const user = userEvent.setup();
    const setup = samplePanel('jaipur-wedding');
    render(<IdeasPanel {...setup.props} />);
    const setting = screen.getByRole('group', { name: STYLE_QUIZ.setting.question });
    await user.click(
      within(setting).getByRole('radio', { name: STYLE_TAG_LABELS[STYLE_QUIZ.setting.a] }),
    );
    const answers = { ...answersFromTags(setup.context.styleTags), setting: 'a' as const };
    const expected = quizPatch(quizTags(answers), setup.context);
    expect(expected).not.toBeNull();
    expect(setup.onApplyPatch).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Use this style in my plan' }));
    expect(setup.onApplyPatch).toHaveBeenCalledWith(expected);
  });

  it('blends couple hashtags for a wedding, and has none for a birthday', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<IdeasPanel {...samplePanel('jaipur-wedding').props} />);
    await user.type(screen.getByLabelText('First name'), 'Riya');
    await user.type(screen.getByLabelText('Partner’s first name'), 'Arjun');
    const list = screen.getByRole('list', { name: 'Hashtag ideas' });
    const expected = hashtagBlends('Riya', 'Arjun');
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(expected);
    unmount();
    render(<IdeasPanel {...samplePanel('bengaluru-birthday').props} />);
    expect(screen.queryByRole('heading', { name: 'Wedding hashtags' })).not.toBeInTheDocument();
  });
});
