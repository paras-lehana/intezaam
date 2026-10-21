/**
 * Tests for domain/levers.ts: that every lever implements a LEV rule and every LEV rule has a lever.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { LEVER_IDS, LEVERS, LEVERS_SHOWN } from '../domain/levers.js';
import { RULE_IDS } from '../domain/rule-ids.js';

describe('levers (LEV-01…07)', () => {
  it('every lever has a label and implements a LEV rule', () => {
    for (const id of LEVER_IDS) {
      expect(LEVERS[id].label.length).toBeGreaterThan(0);
      expect(RULE_IDS).toContain(LEVERS[id].ruleId);
      expect(LEVERS[id].ruleId.startsWith('LEV-')).toBe(true);
    }
  });

  it('every LEV rule has at least one lever, and three are shown', () => {
    const covered = new Set(LEVER_IDS.map((id) => LEVERS[id].ruleId));
    for (const ruleId of RULE_IDS.filter((id) => id.startsWith('LEV-')))
      expect(covered.has(ruleId)).toBe(true);
    expect(LEVERS_SHOWN).toBe(3);
  });
});
