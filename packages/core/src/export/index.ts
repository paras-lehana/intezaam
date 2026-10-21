/**
 * Export barrel (`@intezaam/core/export`) — calendar, spreadsheet, share text and share link.
 *
 * Responsibility: the browser-safe entry point for `buildIcs`, `planToCsv`,
 * `buildShareText` and the context URL codec. Boundary: pure builders; the
 * browser offers the downloads and links, so no plan is stored on a server.
 */
export * from './context-url.js';
export * from './csv.js';
export * from './ics.js';
export * from './share-text.js';
