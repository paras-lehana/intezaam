/**
 * Curated ideas, part 3: community events — society festivals, pandals, satsangs, national
 * days and drives (feature #29 offline library).
 *
 * Responsibility: low-cost, volunteer-friendly decor, activities, food service and music
 * for housing societies and committees, with eco options (natural-clay idols, steel plates)
 * and quiet-hours-friendly music (Noise Rules 2000, 04 §6.1). No prices: code attaches the
 * cost band. Boundary: data only.
 */
import type { LibraryIdea } from './idea-types.js';

export const COMMUNITY_IDEAS: readonly LibraryIdea[] = [
  {
    category: 'decor',
    title: 'Natural-clay idol and natural colours',
    description:
      'Choose an unpainted or naturally coloured clay idol and dissolve it in a tank on the premises instead of a lake.',
    why: ['eco', 'Protects local water and avoids an immersion procession.'],
    effort: 'low',
    eco: true,
    costBand: 'within',
    youtubeQuery: 'eco friendly ganesh idol clay',
    fit: { families: ['community'], styles: ['traditional'] },
  },
  {
    category: 'decor',
    title: "Residents' rangoli competition",
    description:
      'Each wing or floor makes one rangoli at the entrance on the first evening; residents vote by sticking a bindi on their favourite.',
    why: ['budget', 'Decorates the premises with almost no spend.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'rangoli competition ideas society',
    fit: { families: ['community'], styles: ['traditional', 'colourful'] },
  },
  {
    category: 'decor',
    title: 'Diya-lit walkway',
    description:
      'Clay diyas or LED tea lights along the main path and steps; volunteers relight them through the evening.',
    why: ['style', 'A traditional glow that suits any festival night.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'diya decoration pathway ideas',
    fit: { families: ['community', 'family-function'], styles: ['traditional', 'minimal'] },
  },
  {
    category: 'decor',
    title: 'Paper lanterns made by residents',
    description:
      'A Sunday workshop where children and elders make paper lanterns that then hang across the courtyard.',
    why: ['eco', 'Turns decor into an activity and reuses old paper.'],
    effort: 'med',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'paper lantern making diy',
    fit: { families: ['community'], styles: ['colourful', 'rustic'] },
  },
  {
    category: 'theme',
    title: 'Heritage-craft mela stalls',
    description:
      'Invite local artisans to run stalls (pottery, block printing, bangles) alongside the food stalls; residents shop and learn.',
    why: ['style', 'Gives a society festival a regional, cultural flavour.'],
    effort: 'high',
    eco: true,
    costBand: 'within',
    youtubeQuery: 'mela stall ideas society festival',
    fit: { families: ['community'], styles: ['regional', 'colourful', 'traditional'] },
  },
  {
    category: 'activity',
    title: "Children's drawing competition",
    description:
      "Age groups draw the festival's story on the first morning; every entry is displayed on the notice board for the week.",
    why: ['age-band', 'Involves the youngest residents at no cost.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'drawing competition ideas for kids festival',
    fit: { families: ['community'] },
  },
  {
    category: 'activity',
    title: "Residents' cultural night",
    description:
      'Dance, songs and skits by residents with a printed running order; end amplified sound by ten at night.',
    why: ['guests', 'The whole society performs and watches together.'],
    effort: 'med',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'society cultural programme ideas',
    fit: { families: ['community'] },
  },
  {
    category: 'activity',
    title: 'Garba workshop before the big night',
    description:
      'A short evening class teaches the basic steps so first-timers and children join the circle on the main night.',
    why: ['tradition', 'Helps every resident take part in Navratri.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'garba basic steps tutorial',
    fit: { families: ['community'], styles: ['traditional', 'colourful'] },
  },
  {
    category: 'activity',
    title: 'Sports-day relays and tug of war',
    description:
      'Relays by wing, sack races for children and a tug of war between residents and the committee; first aid on standby.',
    why: ['setting', 'Uses the society ground on a dry morning.'],
    effort: 'med',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'society sports day games ideas',
    fit: { families: ['community'], settings: ['outdoor', 'mixed'], seasons: ['winter', 'summer'] },
  },
  {
    category: 'activity',
    title: "Flag hoisting with a children's march",
    description:
      'Children carry paper flags in a short march to the flagpole, then a senior resident hoists the flag and all sing the anthem.',
    why: ['tradition', 'The heart of an Independence or Republic Day morning.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'independence day society celebration ideas',
    fit: { families: ['community'] },
  },
  {
    category: 'activity',
    title: 'Festival story quiz',
    description:
      "A quiz on the festival's stories and customs, run by the teenagers, with small prizes for each age group.",
    why: ['age-band', 'Keeps teenagers involved as hosts.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'festival quiz questions for kids',
    fit: { families: ['community'] },
  },
  {
    category: 'menu',
    title: 'Bhog served langar-style',
    description:
      'Residents sit in rows and volunteers serve the bhog: dignified, fast for a large crowd and easy to clean up.',
    why: ['guests', 'Serves a big crowd quickly with volunteers.'],
    effort: 'med',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'langar style food serving',
    fit: { families: ['community'], contains: ['root-veg'] },
  },
  {
    category: 'menu',
    title: 'Onam sadya on plantain leaves',
    description:
      "A vegetarian sadya served on plantain leaves with residents' families cooking the dishes together.",
    why: ['tradition', 'The way Onam is shared in Kerala.'],
    effort: 'high',
    eco: true,
    costBand: 'within',
    youtubeQuery: 'onam sadya serving order',
    fit: { families: ['community'], styles: ['regional', 'traditional'], contains: ['root-veg'] },
  },
  {
    category: 'menu',
    title: 'Steel plates and a washing station',
    description:
      'Borrow or rent steel plates and tumblers and set up a washing station instead of disposables.',
    why: ['eco', 'Cuts the biggest source of festival waste.'],
    effort: 'med',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'zero waste event steel plates',
    fit: { families: ['community', 'wedding', 'family-function'] },
  },
  {
    category: 'menu',
    title: 'Sherbet and nimbu-pani stall',
    description:
      'Rose sherbet, nimbu-pani and buttermilk from large steel drums: cheap, cooling and alcohol-free.',
    why: ['season', 'Cools a crowd on a hot day.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'sherbet stall ideas summer event',
    fit: { families: ['community', 'birthday', 'family-function'], seasons: ['summer'] },
  },
  {
    category: 'music',
    title: 'Bhajan sandhya with local singers',
    description:
      'An evening of bhajans by residents and a local mandali, acoustic or lightly amplified, closing before quiet hours.',
    why: ['tradition', 'Fits a religious gathering and needs little sound.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'bhajan sandhya programme',
    fit: { families: ['community', 'family-function'], styles: ['traditional'] },
  },
  {
    category: 'music',
    title: "School band or residents' choir",
    description:
      "Invite the local school band or form a residents' choir for the opening; rehearse twice in the week before.",
    why: ['budget', 'Live music without hiring a band.'],
    effort: 'med',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'community choir festival performance',
    fit: { families: ['community'] },
  },
  {
    category: 'favours',
    title: 'Cloth bags with the society logo',
    description:
      'Printed cloth bags for prasad or sweets that residents reuse for groceries all year.',
    why: ['eco', 'Replaces plastic bags with something useful.'],
    effort: 'low',
    eco: true,
    costBand: 'within',
    youtubeQuery: 'printed cloth bag return gift',
    fit: { families: ['community', 'family-function'] },
  },
];
