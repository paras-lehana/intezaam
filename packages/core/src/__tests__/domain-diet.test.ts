/**
 * Tests for domain/diet.ts: diet profiles and caterer rules.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { DIET_PROFILE_INFO, DIET_PROFILES, DIET_RULE_KEYS, DIET_RULES } from '../domain/diet.js';
import { isSourceId } from '../domain/sources.js';

describe('diet profiles and rules (DIET-01…04)', () => {
  it('only menus with meat are priced at the non-veg rate', () => {
    const nonVeg = DIET_PROFILES.filter((profile) => DIET_PROFILE_INFO[profile].nonVegPricing);
    expect(nonVeg).toEqual(['mixed', 'non-veg']);
  });

  it('every rule has items, a DIET rule id and a registered source', () => {
    for (const key of DIET_RULE_KEYS) {
      const rule = DIET_RULES[key];
      expect(rule.items.length).toBeGreaterThan(0);
      expect(rule.ruleId.startsWith('DIET-')).toBe(true);
      expect(isSourceId(rule.sourceId)).toBe(true);
    }
  });

  it('the Jain rule covers root vegetables and the sunset meal', () => {
    const jain = DIET_RULES.jain.items.join(' ');
    expect(jain).toContain('onion');
    expect(jain).toContain('before sunset');
  });
});
