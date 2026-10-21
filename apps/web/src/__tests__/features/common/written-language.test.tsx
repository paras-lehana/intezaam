/**
 * Responsibility: text the AI writes in the plan's chosen language carries that language's
 * `lang` (WCAG 3.1.2) — a Gemini narration and a Gemini Ask answer for a Hindi plan are
 * tagged hi-IN, while the offline planner's English is tagged en-IN even for a Hindi or
 * Tamil plan, and its message templates keep Hindi. Boundary: plans, narration and answers
 * come from the engine and core's offline twins; the tags come from core's language table.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { LANGUAGES, type LanguageCode } from '@intezaam/core/domain';
import type { Provenance } from '@intezaam/core/schemas';
import { AskDrawer, CONVERSATION_LABEL } from '../../../components/features/ask/AskDrawer';
import { writtenLang, writtenLanguage } from '../../../components/features/common/written-language';
import { Workspace } from '../../../components/features/workspace/Workspace';
import { jsonResponse, stubFetch } from '../../helpers';
import { askReply, samplePanel } from '../panel-fixtures';
import { GEMINI_PROVENANCE, OFFLINE_PROVENANCE, narrationFor, panelProps } from '../plan-fixtures';

const HINDI: LanguageCode = 'hi';
const TAMIL: LanguageCode = 'ta';

afterEach(() => {
  window.history.replaceState(null, '', '#');
});

function hindiWorkspace(provenance: Provenance): void {
  const props = panelProps('jaipur-wedding', { narrationState: 'ready' });
  const context = { ...props.context, language: HINDI };
  render(
    <Workspace
      {...props}
      context={context}
      narration={narrationFor(props.plan)}
      provenance={provenance}
    />,
  );
}

describe('writtenLanguage', () => {
  it('follows the chosen language for Gemini and English for the offline planner', () => {
    expect(writtenLanguage(GEMINI_PROVENANCE, TAMIL)).toBe(TAMIL);
    expect(writtenLanguage(OFFLINE_PROVENANCE, TAMIL)).toBe('en');
    expect(writtenLanguage(OFFLINE_PROVENANCE, HINDI, 'draft')).toBe(HINDI);
    expect(writtenLang(undefined, HINDI)).toBe(LANGUAGES.en.bcp47);
  });
});

describe('lang on generated text', () => {
  it('tags a Gemini narration of a Hindi plan as Hindi', () => {
    hindiWorkspace(GEMINI_PROVENANCE);
    const narration = narrationFor(panelProps('jaipur-wedding').plan);
    expect(screen.getByText(narration.headline)).toHaveAttribute('lang', LANGUAGES.hi.bcp47);
    expect(screen.getByText(narration.summary)).toHaveAttribute('lang', LANGUAGES.hi.bcp47);
  });

  it('tags the offline planner’s English as English, even for a Hindi plan', () => {
    hindiWorkspace(OFFLINE_PROVENANCE);
    const narration = narrationFor(panelProps('jaipur-wedding').plan);
    expect(screen.getByText(narration.headline)).toHaveAttribute('lang', LANGUAGES.en.bcp47);
  });

  it('tags a Gemini answer in Ask with the plan’s language', async () => {
    const setup = samplePanel('jaipur-wedding');
    const context = { ...setup.context, language: HINDI };
    const reply = askReply('What should I do first?', setup, GEMINI_PROVENANCE);
    stubFetch(jsonResponse(reply));
    render(<AskDrawer {...setup.props} context={context} />);
    const user = userEvent.setup();
    const question = 'What should I do first?';
    await user.type(screen.getByRole('textbox', { name: /^Your question/ }), question);
    await user.click(screen.getByRole('button', { name: 'Ask' }));
    const thread = screen.getByRole('list', { name: CONVERSATION_LABEL });
    expect(await within(thread).findByText(reply.answer)).toHaveAttribute(
      'lang',
      LANGUAGES.hi.bcp47,
    );
  });
});
