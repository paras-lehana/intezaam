/**
 * Tests for the preference reader.
 *
 * Responsibility: the venue city over an origin city, diet precedence and the Jain rule,
 * halal as a flag, alcohol negation, settings, access needs with elder relatives, style
 * chips, and priorities and cuts read clause by clause. Boundary: inputs are short phrases
 * from the vocabulary tables; values are the tables' own keys.
 */
import { describe, expect, it } from 'vitest';
import {
  readAccess,
  readAlcohol,
  readCity,
  readDiet,
  readPriorities,
  readSetting,
  readStyles,
} from '../offline/read-preferences.js';
import { tokenise } from '../offline/tokens.js';

function tokens(text: string): ReturnType<typeof tokenise>['tokens'] {
  return tokenise(text).tokens;
}

describe('readCity', () => {
  it('reads gazetteer names, aliases and extra spellings', () => {
    expect(readCity(tokens('party in Bangalore'))?.value.name).toBe('Bengaluru');
    expect(readCity(tokens('जयपुर में शादी'))?.value.name).toBe('Jaipur');
    expect(readCity(tokens('no city here'))).toBeUndefined();
  });

  it('prefers the venue city to the city guests come from', () => {
    expect(readCity(tokens('Udaipur wedding, family Jaipur se aa rahi hai'))?.value.name).toBe(
      'Udaipur',
    );
    expect(readCity(tokens('guests from Delhi, wedding in Jaipur'))?.value.name).toBe('Jaipur');
  });
});

describe('readDiet', () => {
  it('ranks Jain over non-veg over veg, and keeps halal as a flag', () => {
    expect(readDiet(tokens('veg with a jain counter')).menu).toBe('jain');
    expect(readDiet(tokens('mostly veg with some non-veg')).menu).toBe('mixed');
    expect(readDiet(tokens('shudh shakahari, pure veg'))).toMatchObject({
      menu: 'veg',
      halal: false,
    });
    expect(readDiet(tokens('halal khana'))).toEqual(expect.objectContaining({ halal: true }));
    expect(readDiet(tokens('halal khana')).menu).toBeUndefined();
  });

  it('reads "no onion garlic" as vegetarian, never Jain', () => {
    expect(readDiet(tokens('bina pyaaz-lahsun ka khana')).menu).toBe('veg');
    expect(readDiet(tokens('Jaipur')).menu).toBeUndefined();
  });
});

describe('readAlcohol', () => {
  it('lets a negation win over a plain mention', () => {
    expect(readAlcohol(tokens('bar aur DJ'))?.value).toBe(true);
    expect(readAlcohol(tokens('cocktails? no daaru please'))?.value).toBe(false);
    expect(readAlcohol(tokens('sirf veg'))).toBeUndefined();
  });
});

describe('readSetting', () => {
  it('reads one setting, and indoor plus outdoor as mixed', () => {
    expect(readSetting(tokens('ground floor hall chahiye'))?.value).toBe('indoor');
    expect(readSetting(tokens('ghar pe party'))?.value).toBe('home');
    expect(readSetting(tokens('hall with a lawn'))?.value).toBe('mixed');
    expect(readSetting(tokens('no place yet'))).toBeUndefined();
  });
});

describe('readAccess', () => {
  it('counts an elder relative only beside a stated need', () => {
    expect(readAccess(tokens('Nani wheelchair pe hain')).value).toEqual(['elderly', 'wheelchair']);
    expect(readAccess(tokens('Nani will bless the couple')).value).toEqual([]);
    expect(readAccess(tokens('20 kids and elders')).value).toEqual(['elderly', 'kids']);
  });
});

describe('readStyles', () => {
  it('reads style chips once each, in order, at most five', () => {
    expect(readStyles(tokens('royal and floral, royal again')).value).toEqual(['royal', 'floral']);
    const many = readStyles(tokens('royal floral pastel rustic quirky fusion modern')).value;
    expect(many).toEqual(['royal', 'floral', 'pastel', 'rustic', 'quirky']);
  });
});

describe('readPriorities', () => {
  it('reads priorities and one cut, each from its own clause', () => {
    const reading = readPriorities(tokens('food and decor are most important, skip dj'));
    expect(reading).toMatchObject({ priorities: ['catering', 'decor'], cut: 'entertainment' });
    expect(reading.prioritySpans).toHaveLength(1);
    expect(reading.cutSpans).toHaveLength(1);
  });

  it('keeps the cut out of the priorities and ignores clauses with no category', () => {
    const reading = readPriorities(
      tokens('kam decor. decor and photos are a priority. just vibes'),
    );
    expect(reading).toMatchObject({ priorities: ['photo_video'], cut: 'decor' });
  });

  it('returns no cut when none is named', () => {
    expect(readPriorities(tokens('photos are a must')).cut).toBeUndefined();
    expect(readPriorities(tokens('food in Jaipur'))).toEqual({
      priorities: [],
      prioritySpans: [],
      cutSpans: [],
    });
  });
});
