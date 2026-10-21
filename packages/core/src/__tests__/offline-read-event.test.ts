/**
 * Tests for the event reader.
 *
 * Responsibility: family and kind from explicit words — 60th first, community occasions,
 * weddings, family functions, birthdays by age, get-togethers, functions alone — plus
 * wedding functions in canonical order and stated traditions only. Boundary: inputs are
 * phrases from the vocabulary tables; kinds come from the tables, not from guesses.
 */
import { describe, expect, it } from 'vitest';
import { WEDDING_FUNCTION_KINDS } from '../domain/functions.js';
import {
  birthdayKindForAge,
  readAnandKaraj,
  readEvent,
  readFunctions,
  readPremises,
  readTradition,
} from '../offline/read-event.js';
import { tokenise } from '../offline/tokens.js';
import { FESTIVAL_ANCHORS } from '../offline/vocab/festivals.js';

function event(text: string, age?: number): { family?: string; kind?: string } {
  const reading = readEvent(tokenise(text).tokens, age);
  return {
    ...(reading.family === undefined ? {} : { family: reading.family }),
    ...(reading.kind === undefined ? {} : { kind: reading.kind }),
  };
}

describe('birthdayKindForAge', () => {
  it.each([
    [undefined, undefined],
    [1, 'first-birthday'],
    [7, 'kids-birthday'],
    [15, 'teen-birthday'],
    [60, 'sixtieth-birthday'],
    [70, 'milestone-birthday'],
  ] as const)('age %s → %s', (age, kind) => {
    expect(birthdayKindForAge(age)).toBe(kind);
  });
});

describe('readEvent', () => {
  it('reads a Shashtiabdapurti before any other cue', () => {
    expect(event('Shashtiabdapurti and wedding anniversary')).toEqual({
      family: 'birthday',
      kind: 'sixtieth-birthday',
    });
  });

  it('needs a community marker beside a festival', () => {
    expect(event('Ganesh utsav for the mandal')).toEqual({
      family: 'community',
      kind: FESTIVAL_ANCHORS['ganesh-chaturthi'].communityKind,
    });
    // A housing society or RWA makes a pandal festival a society festival.
    expect(event('Ganesh utsav in our society')).toEqual({
      family: 'community',
      kind: 'society-festival',
    });
    expect(event('Diwali mela for the RWA, pandal in the park')).toEqual({
      family: 'community',
      kind: 'society-festival',
    });
    expect(event('satsang at the temple')).toEqual({
      family: 'community',
      kind: 'religious-gathering',
    });
    expect(event('Diwali ke baad party')).toEqual({});
  });

  it('reads weddings, family functions and the longest phrase first', () => {
    expect(event('shaadi in Jaipur')).toEqual({ family: 'wedding', kind: 'wedding' });
    expect(event('mundan karna hai')).toEqual({ family: 'family-function', kind: 'naming-mundan' });
    expect(event('shaadi ki saalgirah')).toEqual({
      family: 'family-function',
      kind: 'anniversary',
    });
  });

  it('reads birthdays by age, teen birthdays by word, and leaves saalgirah open', () => {
    expect(event('birthday party', 7)).toEqual({ family: 'birthday', kind: 'kids-birthday' });
    expect(event('birthday party')).toEqual({ family: 'birthday' });
    expect(event('teen birthday party')).toEqual({ family: 'birthday', kind: 'teen-birthday' });
    expect(event('saalgirah hai')).toEqual({});
  });

  it('reads a puja as a family function at home and a gathering in a society', () => {
    expect(event('satvik food, puja')).toEqual({ family: 'family-function', kind: 'home-puja' });
    expect(event('Satyanarayan puja in our society')).toEqual({
      family: 'community',
      kind: 'religious-gathering',
    });
    expect(event('Durga puja pandal for the mandal')).toEqual({
      family: 'community',
      kind: FESTIVAL_ANCHORS['durga-puja'].communityKind,
    });
    expect(event('Ganesh puja in our society')).toEqual({
      family: 'community',
      kind: 'society-festival',
    });
  });

  it('reads a get-together as a family function without a kind', () => {
    expect(event('Holi ke aas paas get-together')).toEqual({ family: 'family-function' });
  });

  it('reads a wedding from its functions alone, but not from a family-only function', () => {
    expect(event('haldi aur mehendi')).toEqual({ family: 'wedding', kind: 'wedding' });
    expect(event('roka ceremony')).toEqual({ family: 'family-function', kind: 'engagement' });
    expect(event('nothing to see')).toEqual({});
  });

  it('returns the spans that prove the reading', () => {
    const reading = readEvent(tokenise('our society Ganpati utsav').tokens, undefined);
    expect(reading.spans.length).toBeGreaterThanOrEqual(2);
  });
});

describe('readFunctions', () => {
  it('lists wedding functions in canonical order', () => {
    const kinds = readFunctions(tokenise('reception, mehendi, sangeet and wedding').tokens).kinds;
    expect(kinds).toEqual(
      WEDDING_FUNCTION_KINDS.filter((kind) =>
        ['mehendi', 'sangeet', 'wedding', 'reception'].includes(kind),
      ),
    );
  });

  it('counts the bare word "wedding" only beside a named function', () => {
    expect(readFunctions(tokenise('a wedding in Jaipur').tokens).kinds).toEqual([]);
    expect(readFunctions(tokenise('haldi then the wedding').tokens).kinds).toEqual([
      'haldi',
      'wedding',
    ]);
  });
});

describe('readTradition', () => {
  it('reads stated traditions and never a surname or a city', () => {
    expect(readTradition(tokenise('Punjabi shaadi').tokens)?.value).toBe('punjabi-sikh');
    expect(readTradition(tokenise('nikah in Lucknow').tokens)?.value).toBe('muslim');
    expect(readTradition(tokenise('Sharma ji ki beti, Amritsar').tokens)).toBeUndefined();
  });
});

describe('readPremises and readAnandKaraj', () => {
  const premises = (text: string): string | undefined => readPremises(tokenise(text).tokens)?.value;

  it('reads a society compound as private and public land as public, public winning when both appear', () => {
    expect(premises('pandal in the compound')).toBe('private');
    expect(premises('सोसाइटी में गणपति उत्सव')).toBe('private');
    expect(premises('pandal on the main road')).toBe('public');
    expect(premises('our society, but the pandal is on the main road')).toBe('public');
    expect(premises('Ganesh utsav')).toBeUndefined();
  });

  it('names an Anand Karaj only from Sikh, Anand Karaj or gurdwara words, never from "Punjabi"', () => {
    expect(readAnandKaraj(tokenise('Anand Karaj at the gurdwara').tokens)).toBeDefined();
    expect(readAnandKaraj(tokenise('सिख शादी').tokens)).toBeDefined();
    expect(readAnandKaraj(tokenise('Punjabi shaadi in Ludhiana').tokens)).toBeUndefined();
  });
});
