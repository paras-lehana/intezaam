/**
 * Tests for domain/tasks.ts: task templates: ids, phases, dependencies and family coverage.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { EVENT_KIND_PROFILES } from '../domain/event-kinds.js';
import { EVENT_FAMILIES } from '../domain/events.js';
import { functionAllowedFor } from '../domain/functions.js';
import { isSourceId } from '../domain/sources.js';
import { taskFactory, TASK_CONDITIONS } from '../domain/task-types.js';
import { findTaskTemplate, TASK_TEMPLATES, templatesForFamily } from '../domain/tasks.js';
import { TIMELINE_PHASES } from '../domain/timeline.js';
import { VENDOR_TYPES } from '../domain/vendors.js';

const byId = new Map(TASK_TEMPLATES.map((template) => [template.id, template]));

describe('task templates (TL-01)', () => {
  it('have unique ids, valid phases, vendors, conditions and sources', () => {
    expect(byId.size).toBe(TASK_TEMPLATES.length);
    for (const template of TASK_TEMPLATES) {
      expect(TIMELINE_PHASES).toContain(template.phase);
      if (template.vendorType !== undefined) expect(VENDOR_TYPES).toContain(template.vendorType);
      if (template.condition !== undefined) expect(TASK_CONDITIONS).toContain(template.condition);
      expect(isSourceId(template.sourceId)).toBe(true);
      expect(template.why.length).toBeGreaterThan(0);
    }
  });

  it('lead days match the phase: after-event tasks are negative, day-of is zero, others positive', () => {
    for (const template of TASK_TEMPLATES) {
      if (template.phase === 'after') expect(template.leadDays).toBeLessThan(0);
      else if (template.phase === 'day-of') expect(template.leadDays).toBe(0);
      else expect(template.leadDays).toBeGreaterThan(0);
    }
  });

  it('a minimum-left rule always comes with a fallback shorter than the normal lead (TL-04)', () => {
    for (const template of TASK_TEMPLATES) {
      expect(template.minLeftDays === undefined).toBe(template.fallbackTitle === undefined);
      if (template.minLeftDays !== undefined)
        expect(template.minLeftDays).toBeLessThan(template.leadDays);
    }
  });

  it('kinds and functions narrowing a template belong to its families', () => {
    for (const template of TASK_TEMPLATES) {
      for (const kind of template.kinds ?? []) {
        expect(template.families).toContain(EVENT_KIND_PROFILES[kind].family);
      }
      for (const fn of template.functions ?? []) {
        expect(template.families.some((family) => functionAllowedFor(fn, family))).toBe(true);
      }
    }
  });

  it('dependencies exist in the same family and form no cycle (TL-07)', () => {
    const visiting = new Set<string>();
    const done = new Set<string>();
    const visit = (id: string): void => {
      if (done.has(id)) return;
      expect(visiting.has(id)).toBe(false);
      visiting.add(id);
      for (const dep of byId.get(id)?.dependsOn ?? []) visit(dep);
      visiting.delete(id);
      done.add(id);
    };
    for (const template of TASK_TEMPLATES) {
      for (const dep of template.dependsOn) {
        const target = byId.get(dep);
        expect(target).toBeDefined();
        expect(target?.families).toEqual(template.families);
      }
      visit(template.id);
    }
  });

  it('every family has core tasks, a "choose your date" task and a wrap-up task', () => {
    for (const family of EVENT_FAMILIES) {
      const templates = templatesForFamily(family);
      expect(templates.some((template) => template.core)).toBe(true);
      expect(templates.some((template) => template.condition === 'date-undecided')).toBe(true);
      expect(templates.some((template) => template.phase === 'after')).toBe(true);
    }
  });

  it("each birthday kind gets a fitting checklist: the 60th its rites, never children's party tasks", () => {
    const forKind = (kind: string) =>
      templatesForFamily('birthday').filter(
        (template) => template.kinds === undefined || template.kinds.some((k) => k === kind),
      );
    const sixtieth = forKind('sixtieth-birthday');
    const kids = forKind('kids-birthday');
    const childOnly = kids.filter((template) => !sixtieth.includes(template));
    expect(sixtieth.filter((template) => template.core).length).toBeGreaterThan(2);
    expect(sixtieth.some((template) => template.vendorType === 'pandit')).toBe(true);
    for (const template of childOnly) expect(template.kinds).toBeDefined();
    expect(sixtieth.some((template) => template.id === 'b-return-gifts')).toBe(false);
    expect(
      forKind('milestone-birthday').some((template) => template.vendorType === 'caterer'),
    ).toBe(true);
  });
});

describe('lookups and the factory', () => {
  it('finds templates by id and filters by family', () => {
    expect(findTaskTemplate('w-book-venue')?.vendorType).toBe('venue');
    expect(findTaskTemplate('nope')).toBeUndefined();
    expect(templatesForFamily('birthday').every((t) => t.families.includes('birthday'))).toBe(true);
  });

  it('stamps family defaults that a spec can override', () => {
    const make = taskFactory(['birthday']);
    const base = {
      id: 'x',
      phase: 'decide',
      leadDays: 1,
      title: 'T',
      why: 'W',
      sourceId: 'S-GIFTLIST-ND',
    } as const;
    expect(make(base)).toMatchObject({
      families: ['birthday'],
      dependsOn: [],
      core: false,
      ruleId: 'TL-01',
    });
    expect(make({ ...base, core: true, ruleId: 'TL-05' })).toMatchObject({
      core: true,
      ruleId: 'TL-05',
    });
  });
});
