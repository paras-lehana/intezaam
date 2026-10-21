/**
 * Feature tiles, part 1: Assistant and Budgets.
 *
 * Responsibility: the user-facing title, one-line description and target of each tile in
 * these two groups. Boundary: copy only; every claim describes what the plan page does.
 */
import { type Feature } from './feature-types';

export const DECIDE_FEATURES: readonly Feature[] = [
  {
    id: 1,
    group: 'assistant',
    target: 'details',
    title: 'Four kinds of celebration',
    body: 'Weddings in 9 traditions, birthdays from a first birthday to a 60th, community festivals and family functions such as a griha pravesh.',
  },
  {
    id: 2,
    group: 'assistant',
    target: 'details',
    title: 'Describe it in your words',
    body: 'Type a brief in English, Hindi or Hinglish — “2 lakh mein 200 log, Jaipur”. Gemini reads it and you confirm what it understood.',
  },
  {
    id: 3,
    group: 'assistant',
    target: 'details',
    title: 'Five questions, then optional detail',
    body: 'Event, date (or “not fixed yet”), city, guests and budget. Tradition, food, priorities, style and access needs are optional.',
  },
  {
    id: 4,
    group: 'assistant',
    target: 'details',
    title: 'Try a sample',
    body: 'A Jaipur wedding, a Bengaluru birthday or a society Ganesh utsav fills the form. Nothing runs until you press Plan.',
  },
  {
    id: 6,
    group: 'assistant',
    target: 'overview',
    title: 'Plan verdict',
    body: 'Two answers — can the money work, and is there time? Community events also get a funding answer. Each comes with its reasons.',
  },
  {
    id: 7,
    group: 'assistant',
    target: 'overview',
    title: '“Why this?” on every number',
    body: 'Each amount and flag shows its rule, the details that triggered it, its source and a confidence grade. Assumptions are labelled.',
  },
  {
    id: 8,
    group: 'assistant',
    target: 'overview',
    title: 'Your plan in plain words',
    body: 'A short explanation and the three best next steps, written from the computed facts only.',
  },
  {
    id: 9,
    group: 'assistant',
    target: 'overview',
    title: 'Readiness score',
    body: 'A score out of 100 from core vendors booked, permissions done, contingency kept and days left.',
  },
  {
    id: 35,
    group: 'assistant',
    target: 'safety',
    title: 'Risk radar',
    body: 'Noise curfew, rain, peak-date pressure, overruns, crowd size and capacity — each with its cause and fix, severity written out.',
  },
  {
    id: 37,
    group: 'assistant',
    target: 'what-if',
    title: 'What if…',
    body: 'Change guests, budget, date, setting or functions and see what moves — numbers, risks and tasks, recomputed instantly.',
  },
  {
    id: 38,
    group: 'assistant',
    target: 'ask',
    title: 'Ask Intezaam',
    body: 'Ask about your plan in your own words. Answers cite the plan; a change you ask for is shown first and applied only when you agree.',
  },
  {
    id: 5,
    group: 'budgets',
    target: 'money',
    title: 'Estimate it for me',
    body: 'No budget yet? Get a mid-range estimate from your guests, your city and the size of the event.',
  },
  {
    id: 10,
    group: 'budgets',
    target: 'money',
    title: 'A split that adds up',
    body: 'Every category in exact rupees that total your budget. Priorities get more, the line you cut gets less, contingency keeps a floor.',
  },
  {
    id: 11,
    group: 'budgets',
    target: 'money',
    title: 'Bottom-up cost check',
    body: 'Per-plate cost × expected guests × menu × city, plus service and rooms, compared with the split. Gaps are flagged.',
  },
  {
    id: 12,
    group: 'budgets',
    target: 'money',
    title: 'GST on each line',
    body: 'The GST rate per category, with a note that the final rate depends on how the contract is written.',
  },
  {
    id: 13,
    group: 'budgets',
    target: 'money',
    title: 'Costed levers',
    body: 'When money is tight: fewer guests, an off-peak date, one function fewer or a home party — each with its rupee saving.',
  },
  {
    id: 14,
    group: 'budgets',
    target: 'money',
    title: 'Spend tracker',
    body: 'Planned, committed and paid per line, with a warning at 90% and a flag when a line goes over.',
  },
  {
    id: 15,
    group: 'budgets',
    target: 'money',
    title: 'Payment calendar',
    body: 'Advance, mid and final payments per vendor, rolled up into the cash you need each month.',
  },
  {
    id: 25,
    group: 'budgets',
    target: 'people',
    title: 'Headcount forecast',
    body: 'From invited to expected guests: the plate guarantee for the caterer, how many to cook for, and rooms for guests from out of town.',
  },
  {
    id: 26,
    group: 'budgets',
    target: 'people',
    title: 'Food planner',
    body: 'Separate Jain, veg, non-veg or halal counters, half portions for children and a Jain meal before sunset.',
  },
];
