/**
 * Integrations barrel (`@intezaam/core/integrations`) — no-key Google and WhatsApp links
 * and couple hashtags.
 *
 * Responsibility: the browser-safe entry point for Calendar templates, Maps search and
 * directions, Gmail compose (and mailto:), YouTube search, wa.me links and hashtag blends.
 * Boundary: URL and string construction only; no network, no keys.
 */
export * from './google-links.js';
export * from './hashtags.js';
