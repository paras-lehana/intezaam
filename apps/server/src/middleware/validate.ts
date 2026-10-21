/**
 * Request-body validation against the shared core zod schemas.
 *
 * Responsibility: reject malformed payloads with a 400 envelope before any handler
 * runs, and hand handlers a fully typed body. Boundary: messages are derived from
 * issue codes and schema paths only — user input is never echoed back.
 */
import { appError, clipText } from '@intezaam/core';
import type { Request, RequestHandler, Response } from 'express';
import type { z } from 'zod';
import { sendError } from '../http/respond.js';

/** Enough issues to fix a form without turning the message into a wall of text. */
const MAX_REPORTED_ISSUES = 3;

/**
 * Issue codes whose messages are safe to show: zod's bound messages describe only the limit,
 * and custom issues carry the fixed copy written in the core schemas (date window, context
 * rules, quote-file signature), which never interpolates the received value.
 */
const SAFE_MESSAGE_CODES: ReadonlySet<string> = new Set(['too_small', 'too_big', 'custom']);

/** Path segments are schema keys or indices; anything else is shown as "?" so it is never echoed. */
const SAFE_PATH_SEGMENT = /^[A-Za-z0-9_]{1,40}$/;

/** The error envelope caps messages at 300 characters (core errorResponseSchema). */
const MAX_MESSAGE_CHARS = 300;

/** Fixed phrases for every other issue code; unrecognised-key messages would echo input. */
const PHRASE_BY_CODE: Readonly<Record<string, string>> = {
  invalid_type: 'is missing or has the wrong type',
  invalid_value: 'is not one of the allowed options',
  invalid_format: 'is not in the expected format',
  invalid_union: 'does not match any accepted shape',
  unrecognized_keys: 'contains fields that are not allowed',
};

const GENERIC_PHRASE = 'is invalid';

/** Turns zod issues into one short, input-free sentence. */
function describeIssues(issues: z.ZodError['issues']): string {
  const sentence = issues
    .slice(0, MAX_REPORTED_ISSUES)
    .map((issue) => {
      const segments = issue.path.map((segment) =>
        SAFE_PATH_SEGMENT.test(String(segment)) ? String(segment) : '?',
      );
      const field = segments.length > 0 ? segments.join('.') : 'request';
      const phrase = SAFE_MESSAGE_CODES.has(issue.code)
        ? issue.message
        : (PHRASE_BY_CODE[issue.code] ?? GENERIC_PHRASE);
      return `${field}: ${phrase}`;
    })
    .join('; ');
  return clipText(sentence, MAX_MESSAGE_CHARS);
}

/** A handler that receives the parsed, typed body. */
export type ValidatedHandler<T> = (body: T, req: Request, res: Response) => Promise<void> | void;

/**
 * Validates `req.body` with `schema`, then calls `handle` with the parsed value.
 * @example
 * router.post('/ask', validate(askRequestSchema, async (body, _req, res) => { ... }));
 */
export function validate<S extends z.ZodType>(
  schema: S,
  handle: ValidatedHandler<z.output<S>>,
): RequestHandler {
  return async (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, appError('VALIDATION_FAILED', describeIssues(parsed.error.issues)));
      return;
    }
    await handle(parsed.data, req, res);
  };
}
