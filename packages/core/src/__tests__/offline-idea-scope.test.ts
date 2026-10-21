/**
 * Tests for the idea scope: offline boards keep to the event's tradition, occasion and cut
 * line, and rank the family's own customs first.
 *
 * Responsibility: the occasion is read from the title; the Pune Ganesh utsav board has no
 * Onam, Garba or other off-occasion idea and leads with its own; the Tamil 60th board has
 * nothing paid from the entertainment line it cut, no idea its tradition avoids and its
 * South Indian ideas; regional ideas reach only their own events. Boundary: boards come
 * from `narrateOffline` on the real sample plans; the rules under test supply every
 * expected value.
 */
import { describe, expect, it } from 'vitest';
import { ideaConstraintsFor } from '../genai/idea-constraints.js';
import {
  ideaBudgetLine,
  ideaScopeFor,
  matchesTradition,
  occasionNamed,
  suitsEvent,
} from '../offline/ideas/idea-scope.js';
import type { LibraryIdea } from '../offline/ideas/idea-types.js';
import { IDEAS_LIBRARY } from '../offline/ideas/select-ideas.js';
import { narrateOffline } from '../offline/narrate.js';
import type { SampleId } from '../domain/samples.js';
import { planned } from './fixtures/genai-plans.js';

const BY_TITLE = new Map(IDEAS_LIBRARY.map((idea) => [idea.title, idea]));

function board(id: SampleId): { ideas: LibraryIdea[]; planned: ReturnType<typeof planned> } {
  const sample = planned(id);
  const ideas = narrateOffline(sample.plan, sample.context).ideas.flatMap((idea) => {
    const row = BY_TITLE.get(idea.title);
    return row === undefined ? [] : [row];
  });
  return { ideas, planned: sample };
}

function libraryIdea(title: string): LibraryIdea {
  const idea = BY_TITLE.get(title);
  if (idea === undefined) throw new Error(`no library idea "${title}"`);
  return idea;
}

describe('idea scope', () => {
  it('reads the community occasion from the title', () => {
    expect(occasionNamed('Society Ganesh utsav')).toBe('ganesh-utsav');
    expect(occasionNamed('Our society Onam sadya')).toBe('onam');
    expect(occasionNamed('Ananya turns 7')).toBeUndefined();
  });

  it('keeps the Ganesh utsav board to its own occasion and ranks it first', () => {
    const { ideas, planned: sample } = board('society-ganesh');
    const constraints = ideaConstraintsFor(sample.plan, sample.context);
    const scope = ideaScopeFor(sample.plan, sample.context);
    expect(scope.occasion).toBe('ganesh-utsav');
    const titles = ideas.map((idea) => idea.title);
    for (const offOccasion of [
      'Onam sadya on plantain leaves',
      'Garba workshop before the big night',
    ])
      expect(titles).not.toContain(offOccasion);
    for (const idea of ideas) expect(suitsEvent(idea, constraints, scope), idea.title).toBe(true);
    expect(
      ideas.filter((idea) => matchesTradition(idea, constraints, scope)).length,
    ).toBeGreaterThan(0);
  });

  it("leaves the Tamil 60th's cut line and avoided ideas out and shows its own", () => {
    const { ideas, planned: sample } = board('chennai-60th');
    const constraints = ideaConstraintsFor(sample.plan, sample.context);
    const scope = ideaScopeFor(sample.plan, sample.context);
    expect(scope.cut).toBe('entertainment');
    for (const idea of ideas) {
      expect(ideaBudgetLine(idea), idea.title).not.toBe(scope.cut);
      expect(idea.fit.avoidTraditions ?? [], idea.title).not.toContain(constraints.tradition);
    }
    const titles = ideas.map((idea) => idea.title);
    for (const offTradition of ['Retro Bollywood night', 'Sitar or flute during lunch'])
      expect(titles).not.toContain(offTradition);
    expect(
      ideas.filter((idea) => matchesTradition(idea, constraints, scope)).length,
    ).toBeGreaterThan(0);
  });

  it('shows a regional idea only to its own tradition or occasion', () => {
    const { plan, context } = planned('jaipur-wedding');
    const north = ideaConstraintsFor(plan, context);
    const kolam = libraryIdea('Banana-leaf and kolam entrance');
    expect(suitsEvent(kolam, north, {})).toBe(false);
    expect(suitsEvent(kolam, { ...north, tradition: 'tamil' }, {})).toBe(true);
    const garba = libraryIdea('Garba workshop before the big night');
    expect(suitsEvent(garba, { ...north, tradition: 'gujarati' }, {})).toBe(true);
    const shehnai = libraryIdea('Shehnai during the pheras');
    expect(suitsEvent(shehnai, north, {})).toBe(true);
    expect(suitsEvent(shehnai, { ...north, tradition: 'christian' }, {})).toBe(false);
  });
});
