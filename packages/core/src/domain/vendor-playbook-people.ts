/**
 * Vendor playbook, part 2: looks, music and ritual vendors (VEN-03).
 *
 * Responsibility: the questions, written commitments and red flags for makeup, mehendi,
 * outfits, jewellery, music, performers, officiants and idol makers, drawing on the
 * noise rules, tradition hard rules and planning guides.
 * Boundary: a "planner checklist", not legal or religious advice; merged in
 * vendor-playbook.ts.
 */
import type { PeopleVendor, PlaybookEntry } from './vendor-playbook-types.js';

/** Music vendors share the noise-rule question: outdoor amplified sound stops at 10 pm. */
const STOP_TIME_QUESTION = 'Will you stop amplified music by 10 pm outdoors, or play indoors?';

export const PEOPLE_PLAYBOOK: Readonly<Record<PeopleVendor, PlaybookEntry>> = {
  makeup: {
    questions: [
      'Is a trial included?',
      'How many looks and family members are covered?',
      'Which products do you use?',
    ],
    getInWriting: ['Looks, people, timings and the trial date'],
    redFlags: ['Refuses a trial'],
    sourceIds: ['S-MANYAVAR-2024'],
  },
  mehendi: {
    questions: [
      'How many artists, and how many guests per hour?',
      'Natural henna only, with no chemical dyes?',
    ],
    getInWriting: ['Artists, hours and the number of guests'],
    redFlags: ['Black or chemical henna'],
    sourceIds: ['S-INTEZAAM-D'],
  },
  attire: {
    questions: [
      'How many fittings, and is the final fitting at least 30 days before?',
      'Can it be altered after delivery?',
    ],
    getInWriting: ['Delivery date and alteration terms'],
    redFlags: ['A custom order with less than two months to go'],
    sourceIds: ['S-MANYAVAR-2024'],
  },
  jeweller: {
    questions: [
      'Is the bill split into gold weight, making charges and GST?',
      'What are the exchange and buy-back terms?',
    ],
    getInWriting: ['Hallmark and weight on the bill'],
    redFlags: ['No hallmark'],
    sourceIds: ['S-INTEZAAM-D'],
  },
  dj_band: {
    questions: [STOP_TIME_QUESTION, 'Do you take a playlist and a do-not-play list?'],
    getInWriting: ['Hours and the stop time', 'Equipment and power needs'],
    redFlags: ['Promises to play past the legal stop time'],
    sourceIds: ['S-NOISE-RULE5-ND'],
  },
  dhol: {
    questions: ['How many players, and for how long?', 'Is the baraat timed with the venue?'],
    getInWriting: ['Players and hours'],
    redFlags: ['Hourly charges with no cap'],
    sourceIds: ['S-INTEZAAM-D'],
  },
  band_baaja: {
    questions: [
      'What is the band size, and is a ghodi or baggi included?',
      'Who arranges police permission for a baraat on public roads?',
    ],
    getInWriting: ['What is included and the route'],
    redFlags: ['No plan for road permission'],
    sourceIds: ['S-INTEZAAM-D'],
  },
  choreographer: {
    questions: ['How many sessions and songs?', 'Where do rehearsals happen?'],
    getInWriting: ['Sessions and dates'],
    redFlags: ['No fixed number of sessions'],
    sourceIds: ['S-INTEZAAM-D'],
  },
  entertainer: {
    questions: [
      'Which age group does the act suit?',
      'How long is it, and how much space does it need?',
      STOP_TIME_QUESTION,
    ],
    getInWriting: ['Act, duration and arrival time'],
    redFlags: ['No references from past events'],
    sourceIds: ['S-CHARMBOX-2026'],
  },
  nadaswaram: {
    questions: ['Which rituals do you play for, and for how long?'],
    getInWriting: ['Timings around the muhurtham'],
    redFlags: ['Not available at the muhurtham time'],
    sourceIds: ['S-WIKI-TELUGU'],
  },
  pandit: {
    questions: [
      'Please confirm the muhurat for our date and time.',
      'Which samagri do we arrange, and what do you bring?',
      'How long do the rituals take?',
    ],
    getInWriting: ['Date, muhurat time and dakshina'],
    redFlags: ['Dakshina left unclear until the day'],
    sourceIds: ['S-IMW-2026'],
  },
  granthi: {
    questions: [
      'Which gurdwara dates are free for the Anand Karaj?',
      'How are langar arrangements made?',
    ],
    getInWriting: ['Date and time slot'],
    redFlags: ['Any suggestion to hold the Laavan at a resort mandap'],
    sourceIds: ['S-WIKI-ANAND-KARAJ'],
  },
  qazi: {
    questions: [
      'Which documents and witnesses does the nikahnama need?',
      'Has the mahr been agreed by both families?',
    ],
    getInWriting: ['Date, time and documents'],
    redFlags: ['No plan to register the marriage'],
    sourceIds: ['S-WIKI-NIKAH'],
  },
  church_minister: {
    questions: [
      'When will the banns or notice be read?',
      'Can the ceremony be held between 6 am and 7 pm?',
    ],
    getInWriting: ['Date, time and documents'],
    redFlags: ['A ceremony time outside 6 am–7 pm without special permission'],
    sourceIds: ['S-WIKI-ICMA', 'S-WIKI-BANNS'],
  },
  idol_maker: {
    questions: [
      'Is the idol made of clay rather than plaster of Paris?',
      'What height, and when is it delivered?',
    ],
    getInWriting: ['Size, material and delivery date'],
    redFlags: ['Plaster of Paris idols, which pollute water at visarjan'],
    sourceIds: ['S-INTEZAAM-D'],
  },
};
