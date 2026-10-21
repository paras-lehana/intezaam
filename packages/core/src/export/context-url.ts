/**
 * Share-link codec: the whole event context in the URL fragment, so a plan can be shared
 * with no server storage (feature #39).
 *
 * Responsibility: encode the context as base64url JSON with a version prefix; decode it
 * defensively — a size cap before any work, strict base64 and UTF-8 decoding, a guarded
 * JSON parse and full validation with `eventContextSchema` — returning a Result, never
 * throwing. Boundary: pure; the fragment never reaches a server.
 */
import { appError } from '../errors.js';
import { err, ok, type Result } from '../result.js';
import { eventContextSchema, type EventContext } from '../schemas/context.js';
import { base64ToBytes, bytesToBase64Url, utf8Bytes, utf8Text } from '../security/base64.js';

/** Version prefix, so a future format can be told apart from this one. */
const VERSION_PREFIX = 'v1.';
/** A full context is about 1–2 KB of JSON; 12,000 characters leaves headroom and rejects floods. */
export const MAX_CONTEXT_URL_CHARS = 12_000;
const FRAGMENT_MARK = /^#/;
const BAD_LINK_MESSAGE = 'This share link is broken or out of date. Please ask for a new one.';

/**
 * The context as a URL-safe string for a link fragment.
 * @example
 * encodeContextForUrl(context).startsWith('v1.'); // true
 */
export function encodeContextForUrl(context: EventContext): string {
  return `${VERSION_PREFIX}${bytesToBase64Url(utf8Bytes(JSON.stringify(context)))}`;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * Decodes and validates a shared context; a fixed, user-safe error otherwise.
 * @example
 * decodeContextFromUrl(encodeContextForUrl(context)); // { ok: true, value: context }
 * decodeContextFromUrl('#v1.not-json').ok; // false
 */
export function decodeContextFromUrl(encoded: string): Result<EventContext> {
  const body = encoded.trim().replace(FRAGMENT_MARK, '');
  if (body.length > MAX_CONTEXT_URL_CHARS || !body.startsWith(VERSION_PREFIX)) {
    return err(appError('VALIDATION_FAILED', BAD_LINK_MESSAGE, 'share link: size or version'));
  }
  const bytes = base64ToBytes(body.slice(VERSION_PREFIX.length));
  const text = bytes === undefined ? undefined : utf8Text(bytes);
  const parsed = eventContextSchema.safeParse(text === undefined ? undefined : parseJson(text));
  return parsed.success
    ? ok(parsed.data)
    : err(appError('VALIDATION_FAILED', BAD_LINK_MESSAGE, 'share link: decode or schema'));
}
