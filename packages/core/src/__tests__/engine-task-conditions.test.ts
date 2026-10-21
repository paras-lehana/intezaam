/**
 * Tests for engine/task-conditions.ts — which checklist templates apply (TL-01).
 *
 * Responsibility: prove each template condition reads the right context signal, and that
 * templates are filtered by kind, planned functions and condition. Boundary: unit tests
 * over the condition table and real templates.
 */
import { describe, expect, it } from 'vitest';
import { findTaskTemplate, templatesForFamily } from '../domain/tasks.js';
import {
  selectTemplates,
  TASK_CONDITION_CHECKS,
  templateApplies,
} from '../engine/task-conditions.js';
import {
  birthday,
  classified,
  community,
  homePuja,
  undated,
  wedding,
} from './fixtures/engine-contexts.js';

const check = TASK_CONDITION_CHECKS;

describe('TASK_CONDITION_CHECKS', () => {
  it('reads dates, traditions and choices', () => {
    expect(check['date-undecided'](classified(undated(wedding())))).toBe(true);
    expect(check['date-undecided'](classified(wedding()))).toBe(false);
    expect(check['hindu-muhurat'](classified(wedding()))).toBe(true);
    expect(check.nikah(classified(wedding({ tradition: 'muslim' })))).toBe(true);
    expect(check.church(classified(wedding({ tradition: 'christian' })))).toBe(true);
    expect(check.gurdwara(classified(wedding({ tradition: 'punjabi-sikh' })))).toBe(true);
    expect(check['planner-hired'](classified(wedding({ helpLevel: 'planner' })))).toBe(true);
    expect(check.jewellery(classified(wedding()))).toBe(false);
    expect(check.alcohol(classified(wedding({ alcohol: true })))).toBe(true);
  });

  it('reads guests, weather, access and sound', () => {
    expect(check['outstation-guests'](classified(wedding()))).toBe(true);
    expect(check['outstation-guests'](classified(birthday()))).toBe(false);
    expect(check['outstation-guests'](classified(birthday({ destination: true })))).toBe(true);
    expect(check['rain-risk'](classified(birthday()))).toBe(true);
    expect(check['accessibility-needs'](classified(wedding()))).toBe(true);
    expect(check['accessibility-needs'](classified(birthday()))).toBe(false);
    expect(check['amplified-sound'](classified(wedding()))).toBe(true);
  });

  it('reads premises, programme, crowd and setting', () => {
    const extras = community().community ?? { premises: 'private' as const, days: 1 };
    const publicGround = classified(community({ community: { ...extras, premises: 'public' } }));
    expect(check['public-premises'](publicGround)).toBe(true);
    expect(check['private-premises'](classified(community()))).toBe(true);
    expect(check.procession(classified(community()))).toBe(true);
    expect(check['temporary-structure'](classified(community()))).toBe(true);
    expect(check['temporary-structure'](classified(homePuja()))).toBe(false);
    expect(check['food-stalls'](classified(community({ functions: ['mela'] })))).toBe(true);
    expect(check['crowd-over-1000'](classified(community()))).toBe(true);
    expect(check['away-from-home'](classified(homePuja()))).toBe(false);
  });
});

describe('templateApplies and selectTemplates', () => {
  it('filters by kind, planned functions and condition', () => {
    const sixtieth = findTaskTemplate('b-sixtieth-priest');
    const mehendi = findTaskTemplate('w-book-mehendi');
    if (sixtieth === undefined || mehendi === undefined) throw new Error('templates expected');
    expect(templateApplies(classified(birthday()), sixtieth)).toBe(false);
    expect(templateApplies(classified(birthday({ kind: 'sixtieth-birthday' })), sixtieth)).toBe(
      true,
    );
    expect(templateApplies(classified(wedding()), mehendi)).toBe(true);
    expect(templateApplies(classified(wedding({ functions: ['wedding'] })), mehendi)).toBe(false);
  });

  it('keeps only the family’s templates that apply', () => {
    const ctx = classified(wedding());
    const selected = selectTemplates(ctx);
    expect(selected.length).toBeLessThan(templatesForFamily('wedding').length);
    expect(selected.every((template) => templateApplies(ctx, template))).toBe(true);
    expect(selected.some((template) => template.id === 'w-choose-date')).toBe(false);
  });
});
