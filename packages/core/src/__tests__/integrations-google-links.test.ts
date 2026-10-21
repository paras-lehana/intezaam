/**
 * Tests for the no-key Google and WhatsApp link builders.
 *
 * Responsibility: every builder points at the documented base URL, URL-encodes user text
 * (so "&" or "#" can never add a parameter), stays under MAX_LINK_CHARS for any input and
 * never splits a surrogate pair. Boundary: string checks only; no network.
 */
import { describe, expect, it } from 'vitest';
import {
  buildGmailComposeUrl,
  buildGoogleCalendarUrl,
  buildMailtoUrl,
  buildMapsDirectionsUrl,
  buildMapsSearchUrl,
  buildWhatsAppUrl,
  buildYoutubeSearchUrl,
  MAPS_TRAVEL_MODES,
  MAX_LINK_CHARS,
} from '../integrations/google-links.js';

/** Long enough that every builder must trim it to stay under the link cap. */
const LONG_TEXT = 'शादी की तैयारी & checklist # '.repeat(400);

describe('buildGoogleCalendarUrl', () => {
  it('builds an all-day template with an exclusive end date', () => {
    const url = new URL(
      buildGoogleCalendarUrl({
        title: 'Book the venue',
        isoDate: '2026-11-25',
        details: 'Ask about parking',
      }),
    );
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('text')).toBe('Book the venue');
    expect(url.searchParams.get('dates')).toBe('20261125/20261126');
    expect(url.searchParams.get('details')).toBe('Ask about parking');
  });

  it('rolls the end date over month and year ends', () => {
    const url = new URL(
      buildGoogleCalendarUrl({ title: 'Wedding', isoDate: '2026-12-31', details: '' }),
    );
    expect(url.searchParams.get('dates')).toBe('20261231/20270101');
  });

  it('leaves dates out for a malformed or impossible date instead of guessing', () => {
    for (const isoDate of ['2026-02-30', '25-11-2026', '']) {
      const url = new URL(buildGoogleCalendarUrl({ title: 'x', isoDate, details: 'y' }));
      expect(url.searchParams.has('dates')).toBe(false);
    }
  });

  it('encodes characters that would otherwise add parameters', () => {
    const url = new URL(
      buildGoogleCalendarUrl({
        title: 'Haldi & Mehendi #1',
        isoDate: '2026-11-24',
        details: 'a=b&c=d',
      }),
    );
    expect(url.searchParams.get('text')).toBe('Haldi & Mehendi #1');
    expect(url.searchParams.get('details')).toBe('a=b&c=d');
    expect(url.hash).toBe('');
  });

  it('caps the title and trims long details to fit the link limit', () => {
    const url = buildGoogleCalendarUrl({
      title: LONG_TEXT,
      isoDate: '2026-11-25',
      details: LONG_TEXT,
    });
    expect(url.length).toBeLessThanOrEqual(MAX_LINK_CHARS);
    expect(new URL(url).searchParams.get('details')?.endsWith('…')).toBe(true);
  });
});

describe('Maps links', () => {
  it('searches with the documented api=1 form', () => {
    const url = new URL(buildMapsSearchUrl('caterer in Jaipur'));
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/search/');
    expect(url.searchParams.get('api')).toBe('1');
    expect(url.searchParams.get('query')).toBe('caterer in Jaipur');
  });

  it('adds a travel mode only when asked', () => {
    expect(
      new URL(buildMapsDirectionsUrl('Rambagh Palace, Jaipur')).searchParams.has('travelmode'),
    ).toBe(false);
    for (const mode of MAPS_TRAVEL_MODES) {
      const url = new URL(buildMapsDirectionsUrl('Rambagh Palace, Jaipur', mode));
      expect(url.searchParams.get('destination')).toBe('Rambagh Palace, Jaipur');
      expect(url.searchParams.get('travelmode')).toBe(mode);
    }
  });

  it('keeps an over-long query under the cap', () => {
    expect(buildMapsSearchUrl(LONG_TEXT).length).toBeLessThanOrEqual(MAX_LINK_CHARS);
    expect(buildMapsDirectionsUrl(LONG_TEXT, 'two-wheeler').length).toBeLessThanOrEqual(
      MAX_LINK_CHARS,
    );
  });
});

describe('mail links', () => {
  it('opens Gmail compose with recipient, subject and body', () => {
    const url = new URL(
      buildGmailComposeUrl({
        to: 'vendor@example.com',
        subject: 'Enquiry: 25 Nov',
        body: 'Are you free?',
      }),
    );
    expect(url.origin + url.pathname).toBe('https://mail.google.com/mail/');
    expect(url.searchParams.get('view')).toBe('cm');
    expect(url.searchParams.get('to')).toBe('vendor@example.com');
    expect(url.searchParams.get('su')).toBe('Enquiry: 25 Nov');
    expect(url.searchParams.get('body')).toBe('Are you free?');
  });

  it('omits the recipient when there is none', () => {
    const url = new URL(buildGmailComposeUrl({ subject: 'Hi', body: 'Hello' }));
    expect(url.searchParams.has('to')).toBe(false);
  });

  it('builds a mailto fallback that is encoded and capped', () => {
    expect(buildMailtoUrl({ to: 'a@b.in', subject: 'Hi & bye', body: 'x' })).toBe(
      'mailto:a%40b.in?subject=Hi%20%26%20bye&body=x',
    );
    expect(buildMailtoUrl({ subject: 's', body: 'b' }).startsWith('mailto:?subject=s')).toBe(true);
    expect(buildMailtoUrl({ subject: 's', body: LONG_TEXT }).length).toBeLessThanOrEqual(
      MAX_LINK_CHARS,
    );
  });
});

describe('YouTube and WhatsApp links', () => {
  it('searches YouTube for the query', () => {
    const url = new URL(buildYoutubeSearchUrl('DIY marigold toran'));
    expect(url.origin + url.pathname).toBe('https://www.youtube.com/results');
    expect(url.searchParams.get('search_query')).toBe('DIY marigold toran');
  });

  it('builds a wa.me share link with the text encoded', () => {
    const url = new URL(buildWhatsAppUrl('*Riya weds Arjun*\nNext steps: 1. Book venue'));
    expect(url.origin + url.pathname).toBe('https://wa.me/');
    expect(url.searchParams.get('text')).toBe('*Riya weds Arjun*\nNext steps: 1. Book venue');
  });

  it('never splits an emoji or throws on a lone surrogate', () => {
    const emoji = '🎉'.repeat(3_000);
    const url = buildWhatsAppUrl(emoji);
    expect(url.length).toBeLessThanOrEqual(MAX_LINK_CHARS);
    expect(() => decodeURIComponent(url)).not.toThrow();
    expect(new URL(buildWhatsAppUrl('a\uD800b')).searchParams.get('text')).toBe('a�b');
  });
});
