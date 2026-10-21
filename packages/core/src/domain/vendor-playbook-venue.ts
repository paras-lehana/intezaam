/**
 * Vendor playbook, part 1: venue, food, decor and photo/video (VEN-03).
 *
 * Responsibility: the questions, written commitments and red flags for each vendor,
 * drawn from published catering and venue guides, the noise rules,
 * accessibility guidance and the owner's venue checklist. Figures the
 * questions quote (royalty, servers, service charge, GST) are read from their domain tables.
 * Boundary: a "planner checklist", not legal advice; merged in vendor-playbook.ts.
 */
import { GUESTS_PER_SERVER, OUTSIDE_CATERER_ROYALTY_INR, SERVICE_CHARGE_PCT } from './catering.js';
import { GST_SERVICES } from './gst.js';
import { rangeText } from './units.js';
import type { PlaybookEntry, VenueFoodVendor } from './vendor-playbook-types.js';

/** CST-02 + CST-06 as a caterer quotes them: service from the standard to the premium class. */
const SERVICE_CHARGE_TEXT = `${SERVICE_CHARGE_PCT.standard}–${SERVICE_CHARGE_PCT.premium}%`;
const CATERING_GST_TEXT = `${GST_SERVICES['outdoor-catering'].ratePct}%`;

export const VENUE_FOOD_PLAYBOOK: Readonly<Record<VenueFoodVendor, PlaybookEntry>> = {
  venue: {
    questions: [
      `Is an outside caterer allowed, and is there a royalty per plate (₹${rangeText(OUTSIDE_CATERER_ROYALTY_INR)} at hotels)?`,
      'What is the minimum plate guarantee, and what is billed if fewer guests come?',
      'Until what time may amplified music play, and is the hall a closed premises after 10 pm?',
      'Is alcohol allowed, and who holds the licence?',
      'Does the venue have a fire NOC and an occupancy limit above your guest count?',
      'Is there step-free access, an accessible toilet and a lift?',
    ],
    getInWriting: [
      'Date, hours and the exact spaces booked',
      'Plate guarantee, royalty and everything the rental includes',
      'Cancellation and refund terms, with a GST invoice',
    ],
    redFlags: [
      'No written cancellation or refund clause',
      'A capacity above what the floor area can hold',
      'Cash-only payments with no receipt',
    ],
    sourceIds: ['S-VKPLATE-2026', 'S-NOISE-RULE5-ND', 'S-GKTODAY-2021', 'S-OWNER-DEFAULTS'],
  },
  tent_house: {
    questions: [
      'Is the hangar or tent waterproof, and is raised flooring included?',
      'Who sets it up and takes it down, and on which days?',
      'Are cables covered and the generator fenced off?',
    ],
    getInWriting: ['Size, structure type and set-up dates', 'Rain-proofing and flooring'],
    redFlags: ['No fire extinguishers on site', 'Exposed wiring'],
    sourceIds: ['S-NDMA-2014', 'S-THEPRINT-2026'],
  },
  caterer: {
    questions: [
      `Is the price per plate, and does it include ${CATERING_GST_TEXT} GST and the service charge (often ${SERVICE_CHARGE_TEXT})?`,
      `How many servers: about 1 per ${rangeText(GUESTS_PER_SERVER.buffet)} guests at a buffet, 1 per ${rangeText(GUESTS_PER_SERVER.plated)} when plated?`,
      'Can you run separate Jain, veg and non-veg (or halal) counters with separate utensils?',
      'When can we do a tasting?',
    ],
    getInWriting: [
      'The final menu for each function',
      'The plate guarantee and the price of extra plates',
      'Staff numbers and serving hours',
    ],
    redFlags: [
      'Refuses a tasting',
      'Will not say what the plate price includes',
      'No food-safety or licence details',
    ],
    sourceIds: ['S-VKPLATE-2026', 'S-RSA-2026', 'S-WIKI-JAIN-DIET'],
  },
  cake: {
    questions: ['Do you offer eggless or Jain-friendly cakes?', 'When is it delivered and set up?'],
    getInWriting: ['Flavour, size, design and delivery time'],
    redFlags: ['No delivery time commitment'],
    sourceIds: ['S-CHARMBOX-2026'],
  },
  bartender: {
    questions: [
      'Who holds the bar licence for this venue and date? Rules differ by state; check locally.',
      'Is there a mocktail menu for guests who do not drink?',
    ],
    getInWriting: ['Bar hours and what is included per head'],
    redFlags: ['Offers to serve without a licence'],
    sourceIds: ['S-INTEZAAM-D'],
  },
  decorator: {
    questions: [
      'Does the quote include set-up and teardown? Expect 15–20% above the first quote.',
      'What is the rain plan if anything is outdoors?',
      'What exactly is included in the reference photos?',
    ],
    getInWriting: ['An itemised decor list for each function', 'Set-up and removal times'],
    redFlags: ['A quote with no item list', 'A large advance before any design is agreed'],
    sourceIds: ['S-VKPLATE-2026', 'S-RSA-2026'],
  },
  florist: {
    questions: [
      'Fresh or artificial flowers, and which are in season?',
      'When are garlands delivered?',
    ],
    getInWriting: ['Flower list and delivery times'],
    redFlags: ['No policy for substitutions'],
    sourceIds: ['S-INTEZAAM-D'],
  },
  sound_light: {
    questions: [
      'Can the system stay within the noise limits, and who switches it off at the stop time?',
      'Is there a backup for power cuts?',
    ],
    getInWriting: ['Equipment list and operating hours'],
    redFlags: ['Promises loud outdoor music after 10 pm'],
    sourceIds: ['S-NOISE-RULE5-ND'],
  },
  generator: {
    questions: ['Is the generator fenced off, with fuel stored separately?', 'Who operates it?'],
    getInWriting: ['Capacity (kVA) and running hours'],
    redFlags: ['No earthing or fencing'],
    sourceIds: ['S-NDMA-2014'],
  },
  photographer: {
    questions: [
      'How many photographers, and how many hours at each function?',
      'When are the edited photos and the album delivered?',
      'Do we get the raw files?',
      'Are travel and stay extra?',
    ],
    getInWriting: ['Deliverables and delivery dates', 'Number of edited photos and album pages'],
    redFlags: ['No delivery date in writing', 'The full balance demanded before the album arrives'],
    sourceIds: ['S-INTEZAAM-D'],
  },
  videographer: {
    questions: [
      'How long are the highlight film and the full film?',
      'Is drone footage included, and does the venue allow it?',
      'When are the films delivered?',
    ],
    getInWriting: ['Deliverables and delivery dates'],
    redFlags: ['No sample films from real events'],
    sourceIds: ['S-INTEZAAM-D'],
  },
};
