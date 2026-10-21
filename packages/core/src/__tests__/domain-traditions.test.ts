/**
 * Tests for domain/traditions.ts: tradition profiles and their hard rules.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { DIET_RULE_KEYS } from '../domain/diet.js';
import { FUNCTION_KINDS, functionAllowedFor } from '../domain/functions.js';
import { isSourceId } from '../domain/sources.js';
import { TRADITION_PROFILES, TRADITIONS } from '../domain/traditions.js';
import { OFFICIANT_VENDORS } from '../domain/vendors.js';
import { hhmmSchema } from '../schemas/common.js';

/** SPEC-MVP item 12: the product says "9 traditions" — nine named ones, plus civil/other. */
const NAMED_TRADITIONS = 9;

describe('tradition profiles', () => {
  it('has nine named traditions plus civil/other, the count the product states', () => {
    const named = TRADITIONS.filter((tradition) => TRADITION_PROFILES[tradition].faith !== 'civil');
    expect(named).toHaveLength(NAMED_TRADITIONS);
    expect(TRADITIONS.filter((tradition) => !named.includes(tradition))).toEqual(['civil-other']);
  });

  it('default functions are wedding functions and local names only rename planned kinds', () => {
    for (const tradition of TRADITIONS) {
      const profile = TRADITION_PROFILES[tradition];
      expect(profile.defaultFunctions).toContain('wedding');
      for (const fn of profile.defaultFunctions)
        expect(functionAllowedFor(fn, 'wedding')).toBe(true);
      for (const named of Object.keys(profile.functionNames))
        expect(FUNCTION_KINDS).toContain(named);
      for (const moved of Object.keys(profile.dayOffsets)) expect(FUNCTION_KINDS).toContain(moved);
    }
  });

  it('muhurat, Chaturmas and Kharmas apply to Hindu traditions only (CTX-08)', () => {
    for (const tradition of TRADITIONS) {
      const profile = TRADITION_PROFILES[tradition];
      expect(profile.muhurat).toBe(profile.faith === 'hindu');
    }
  });

  it('officiants are ritual vendors, and times and diet rules are valid', () => {
    for (const tradition of TRADITIONS) {
      const profile = TRADITION_PROFILES[tradition];
      if (profile.officiant !== null) expect(OFFICIANT_VENDORS).toContain(profile.officiant);
      if (profile.ceremonyStartHhmm !== null) {
        expect(hhmmSchema.safeParse(profile.ceremonyStartHhmm).success).toBe(true);
      }
      if (profile.dietRule !== null) expect(DIET_RULE_KEYS).toContain(profile.dietRule);
      for (const sourceId of profile.sourceIds) expect(isSourceId(sourceId)).toBe(true);
    }
  });

  it('encodes the hard rules: Anand Karaj in a gurdwara, church weddings 6 am–7 pm', () => {
    expect(TRADITION_PROFILES['punjabi-sikh'].ceremonyVenue).toBe('gurdwara');
    const window = TRADITION_PROFILES.christian.ceremonyWindow;
    expect(window).toEqual({ startHhmm: '06:00', endHhmm: '19:00' });
    const start = TRADITION_PROFILES.christian.ceremonyStartHhmm ?? '';
    expect(window !== null && start >= window.startHhmm && start <= window.endHhmm).toBe(true);
  });

  it('Nikah needs halal food and the mahr settled first', () => {
    expect(TRADITION_PROFILES.muslim.dietRule).toBe('halal');
    expect(TRADITION_PROFILES.muslim.requiredInputs.join(' ')).toContain('mahr');
  });
});
