/**
 * Tests for schemas/plan-safety.ts: permission, crowd, risk and accessibility contracts.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import {
  accessibilityPlanSchema,
  crowdPlanSchema,
  permissionSchema,
  RISK_SEVERITIES,
  riskSchema,
} from '../schemas/plan-safety.js';
import { buildFixturePlan } from './fixtures/plan-fixture.js';

const plan = buildFixturePlan();

describe('safety contracts', () => {
  it('accept the fixture sections', () => {
    for (const permission of plan.permissions)
      expect(permissionSchema.safeParse(permission).success).toBe(true);
    for (const risk of plan.risks) expect(riskSchema.safeParse(risk).success).toBe(true);
    expect(crowdPlanSchema.safeParse(plan.crowd).success).toBe(true);
    expect(accessibilityPlanSchema.safeParse(plan.accessibility).success).toBe(true);
  });

  it('severity is one of four words, blocker first', () => {
    expect(RISK_SEVERITIES[0]).toBe('blocker');
    const [risk] = plan.risks;
    expect(riskSchema.safeParse({ ...risk, severity: 'red' }).success).toBe(false);
  });

  it('rejects an unknown permission, crowd class or accessibility item', () => {
    const [permission] = plan.permissions;
    expect(permissionSchema.safeParse({ ...permission, id: 'liquor' }).success).toBe(false);
    expect(crowdPlanSchema.safeParse({ ...plan.crowd, crowdClass: 'huge' }).success).toBe(false);
    const items = [{ id: 'escalator', ruleId: 'ACC-01', title: 'x', detail: 'y' }];
    expect(accessibilityPlanSchema.safeParse({ ...plan.accessibility, items }).success).toBe(false);
  });
});
