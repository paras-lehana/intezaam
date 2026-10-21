/**
 * Security barrel (re-exported from the package root): input hygiene shared by the server
 * and the web.
 *
 * Responsibility: the Unicode/bidi sanitiser, the folding used by every evidence check, the
 * quote-file magic-byte contract and the pure UTF-8/base64 codecs. Boundary: pure; no I/O.
 */
export { base64ToBytes, bytesToBase64Url, utf8Bytes, utf8Text } from './base64.js';
export * from './magic-bytes.js';
export * from './normalise.js';
export * from './sanitize.js';
