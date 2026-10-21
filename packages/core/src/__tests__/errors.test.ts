/**
 * Tests for errors.ts: the closed error taxonomy, HTTP mapping and public-error stripping.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import {
  appError,
  DEFAULT_MESSAGE_BY_CODE,
  ERROR_CODES,
  HTTP_STATUS_BY_CODE,
  httpStatusFor,
  toPublicError,
} from '../errors.js';

const MIN_HTTP_ERROR = 400;
const MAX_HTTP_ERROR = 599;

describe('error taxonomy', () => {
  it('maps every code to an HTTP error status and user-safe copy', () => {
    for (const code of ERROR_CODES) {
      expect(httpStatusFor(code)).toBe(HTTP_STATUS_BY_CODE[code]);
      expect(httpStatusFor(code)).toBeGreaterThanOrEqual(MIN_HTTP_ERROR);
      expect(httpStatusFor(code)).toBeLessThanOrEqual(MAX_HTTP_ERROR);
      expect(DEFAULT_MESSAGE_BY_CODE[code].length).toBeGreaterThan(0);
    }
  });

  it('AI failures say the offline plan is shown instead', () => {
    expect(DEFAULT_MESSAGE_BY_CODE.UPSTREAM_FAILURE).toContain('offline plan instead');
    expect(DEFAULT_MESSAGE_BY_CODE.UPSTREAM_TIMEOUT).toContain('offline plan instead');
  });

  it('defaults the message, keeps a custom one, and adds a hint only when given', () => {
    expect(appError('RATE_LIMITED')).toEqual({
      code: 'RATE_LIMITED',
      message: DEFAULT_MESSAGE_BY_CODE.RATE_LIMITED,
    });
    expect(appError('NOT_FOUND', 'No such plan').message).toBe('No such plan');
    expect('internalHint' in appError('INTERNAL')).toBe(false);
  });

  it('keeps internal hints out of public errors', () => {
    const error = appError('INTERNAL', undefined, 'cache down');
    expect(error.internalHint).toBe('cache down');
    expect(toPublicError(error)).toEqual({ code: 'INTERNAL', message: error.message });
  });
});
