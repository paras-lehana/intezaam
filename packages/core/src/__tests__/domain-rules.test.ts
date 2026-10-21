/**
 * Tests for domain/rules.ts: that every rule id is documented and every table cites a real rule.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { ACCESSIBILITY_ITEMS } from '../domain/accessibility.js';
import { CROWD_CHECKS } from '../domain/crowd.js';
import { DIET_RULES } from '../domain/diet.js';
import { LEVERS } from '../domain/levers.js';
import { PERMISSIONS } from '../domain/permissions.js';
import {
  CONTEXT_BUDGET_RULE_IDS,
  DECISION_TIME_RULE_IDS,
  RULE_IDS,
  SAFETY_COMMUNITY_RULE_IDS,
  VENDOR_PEOPLE_RULE_IDS,
} from '../domain/rule-ids.js';
import { ruleInfo } from '../domain/rule-info.js';
import { RULES } from '../domain/rules.js';
import { isSourceId } from '../domain/sources.js';
import { TASK_TEMPLATES } from '../domain/tasks.js';

const ruleIdSet: ReadonlySet<string> = new Set(RULE_IDS);

/** Ids copied verbatim from the decision-engine design, a spot check per group. */
const DESIGN_IDS = ['CTX-02', 'BUD-05', 'CST-06', 'VER-M', 'VER-F', 'VER-T', 'LEV-01', 'TL-03'];
const MORE_DESIGN_IDS = ['DATE-02', 'FN-03', 'VEN-04', 'HC-02', 'PERM-02', 'CROWD-03', 'COM-01'];

describe('rule ids', () => {
  it('are unique and are the union of the four groups', () => {
    expect(ruleIdSet.size).toBe(RULE_IDS.length);
    expect(RULE_IDS.length).toBe(
      CONTEXT_BUDGET_RULE_IDS.length +
        DECISION_TIME_RULE_IDS.length +
        VENDOR_PEOPLE_RULE_IDS.length +
        SAFETY_COMMUNITY_RULE_IDS.length,
    );
  });

  it('include the design ids verbatim, including every accessibility rule', () => {
    for (const id of [...DESIGN_IDS, ...MORE_DESIGN_IDS]) expect(ruleIdSet.has(id)).toBe(true);
    for (const n of [1, 2, 3, 4, 5, 6]) expect(ruleIdSet.has(`ACC-0${n}`)).toBe(true);
  });
});

describe('RULES documentation', () => {
  it('documents every rule id with a title, a summary and registered sources', () => {
    expect(Object.keys(RULES).sort()).toEqual([...RULE_IDS].sort());
    for (const id of RULE_IDS) {
      const rule = RULES[id];
      expect(rule.title.length).toBeGreaterThan(0);
      expect(rule.summary.length).toBeGreaterThan(rule.title.length);
      expect(rule.sourceIds.length).toBeGreaterThan(0);
      for (const sourceId of rule.sourceIds) expect(isSourceId(sourceId)).toBe(true);
    }
  });

  it('ruleInfo builds an entry from its parts', () => {
    expect(ruleInfo('T', 'S', 'C', ['S-VK-2026'])).toEqual({
      title: 'T',
      summary: 'S',
      confidence: 'C',
      sourceIds: ['S-VK-2026'],
    });
  });
});

describe('every table cites a real rule', () => {
  it('tasks, permissions, crowd checks, accessibility, diet rules and levers', () => {
    const cited = [
      ...TASK_TEMPLATES.map((template) => template.ruleId),
      ...Object.values(PERMISSIONS).map((entry) => entry.ruleId),
      ...Object.values(CROWD_CHECKS).map((entry) => entry.ruleId),
      ...Object.values(ACCESSIBILITY_ITEMS).map((entry) => entry.ruleId),
      ...Object.values(DIET_RULES).map((entry) => entry.ruleId),
      ...Object.values(LEVERS).map((entry) => entry.ruleId),
    ];
    for (const ruleId of cited) expect(ruleIdSet.has(ruleId)).toBe(true);
  });

  it('every lever implements a LEV rule', () => {
    for (const lever of Object.values(LEVERS)) expect(lever.ruleId.startsWith('LEV-')).toBe(true);
  });
});
