/**
 * Puja and festival briefs beyond the B battery: short, real-world phrasings that sit on
 * the line between a family function and a community event.
 *
 * Responsibility: a festival puja at home stays a family function, while the same festival at a
 * pandal or in a housing society is a community event; "pooja" and "ganesh puja" spellings; a
 * relative week ("agle hafte", "is hafte") as a flexible month, never a single day; flats as
 * households, never guests. Boundary: labelled test data only, in the battery's case shape; the
 * ids start with P so they never collide with the battery's B rows.
 */
import type { BriefCase } from './brief-case.js';

export const PUJA_FESTIVAL_BRIEFS: readonly BriefCase[] = [
  {
    id: 'P01',
    lang: 'EN',
    text: 'Durga puja pandal Kolkata',
    expect: {
      family: 'community',
      kind: 'festival-pandal',
      city: 'Kolkata',
      dateFlexible: true,
    },
    festival: 'durga-puja',
    missing: ['guests', 'budget'],
    absent: ['premises'],
    tests:
      'A pandal makes Durga Puja a community event; a pandal can stand on public ground or a club plot, so the premises stay for the form',
  },
  {
    id: 'P02',
    lang: 'EN',
    text: 'Durga puja society',
    expect: {
      family: 'community',
      kind: 'society-festival',
      dateFlexible: true,
      premises: 'private',
    },
    festival: 'durga-puja',
    missing: ['city', 'guests', 'budget'],
    absent: ['households'],
    tests: 'A society makes it a festival in its own compound; no flat count is invented',
  },
  {
    id: 'P03',
    lang: 'HG',
    text: 'Diwali puja ghar pe 20 log',
    expect: {
      family: 'family-function',
      kind: 'home-puja',
      dateFlexible: true,
      guests: 20,
      venueSetting: 'home',
    },
    festival: 'diwali',
    missing: ['city', 'budget'],
    absent: ['premises', 'households'],
    tests: 'A festival puja "ghar pe" is a family function at home, not a community event',
  },
  {
    id: 'P04',
    lang: 'EN',
    text: 'satvik food, puja',
    expect: { family: 'family-function', kind: 'home-puja', diet: { menu: 'veg' } },
    missing: ['date', 'city', 'guests', 'budget'],
    absent: ['month', 'dateIso'],
    tests: 'Satvik food is a veg menu; a puja with no festival named gets no guessed date',
  },
  {
    id: 'P05',
    lang: 'HG',
    text: 'Lakshmi pooja 30 log',
    expect: { family: 'family-function', kind: 'home-puja', guests: 30 },
    missing: ['date', 'city', 'budget'],
    absent: ['month', 'dateIso'],
    tests:
      'The "pooja" spelling; Lakshmi puja falls at Diwali, Kojagari and on Fridays, so no month is guessed',
  },
  {
    id: 'P06',
    lang: 'HG',
    text: 'agle hafte birthday',
    expect: { family: 'birthday', month: 10, dateFlexible: true },
    missing: ['city', 'guests', 'budget'],
    absent: ['kind', 'dateIso'],
    tests:
      'Next week from Tuesday 20 Oct is a flexible window in October, not one day; no age, so no birthday kind',
  },
  {
    id: 'P07',
    lang: 'HG',
    text: 'is hafte mundan 20 log',
    expect: {
      family: 'family-function',
      kind: 'naming-mundan',
      month: 10,
      dateFlexible: true,
      guests: 20,
    },
    missing: ['city', 'budget'],
    absent: ['dateIso'],
    tests: 'This week is a flexible window in the current month, not one day',
  },
  {
    id: 'P08',
    lang: 'EN',
    text: 'Ganesh puja in our society 100 flats',
    expect: {
      family: 'community',
      kind: 'society-festival',
      dateFlexible: true,
      households: 100,
      premises: 'private',
    },
    festival: 'ganesh-chaturthi',
    missing: ['city', 'guests', 'budget'],
    absent: ['guests'],
    tests: '"Ganesh puja" names the festival; flats are households, never guests',
  },
];
