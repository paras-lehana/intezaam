/**
 * Tests for schemas/patch.ts: the whitelisted patch ops.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { cityTextSchema } from '../schemas/context.js';
import { MAX_PATCH_OPS } from '../schemas/limits.js';
import { contextPatchSchema, PATCH_OPS, patchOpSchema } from '../schemas/patch.js';

describe('contextPatchSchema', () => {
  it('lists exactly the ops the union accepts', () => {
    const unionOps = patchOpSchema.options.map((option) => option.shape.op.value);
    expect([...unionOps].sort()).toEqual([...PATCH_OPS].sort());
  });

  it('accepts typed changes, including "estimate it for me" for the budget', () => {
    const patch = {
      ops: [
        { op: 'setGuests', value: 250 },
        { op: 'setBudget', value: null },
        { op: 'setDate', value: '2026-12-12' },
        { op: 'toggleCategory', value: 'decor', enabled: false },
        { op: 'removeFunction', value: 'mehendi' },
      ],
    };
    expect(contextPatchSchema.safeParse(patch).success).toBe(true);
  });

  it('cleans a patched city exactly as the context does', () => {
    const typed = 'Pune\u{202E} 9876543210';
    const parsed = contextPatchSchema.parse({ ops: [{ op: 'setCity', value: typed }] });
    expect(parsed.ops).toEqual([{ op: 'setCity', value: cityTextSchema.parse(typed) }]);
    expect(cityTextSchema.parse(typed)).not.toContain('9876543210');
  });

  it('rejects unknown ops, bad values, empty and oversized patches', () => {
    const parse = (ops: unknown[]): boolean => contextPatchSchema.safeParse({ ops }).success;
    expect(parse([{ op: 'setVenue', value: 'x' }])).toBe(false);
    expect(parse([{ op: 'setGuests', value: 0 }])).toBe(false);
    expect(parse([{ op: 'setDate', value: '2027-02-29' }])).toBe(false);
    expect(parse([{ op: 'toggleCategory', value: 'decor' }])).toBe(false);
    expect(parse([])).toBe(false);
    expect(
      parse(Array.from({ length: MAX_PATCH_OPS + 1 }, () => ({ op: 'setAlcohol', value: true }))),
    ).toBe(false);
  });
});
