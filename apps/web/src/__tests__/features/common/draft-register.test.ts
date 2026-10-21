/**
 * Responsibility: hinglishPart — an English draft after a Hinglish brief asks for Hinglish;
 * any other language, or a brief that was not Hinglish, asks for nothing extra, and the
 * result always passes the server's draft request schema.
 * Boundary: languages come from core's closed list; the request around it from the fixtures.
 */
import { describe, expect, it } from 'vitest';
import { LANGUAGE_CODES } from '@intezaam/core/domain';
import { draftRequestSchema } from '@intezaam/core/schemas';
import { hinglishPart } from '../../../components/features/common/draft-register';
import { panelProps } from '../plan-fixtures';

describe('hinglishPart', () => {
  it('asks for Hinglish only for English after a Hinglish brief', () => {
    expect(hinglishPart('en', true)).toEqual({ hinglish: true });
    expect(hinglishPart('en', false)).toEqual({});
    expect(hinglishPart('en', undefined)).toEqual({});
    for (const language of LANGUAGE_CODES.filter((code) => code !== 'en')) {
      expect(hinglishPart(language, true)).toEqual({});
    }
  });

  it('builds a request the server accepts', () => {
    const { context, todayIso } = panelProps('jaipur-wedding');
    const request = {
      context,
      todayIso,
      kind: 'invitation',
      language: 'en',
      tone: 'warm',
      ...hinglishPart('en', true),
    };
    expect(draftRequestSchema.parse(request).hinglish).toBe(true);
  });
});
