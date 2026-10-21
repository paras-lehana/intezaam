/**
 * Tests for domain/vendors.ts: the vendor taxonomy and its coverage of every vendor referenced.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { BUDGET_CATEGORIES } from '../domain/budget-categories.js';
import { CEREMONY_SEQUENCES } from '../domain/ceremonies.js';
import { FUNCTION_KINDS, FUNCTION_PROFILES } from '../domain/functions.js';
import { TASK_TEMPLATES } from '../domain/tasks.js';
import { TRADITIONS } from '../domain/traditions.js';
import {
  OFFICIANT_VENDORS,
  VENDOR_GROUP_LABELS,
  VENDOR_GROUPS,
  VENDOR_PROFILES,
  VENDOR_TYPES,
} from '../domain/vendors.js';

describe('vendor taxonomy', () => {
  it('every vendor has labels, a known group and a known budget category', () => {
    for (const type of VENDOR_TYPES) {
      const profile = VENDOR_PROFILES[type];
      expect(profile.label.length).toBeGreaterThan(0);
      expect(profile.labelHi.length).toBeGreaterThan(0);
      expect(VENDOR_GROUPS).toContain(profile.group);
      expect(BUDGET_CATEGORIES).toContain(profile.category);
    }
    for (const group of VENDOR_GROUPS) expect(VENDOR_GROUP_LABELS[group].length).toBeGreaterThan(0);
  });

  it('officiants are ritual vendors paid from the rituals line', () => {
    for (const type of OFFICIANT_VENDORS) {
      expect(VENDOR_PROFILES[type].group).toBe('ritual');
      expect(VENDOR_PROFILES[type].category).toBe('rituals');
    }
  });

  it('every vendor a function, ceremony or task needs is in the taxonomy', () => {
    const needed = [
      ...FUNCTION_KINDS.flatMap((kind) => FUNCTION_PROFILES[kind].vendors),
      ...TRADITIONS.flatMap((tradition) =>
        CEREMONY_SEQUENCES[tradition].flatMap((step) => step.vendors),
      ),
      ...TASK_TEMPLATES.flatMap((template) =>
        template.vendorType === undefined ? [] : [template.vendorType],
      ),
    ];
    for (const vendor of needed) expect(VENDOR_TYPES).toContain(vendor);
  });
});
