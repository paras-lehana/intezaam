/**
 * Tests for schemas/common.ts: shared primitives: dates, times, rupees, ids, user text fields.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { redactPii } from '../privacy/redact.js';
import {
  hhmmSchema,
  idSchema,
  inrEstimateSchema,
  inrSchema,
  isoDateSchema,
  labelSchema,
  monthKeySchema,
  shareSchema,
  signedInrSchema,
  userTextFieldSchema,
} from '../schemas/common.js';
import {
  MAX_AMOUNT_INR,
  MAX_CITY_CHARS,
  MAX_ID_CHARS,
  MAX_LABEL_CHARS,
} from '../schemas/limits.js';

const ok = (
  schema: { safeParse: (value: unknown) => { success: boolean } },
  value: unknown,
): boolean => schema.safeParse(value).success;

describe('shared primitives', () => {
  it('dates must exist and use YYYY-MM-DD', () => {
    expect(ok(isoDateSchema, '2028-02-29')).toBe(true);
    expect(ok(isoDateSchema, '2027-02-29')).toBe(false);
    expect(ok(isoDateSchema, '2026/11/25')).toBe(false);
  });

  it('times are 24-hour HH:MM', () => {
    expect(ok(hhmmSchema, '00:00')).toBe(true);
    expect(ok(hhmmSchema, '23:59')).toBe(true);
    expect(ok(hhmmSchema, '24:00')).toBe(false);
    expect(ok(hhmmSchema, '7:30')).toBe(false);
  });

  it('month keys run 01–12', () => {
    expect(ok(monthKeySchema, '2026-11')).toBe(true);
    expect(ok(monthKeySchema, '2026-13')).toBe(false);
  });

  it('rupees are whole and bounded; signed amounts may be negative', () => {
    expect(ok(inrSchema, MAX_AMOUNT_INR)).toBe(true);
    expect(ok(inrSchema, MAX_AMOUNT_INR + 1)).toBe(false);
    expect(ok(inrSchema, 10.5)).toBe(false);
    expect(ok(inrSchema, -1)).toBe(false);
    expect(ok(signedInrSchema, -MAX_AMOUNT_INR)).toBe(true);
    expect(ok(inrEstimateSchema, { low: 1, mid: 2, high: 3 })).toBe(true);
    expect(ok(inrEstimateSchema, { low: 1, mid: 2, high: 3, extra: 4 })).toBe(false);
  });

  it('ids, labels and shares are bounded', () => {
    expect(ok(idSchema, 'x'.repeat(MAX_ID_CHARS))).toBe(true);
    expect(ok(idSchema, 'x'.repeat(MAX_ID_CHARS + 1))).toBe(false);
    expect(ok(idSchema, '   ')).toBe(false);
    expect(ok(labelSchema, 'y'.repeat(MAX_LABEL_CHARS + 1))).toBe(false);
    expect(ok(shareSchema, 1)).toBe(true);
    expect(ok(shareSchema, 1.1)).toBe(false);
  });
});

describe('userTextFieldSchema', () => {
  const field = userTextFieldSchema(MAX_CITY_CHARS);
  const PHONE = '9876543210';
  const PHONE_PLACEHOLDER = redactPii(PHONE).text;
  /** Right-to-left override, zero-width space and two Unicode tag characters. */
  const HIDDEN = ['\u{202E}', '\u{200B}', '\u{E0001}', '\u{E0065}'];

  it('strips hidden characters, then redacts the PII they were splitting', () => {
    const split = `Ring 98765${HIDDEN.join('')}43210 evil`;
    const parsed = field.parse(split);
    expect(parsed).toBe(`Ring ${PHONE_PLACEHOLDER} evil`);
    for (const char of HIDDEN) expect(parsed).not.toContain(char);
  });

  it('rejects text made only of hidden characters, and over-long typed text', () => {
    expect(ok(field, HIDDEN.join(''))).toBe(false);
    expect(ok(field, '   ')).toBe(false);
    expect(ok(field, `  ${'x'.repeat(MAX_CITY_CHARS)}  `)).toBe(true);
    expect(ok(field, 'x'.repeat(MAX_CITY_CHARS + 1))).toBe(false);
  });

  it('keeps the cap when a placeholder is longer than what it replaced', () => {
    const account = 'a/c 123456789';
    const typed = `${'x'.repeat(MAX_CITY_CHARS - account.length - 1)} ${account}`;
    expect(typed).toHaveLength(MAX_CITY_CHARS);
    expect(redactPii(typed).text.length).toBeGreaterThan(MAX_CITY_CHARS);
    expect(Array.from(field.parse(typed)).length).toBeLessThanOrEqual(MAX_CITY_CHARS);
  });

  it('is stable on its own output, so a shared plan link parses to the same text', () => {
    const once = field.parse(` Pune\u{202E}  ${PHONE} `);
    expect(field.parse(once)).toBe(once);
  });

  it('stays a plain string in JSON Schema, with its length bounds', () => {
    expect(z.toJSONSchema(field)).toMatchObject({
      type: 'string',
      minLength: 1,
      maxLength: MAX_CITY_CHARS,
    });
  });
});
