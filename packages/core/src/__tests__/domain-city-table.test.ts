/**
 * Tests for domain/city-table.ts: the gazetteer, its grades and findCity matching.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { ANCHOR_CITIES, CITY_TIERS } from '../domain/cities.js';
import { CITY_TABLE, findCity, normaliseCityName } from '../domain/city-table.js';
import { NE_MONSOON_MONTHS, NE_MONSOON_STATES, WET_PATTERN_INFO } from '../domain/seasons.js';

/** The gazetteer should cover about sixty cities (task contract). */
const MIN_CITIES = 60;
/** Cities the per-plate source lists by tier (04 §1.3): their tiers are grade C. */
const SOURCED = [
  'mumbai',
  'delhi',
  'bengaluru',
  'hyderabad',
  'lucknow',
  'pune',
  'ahmedabad',
  'kolkata',
];

describe('city gazetteer', () => {
  it('has at least sixty cities with unique ids and valid tiers', () => {
    expect(CITY_TABLE.length).toBeGreaterThanOrEqual(MIN_CITIES);
    expect(new Set(CITY_TABLE.map((city) => city.id)).size).toBe(CITY_TABLE.length);
    for (const city of CITY_TABLE) expect(CITY_TIERS).toContain(city.tier);
  });

  it('no two cities share a lookup key', () => {
    const keys = CITY_TABLE.flatMap((city) =>
      [city.id, city.name, ...city.aliases].map(normaliseCityName),
    );
    const perCity = CITY_TABLE.map(
      (city) => new Set([city.id, city.name, ...city.aliases].map(normaliseCityName)).size,
    );
    expect(new Set(keys).size).toBe(perCity.reduce((sum, size) => sum + size, 0));
  });

  it('grades sourced tiers (and the rest of Delhi NCR) C and every other mapping D', () => {
    for (const city of CITY_TABLE) {
      const sourced = SOURCED.includes(city.id) || city.anchor === 'delhi-ncr';
      expect(city.tierConfidence).toBe(sourced ? 'C' : 'D');
    }
  });

  it('every anchor city is reachable through the gazetteer', () => {
    const anchored = new Set(
      CITY_TABLE.flatMap((city) => (city.anchor === null ? [] : [city.anchor])),
    );
    expect([...anchored].sort()).toEqual([...ANCHOR_CITIES].sort());
  });

  it("takes each city's rainy months from its wet pattern (CTX-07)", () => {
    for (const city of CITY_TABLE) {
      expect(city.rainyMonths).toEqual(WET_PATTERN_INFO[city.wetPattern].months);
    }
  });

  it('adds the northeast monsoon in its states and South Interior Karnataka only', () => {
    const northeast = (id: string): boolean =>
      CITY_TABLE.find((city) => city.id === id)?.rainyMonths.includes(NE_MONSOON_MONTHS[0] ?? 0) ===
      true;
    for (const city of CITY_TABLE) {
      if (NE_MONSOON_STATES.includes(city.state)) expect(northeast(city.id)).toBe(true);
    }
    expect(northeast('chennai')).toBe(true);
    expect(northeast('kochi')).toBe(true);
    expect(northeast('mysuru')).toBe(true);
    expect(northeast('mangaluru')).toBe(false);
    expect(northeast('mumbai')).toBe(false);
  });

  it('gives Bengaluru its own pattern: the monsoon plus October, Nov–Dec not flagged', () => {
    const bengaluru = findCity('Bengaluru');
    expect(bengaluru?.wetPattern).toBe('bengaluru');
    expect(bengaluru?.rainyMonths).toContain(10);
    expect(bengaluru?.rainyMonths).not.toContain(NE_MONSOON_MONTHS.at(-1));
  });
});

describe('findCity', () => {
  it('matches names, old names and aliases regardless of case and punctuation', () => {
    expect(findCity('Bombay')?.id).toBe('mumbai');
    expect(findCity('  bangalore ')?.id).toBe('bengaluru');
    expect(findCity('New-Delhi')?.id).toBe('delhi');
    expect(findCity('Gurgaon')?.anchor).toBe('delhi-ncr');
  });

  it('ignores a trailing state and returns undefined for unknown places', () => {
    expect(findCity('Pune, Maharashtra')?.id).toBe('pune');
    expect(findCity('Atlantis')).toBeUndefined();
  });

  it('normalises accents and spacing', () => {
    expect(normaliseCityName('  Bengaluru,  KA ')).toBe('bengaluru ka');
    expect(normaliseCityName('Puducherrý')).toBe('puducherry');
  });
});
