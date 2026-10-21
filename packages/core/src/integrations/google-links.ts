/**
 * Google and WhatsApp deep links that need no API key, no script and no billing
 * (synthesis §6: Calendar templates, Maps URLs, Gmail compose, YouTube search, wa.me).
 *
 * Responsibility: build share-free URLs so a family can save a milestone to Google
 * Calendar, search vendors or get directions in Google Maps, open a pre-filled Gmail draft
 * (or a mailto: fallback), find a YouTube tutorial for an idea, or send a WhatsApp message.
 * Every value is URL-encoded and every link is capped at MAX_LINK_CHARS by trimming the
 * free text, never by cutting an escape sequence. Boundary: URL construction only — no
 * network, no keys, and only the text the user chose to share.
 */

const CALENDAR_BASE = 'https://calendar.google.com/calendar/render';
const MAPS_SEARCH_BASE = 'https://www.google.com/maps/search/';
const MAPS_DIRECTIONS_BASE = 'https://www.google.com/maps/dir/';
const GMAIL_BASE = 'https://mail.google.com/mail/';
const YOUTUBE_BASE = 'https://www.youtube.com/results';
const WHATSAPP_BASE = 'https://wa.me/';
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_OFFSET = 1;
const PAD_WIDTH = 2;
const YEAR_WIDTH = 4;

/** Maps URLs must stay under 2,048 characters (Maps URLs docs); 2,000 also suits wa.me and Gmail. */
export const MAX_LINK_CHARS = 2_000;
/** Event titles and subjects are one line; 120 characters leaves room for the details. */
const MAX_TITLE_CHARS = 120;
/** Each trimming pass keeps 90% of the remaining text until the link fits. */
const TRIM_RATIO = 0.9;
const ELLIPSIS = '…';

/** Travel modes the Maps URLs API accepts; two-wheeler suits most Indian guests. */
export const MAPS_TRAVEL_MODES = [
  'driving',
  'walking',
  'bicycling',
  'two-wheeler',
  'transit',
] as const;

export type MapsTravelMode = (typeof MAPS_TRAVEL_MODES)[number];

export interface CalendarEventInput {
  readonly title: string;
  readonly isoDate: string;
  readonly details: string;
}

export interface MailInput {
  readonly to?: string;
  readonly subject: string;
  readonly body: string;
}

/** A surrogate half without its partner would make encodeURIComponent throw. */
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
const REPLACEMENT_CHARACTER = '\uFFFD';

/** Well-formed text cut to `max` whole characters (never half an emoji). */
function clip(text: string, max: number): string {
  return Array.from(text.replace(LONE_SURROGATE, REPLACEMENT_CHARACTER).trim())
    .slice(0, max)
    .join('');
}

function compactDate(date: Date): string {
  const year = String(date.getUTCFullYear()).padStart(YEAR_WIDTH, '0');
  const month = String(date.getUTCMonth() + MONTH_OFFSET).padStart(PAD_WIDTH, '0');
  const day = String(date.getUTCDate()).padStart(PAD_WIDTH, '0');
  return `${year}${month}${day}`;
}

/** YYYYMMDD/YYYYMMDD for an all-day event (end date is exclusive), or null for an invalid date. */
function allDayRange(isoDate: string): string | null {
  const match = ISO_DATE.exec(isoDate);
  if (match === null) return null;
  const [year, month, day] = match.slice(1).map(Number);
  if (year === undefined || month === undefined || day === undefined) return null;
  const start = new Date(Date.UTC(year, month - MONTH_OFFSET, day));
  if (start.getUTCMonth() !== month - MONTH_OFFSET || start.getUTCDate() !== day) return null;
  const end = new Date(Date.UTC(year, month - MONTH_OFFSET, day + 1));
  return `${compactDate(start)}/${compactDate(end)}`;
}

/**
 * Builds a URL from fixed parts plus one free-text parameter, trimming that text (by whole
 * characters, with an ellipsis) until the URL fits the cap.
 */
function fitLink(prefix: string, suffix: string, text: string): string {
  // Efficiency: one pass when the text fits; otherwise a few 10% trims, never per character.
  let chars = Array.from(clip(text, MAX_LINK_CHARS));
  let candidate = chars.join('');
  const fixed = prefix.length + suffix.length;
  while (chars.length > 0 && fixed + encodeURIComponent(candidate).length > MAX_LINK_CHARS) {
    chars = chars.slice(0, Math.floor(chars.length * TRIM_RATIO));
    candidate = `${chars.join('').trimEnd()}${ELLIPSIS}`;
  }
  return `${prefix}${encodeURIComponent(candidate)}${suffix}`;
}

/**
 * Google Calendar "add event" link for an all-day event on `isoDate`; an invalid date
 * still yields a usable link, just without a pre-filled date.
 * @example
 * buildGoogleCalendarUrl({ title: 'Book the caterer', isoDate: '2026-11-05', details: 'Ask about Jain food' });
 * // 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Book%20the%20caterer&dates=20261105/20261106&details=Ask%20about%20Jain%20food'
 */
export function buildGoogleCalendarUrl(input: CalendarEventInput): string {
  const range = allDayRange(input.isoDate);
  const head = [
    'action=TEMPLATE',
    `text=${encodeURIComponent(clip(input.title, MAX_TITLE_CHARS))}`,
    ...(range === null ? [] : [`dates=${range}`]),
  ].join('&');
  return fitLink(`${CALENDAR_BASE}?${head}&details=`, '', input.details);
}

/**
 * Google Maps search link (Maps URLs API, no key).
 * @example
 * buildMapsSearchUrl('caterer in Jaipur'); // 'https://www.google.com/maps/search/?api=1&query=caterer%20in%20Jaipur'
 */
export function buildMapsSearchUrl(query: string): string {
  return fitLink(`${MAPS_SEARCH_BASE}?api=1&query=`, '', query);
}

/**
 * Google Maps directions link to a destination, optionally for one travel mode.
 * @example
 * buildMapsDirectionsUrl('Birla Auditorium, Jaipur', 'two-wheeler');
 * // 'https://www.google.com/maps/dir/?api=1&destination=Birla%20Auditorium%2C%20Jaipur&travelmode=two-wheeler'
 */
export function buildMapsDirectionsUrl(destination: string, travelMode?: MapsTravelMode): string {
  const mode = travelMode === undefined ? '' : `&travelmode=${travelMode}`;
  return fitLink(`${MAPS_DIRECTIONS_BASE}?api=1&destination=`, mode, destination);
}

/**
 * Gmail compose link with recipient, subject and body pre-filled; the body is trimmed to fit.
 * @example
 * buildGmailComposeUrl({ subject: 'Catering enquiry', body: 'Namaste' });
 * // 'https://mail.google.com/mail/?view=cm&fs=1&su=Catering%20enquiry&body=Namaste'
 */
export function buildGmailComposeUrl(input: MailInput): string {
  const to =
    input.to === undefined ? '' : `&to=${encodeURIComponent(clip(input.to, MAX_TITLE_CHARS))}`;
  const subject = `&su=${encodeURIComponent(clip(input.subject, MAX_TITLE_CHARS))}`;
  return fitLink(`${GMAIL_BASE}?view=cm&fs=1${to}${subject}&body=`, '', input.body);
}

/**
 * mailto: fallback for mail apps other than Gmail.
 * @example
 * buildMailtoUrl({ subject: 'Hi', body: 'Namaste' }); // 'mailto:?subject=Hi&body=Namaste'
 */
export function buildMailtoUrl(input: MailInput): string {
  const to = input.to === undefined ? '' : encodeURIComponent(clip(input.to, MAX_TITLE_CHARS));
  const subject = encodeURIComponent(clip(input.subject, MAX_TITLE_CHARS));
  return fitLink(`mailto:${to}?subject=${subject}&body=`, '', input.body);
}

/**
 * YouTube search link for an idea's tutorial (no embed, no key).
 * @example
 * buildYoutubeSearchUrl('marigold toran diy'); // 'https://www.youtube.com/results?search_query=marigold%20toran%20diy'
 */
export function buildYoutubeSearchUrl(query: string): string {
  return fitLink(`${YOUTUBE_BASE}?search_query=`, '', query);
}

/**
 * WhatsApp share link (wa.me) with the message pre-filled; the user picks the chat.
 * @example
 * buildWhatsAppUrl('Plan ready'); // 'https://wa.me/?text=Plan%20ready'
 */
export function buildWhatsAppUrl(text: string): string {
  return fitLink(`${WHATSAPP_BASE}?text=`, '', text);
}
