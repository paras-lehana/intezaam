/**
 * Feature tiles, part 2: Timelines, Vendor checklists and Ideas (synthesis §3 D, E, G).
 *
 * Responsibility: the user-facing title, one-line description and target of each tile in
 * these three groups. Boundary: copy only; every claim describes what the plan page does.
 */
import { type Feature } from './feature-types';

export const PLAN_FEATURES: readonly Feature[] = [
  {
    id: 16,
    group: 'timelines',
    target: 'timeline',
    title: 'Counted back from your date',
    body: 'Tasks in eight phases with due dates. Short on time? It compresses and shows what to do now. No date yet? It starts with “pick your date”.',
  },
  {
    id: 17,
    group: 'timelines',
    target: 'timeline',
    title: 'Date intelligence',
    body: 'Peak season, indicative muhurat dates, Chaturmas and Kharmas for Hindu traditions, festival clashes and rainy months — to confirm with your priest.',
  },
  {
    id: 18,
    group: 'timelines',
    target: 'timeline',
    title: 'Functions and days',
    body: 'Each function — haldi, sangeet, bhog, party — gets its day, its share of guests and its slice of the budget, following your tradition.',
  },
  {
    id: 19,
    group: 'timelines',
    target: 'timeline',
    title: 'Day-of run sheet',
    body: 'Time slots per function with vendor arrival times, buffers and an owner for each, ready to print.',
  },
  {
    id: 20,
    group: 'timelines',
    target: 'timeline',
    title: 'Google Calendar and .ics',
    body: 'Add any milestone to Google Calendar in one tap, or download the whole timeline as an .ics file.',
  },
  {
    id: 21,
    group: 'vendors',
    target: 'vendors',
    title: 'A checklist per vendor',
    body: 'Book-by date, questions to ask, what to get in writing, red flags, GST and the payment schedule for every vendor you need.',
  },
  {
    id: 22,
    group: 'vendors',
    target: 'vendors',
    title: 'Find near you',
    body: 'A Google Maps search for each kind of vendor in your city. No paid listings.',
  },
  {
    id: 23,
    group: 'vendors',
    target: 'vendors',
    title: 'Enquiry message',
    body: 'A polite enquiry for any vendor, drafted in your language and ready for Gmail or WhatsApp.',
  },
  {
    id: 24,
    group: 'vendors',
    target: 'vendors',
    title: 'Quote reader',
    body: 'Paste up to three quotes. Code works out totals for your guest count with GST and lists neutral differences and questions. It never picks a vendor.',
  },
  {
    id: 27,
    group: 'vendors',
    target: 'people',
    title: 'Venue space check',
    body: 'Area and layout become a capacity, with a warning when your guest count will not fit.',
  },
  {
    id: 29,
    group: 'ideas',
    target: 'ideas',
    title: 'Ideas that fit',
    body: 'Themes, decor, menus, activities and return gifts within your budget, season, setting, diet and style — each with a cost band and a YouTube link.',
  },
  {
    id: 30,
    group: 'ideas',
    target: 'ideas',
    title: 'Style quiz',
    body: 'Eight quick either-or questions turn your taste into the style tags your ideas follow.',
  },
  {
    id: 31,
    group: 'ideas',
    target: 'ideas',
    title: 'Invitations and messages',
    body: 'Invitations, RSVP reminders, volunteer briefs and thank-you notes in 11 languages.',
  },
];
