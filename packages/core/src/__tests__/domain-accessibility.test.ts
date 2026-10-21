/**
 * Tests for domain/accessibility.ts: the accessibility checklist and need-based selection.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import {
  ACCESS_ITEM_IDS,
  ACCESS_NEED_LABELS,
  ACCESS_NEEDS,
  ACCESSIBILITY_ITEMS,
  accessItemsFor,
} from '../domain/accessibility.js';
import { isSourceId } from '../domain/sources.js';

const alwaysOn = ACCESS_ITEM_IDS.filter((id) => ACCESSIBILITY_ITEMS[id].needs.length === 0);

describe('accessibility checklist (ACC-01…06)', () => {
  it('each item cites its own ACC rule and a registered source', () => {
    ACCESS_ITEM_IDS.forEach((id, index) => {
      expect(ACCESSIBILITY_ITEMS[id].ruleId).toBe(`ACC-0${index + 1}`);
      expect(isSourceId(ACCESSIBILITY_ITEMS[id].sourceId)).toBe(true);
    });
    for (const need of ACCESS_NEEDS) expect(ACCESS_NEED_LABELS[need].length).toBeGreaterThan(0);
  });

  it('with no needs ticked, only the always-on items apply', () => {
    expect(accessItemsFor([])).toEqual(alwaysOn);
  });

  it('ticking a need adds its items', () => {
    expect(accessItemsFor(['elderly'])).toContain('elder-seating');
    expect(accessItemsFor(['wheelchair'])).toContain('ramp');
    expect(accessItemsFor(['wheelchair'])).not.toContain('elder-seating');
    expect(accessItemsFor([...ACCESS_NEEDS])).toEqual([...ACCESS_ITEM_IDS]);
  });

  it('the ramp item states the 1:12 gradient and 1,200 mm width', () => {
    expect(ACCESSIBILITY_ITEMS.ramp.detail).toContain('1:12');
    expect(ACCESSIBILITY_ITEMS.ramp.detail).toContain('1,200 mm');
  });
});
