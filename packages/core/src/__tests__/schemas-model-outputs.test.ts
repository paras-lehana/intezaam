/**
 * Tests for schemas/model-outputs.ts: narration, quote, draft and ask outputs.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { IDEA_CATEGORIES } from '../domain/ideas.js';
import { MIN_IDEAS } from '../schemas/limits.js';
import {
  askModelOutputSchema,
  draftModelOutputSchema,
  ideaSchema,
  narrationModelOutputSchema,
  narrationSchema,
  quoteModelOutputSchema,
} from '../schemas/model-outputs.js';

const modelIdea = {
  category: 'decor',
  title: 'Marigold canopy',
  description: 'Strings of marigold over the sangeet floor.',
  whyItFits: { signal: 'style', text: 'You picked floral and traditional.' },
  effort: 'med',
  eco: true,
  youtubeQuery: 'marigold canopy decor',
};

const narration = {
  headline: 'A lean but workable Jaipur wedding',
  summary: 'Your budget is below the Jaipur mid-range, so prioritise food and decor.',
  reasons: [{ traceId: 't1', text: 'Budget per guest is below the city band.' }],
  actions: [{ taskId: 'w-book-venue', text: 'Book the venue this week.' }],
};

describe('narration (job 2)', () => {
  it('requires at least six ideas from the model, in closed categories', () => {
    const ideas = IDEA_CATEGORIES.map((category) => ({ ...modelIdea, category }));
    expect(ideas.length).toBeGreaterThanOrEqual(MIN_IDEAS);
    expect(narrationModelOutputSchema.safeParse({ ...narration, ideas }).success).toBe(true);
    expect(
      narrationModelOutputSchema.safeParse({ ...narration, ideas: ideas.slice(1) }).success,
    ).toBe(false);
    expect(
      narrationModelOutputSchema.safeParse({
        ...narration,
        ideas: [{ ...modelIdea, costBand: 'saves' }, ...ideas],
      }).success,
    ).toBe(false);
  });

  it('the API idea adds the code-assigned cost band and YouTube link; fewer ideas are allowed', () => {
    const idea = {
      ...modelIdea,
      costBand: 'within',
      youtubeUrl: 'https://www.youtube.com/results?search_query=x',
    };
    expect(ideaSchema.safeParse(idea).success).toBe(true);
    expect(narrationSchema.safeParse({ ...narration, ideas: [idea] }).success).toBe(true);
    expect(ideaSchema.safeParse({ ...idea, costBand: '₹50,000' }).success).toBe(false);
  });

  it('themes, when given, have exactly three palette words', () => {
    const ideas = [{ ...modelIdea, costBand: 'saves', youtubeUrl: 'https://youtube.com' }];
    const theme = { name: 'Rajputana', paletteWords: ['ivory', 'gold', 'rani pink'] };
    expect(narrationSchema.safeParse({ ...narration, ideas, themes: [theme] }).success).toBe(true);
    const short = { ...theme, paletteWords: ['ivory'] };
    expect(narrationSchema.safeParse({ ...narration, ideas, themes: [short] }).success).toBe(false);
  });
});

describe('quotes, drafts and ask (jobs 3–5)', () => {
  it('quotes use a closed price basis and GST mention', () => {
    const quote = {
      quoteId: 'q1',
      priceBasis: 'per-plate',
      amounts: [],
      inclusions: [],
      exclusions: [],
      gst: 'extra',
    };
    const output = { quotes: [quote], differences: [], questions: [] };
    expect(quoteModelOutputSchema.safeParse(output).success).toBe(true);
    expect(
      quoteModelOutputSchema.safeParse({ ...output, quotes: [{ ...quote, gst: 'maybe' }] }).success,
    ).toBe(false);
    expect(quoteModelOutputSchema.safeParse({ ...output, quotes: [] }).success).toBe(false);
  });

  it('drafts are bounded and list the facts they used', () => {
    const draft = {
      body: 'Namaste! We are planning a wedding…',
      language: 'hi',
      factsUsed: ['city', 'date'],
    };
    expect(draftModelOutputSchema.safeParse(draft).success).toBe(true);
    expect(draftModelOutputSchema.safeParse({ ...draft, factsUsed: ['bankAccount'] }).success).toBe(
      false,
    );
  });

  it('ask answers cite plan sections and may refuse or propose a patch', () => {
    const answer = { answer: 'Your venue line is ₹5 L.', sources: ['budget'] };
    expect(askModelOutputSchema.safeParse(answer).success).toBe(true);
    const patch = { ops: [{ op: 'setGuests', value: 250 }] };
    expect(askModelOutputSchema.safeParse({ ...answer, patch }).success).toBe(true);
    expect(
      askModelOutputSchema.safeParse({ ...answer, refusal: { reason: 'booking-or-payment' } })
        .success,
    ).toBe(true);
    expect(askModelOutputSchema.safeParse({ ...answer, sources: ['horoscope'] }).success).toBe(
      false,
    );
  });
});
