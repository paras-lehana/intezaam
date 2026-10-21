/**
 * Tests for services/model-json.ts: fence stripping, schema validation and the blank-string rescue.
 *
 * Responsibility: pin how a model's reply text becomes a typed value. Boundary: pure parsing.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { dropBlankStrings, parseModelJson } from '../services/model-json.js';

const answerSchema = z.object({ answer: z.string() });
const draftSchema = z.object({
  subject: z.string().min(1).optional(),
  message: z.string().min(1),
  asks: z.array(z.string().min(1)),
});

describe('parseModelJson', () => {
  it('rejects non-JSON output with a fixed hint', () => {
    const result = parseModelJson('not json', answerSchema);
    expect(result.ok ? '' : result.error.internalHint).toBe('model output is not JSON');
  });

  it('accepts a fenced reply whose optional field is an empty string', () => {
    const fenced = [
      '```json',
      '{"subject":"","message":"Hi","asks":["Ask about GST"," "]}',
      '```',
    ].join('\n');
    expect(parseModelJson(fenced, draftSchema)).toEqual({
      ok: true,
      value: { message: 'Hi', asks: ['Ask about GST'] },
    });
  });

  it('still rejects a blank required field', () => {
    const result = parseModelJson('{"message":"","asks":[]}', draftSchema);
    expect(result.ok ? '' : result.error.internalHint).toBe(
      'model output failed schema validation',
    );
  });
});

describe('dropBlankStrings', () => {
  it('drops blank properties and array items at every depth and keeps everything else', () => {
    expect(
      dropBlankStrings({ a: '', b: 'x', c: [' ', 'y', { d: '', e: 0, f: null }], g: false }),
    ).toEqual({
      b: 'x',
      c: ['y', { e: 0, f: null }],
      g: false,
    });
    expect(dropBlankStrings('')).toBe('');
    expect(dropBlankStrings(null)).toBeNull();
  });
});
