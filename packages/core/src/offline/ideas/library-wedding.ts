/**
 * Curated ideas, part 1: weddings and their functions (feature #29 offline library).
 *
 * Responsibility: wedding decor, themes, menus, activities and music that a family can
 * actually arrange in India, each tagged so code can filter it by style, season, setting
 * and diet (the owner's style quiz; diet rules). No prices: code attaches
 * the cost band. Boundary: data only; selection is in offline/ideas/select-ideas.ts.
 */
import type { LibraryIdea } from './idea-types.js';

export const WEDDING_IDEAS: readonly LibraryIdea[] = [
  {
    category: 'decor',
    title: 'Marigold and mango-leaf torans',
    description:
      'Strings of genda flowers and mango leaves over every doorway and the mandap: bright, traditional and composted after the wedding.',
    why: ['style', 'Fits a traditional, floral look and any florist can make them.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'marigold toran wedding decoration diy',
    fit: { families: ['wedding'], styles: ['traditional', 'floral', 'colourful'] },
  },
  {
    category: 'decor',
    title: 'Fairy-light canopy over the lawn',
    description:
      'Warm string lights criss-crossed above the dining area turn an open lawn into a glowing room for the sangeet or reception.',
    why: ['setting', 'Made for an outdoor or mixed venue after sunset.'],
    effort: 'med',
    eco: false,
    costBand: 'within',
    youtubeQuery: 'fairy light canopy outdoor wedding',
    fit: { families: ['wedding'], settings: ['outdoor', 'mixed'], seasons: ['winter', 'summer'] },
  },
  {
    category: 'decor',
    title: 'Brass urlis with floating flowers',
    description:
      'Rented brass urlis filled with water, rose petals and floating diyas at the entrance and on the stage steps.',
    why: ['style', 'A classic, traditional touch that rents instead of being bought.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'urli flower decoration ideas',
    fit: { families: ['wedding'], styles: ['traditional', 'classic', 'regional'] },
  },
  {
    category: 'decor',
    title: 'Block-print and mirror-work drapes',
    description:
      'Rajasthani block-print fabric and mirror-work panels behind the stage and seating give a royal, colourful backdrop.',
    why: ['style', 'Matches a royal or colourful style without a full set build.'],
    effort: 'med',
    eco: true,
    costBand: 'within',
    youtubeQuery: 'rajasthani theme wedding stage decor',
    fit: { families: ['wedding'], styles: ['royal', 'colourful', 'rustic'] },
  },
  {
    category: 'decor',
    title: 'Pastel floral photo arch',
    description:
      "One arch of pastel flowers and foliage at the entrance gives every guest a photo spot and doubles as the couple's backdrop.",
    why: ['style', 'Suits a pastel, floral or modern palette.'],
    effort: 'med',
    eco: false,
    costBand: 'within',
    youtubeQuery: 'pastel floral arch wedding diy',
    fit: { families: ['wedding'], styles: ['pastel', 'floral', 'modern'] },
  },
  {
    category: 'decor',
    title: 'Banana-leaf and kolam entrance',
    description:
      'Banana trunks at the gate and a large rice-flour kolam at the threshold, the way South Indian weddings traditionally welcome guests.',
    why: ['tradition', 'Rooted in South Indian custom and almost free to make.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'kolam wedding entrance decoration',
    fit: {
      families: ['wedding'],
      traditions: ['tamil', 'telugu'],
      styles: ['traditional', 'regional', 'minimal'],
    },
  },
  {
    category: 'theme',
    title: 'Royal haveli evening',
    description:
      'Lanterns, carved-wood props, folk musicians and safa turbans for the baraat side recreate a palace courtyard.',
    why: ['style', 'For a grand, royal style.'],
    effort: 'high',
    eco: false,
    costBand: 'splurge',
    youtubeQuery: 'royal haveli theme wedding decor',
    fit: { families: ['wedding'], styles: ['royal', 'grand'] },
  },
  {
    category: 'theme',
    title: 'Minimal white-and-green day wedding',
    description:
      'White flowers, green foliage and natural light for a daytime ceremony: calm, elegant and lighter on decor.',
    why: ['style', 'For a minimal, modern or intimate wedding.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'minimal white green wedding decor',
    fit: { families: ['wedding'], styles: ['minimal', 'modern', 'intimate', 'classic'] },
  },
  {
    category: 'theme',
    title: 'Rain-ready mehendi under a hangar',
    description:
      'Hold the mehendi under a waterproof hangar with raised flooring, bright umbrellas as props and a rain-proof sound setup.',
    why: ['season', "Keeps the function dry in your city's rainy months."],
    effort: 'med',
    eco: false,
    costBand: 'within',
    youtubeQuery: 'monsoon mehendi decor ideas',
    fit: { families: ['wedding'], seasons: ['monsoon'], settings: ['outdoor', 'mixed'] },
  },
  {
    category: 'menu',
    title: 'Live chaat counter',
    description:
      'Golgappe, aloo tikki and papdi chaat made fresh at a live counter keep guests busy before dinner.',
    why: ['guests', 'Feeds a crowd in batches and works in any season.'],
    effort: 'med',
    eco: false,
    costBand: 'within',
    youtubeQuery: 'live chaat counter wedding setup',
    fit: { families: ['wedding'], contains: ['onion-garlic', 'root-veg'] },
  },
  {
    category: 'menu',
    title: 'Regional thali on banana leaves',
    description:
      "Serve the family's regional thali on banana leaves with steel tumblers: traditional, filling and with far less plastic waste.",
    why: ['eco', 'Leaves and steel replace disposable plates.'],
    effort: 'med',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'banana leaf meal serving wedding',
    fit: {
      families: ['wedding', 'family-function'],
      styles: ['regional', 'traditional'],
      contains: ['onion-garlic'],
    },
  },
  {
    category: 'menu',
    title: 'Jain counter before sunset',
    description:
      'A separate Jain counter with its own utensils, no root vegetables, opened early so Jain guests can eat before sunset.',
    why: ['diet', "Respects Jain guests' food rules and timing."],
    effort: 'med',
    eco: false,
    costBand: 'within',
    youtubeQuery: 'jain wedding menu ideas',
    fit: { families: ['wedding', 'family-function', 'community'] },
  },
  {
    category: 'menu',
    title: 'Kulhad chai and hot jalebi',
    description:
      'Clay-cup chai and fresh jalebi at the end of a winter night function; the kulhads are biodegradable.',
    why: ['season', 'A winter favourite that warms guests up.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'kulhad chai counter wedding',
    fit: { families: ['wedding', 'community', 'family-function'], seasons: ['winter'] },
  },
  {
    category: 'activity',
    title: 'Sangeet family dance-off',
    description:
      "Both families prepare short performances with a choreographer's help; a friendly trophy goes to the loudest cheering side.",
    why: ['tradition', 'Turns the sangeet into the evening everyone remembers.'],
    effort: 'high',
    eco: true,
    costBand: 'within',
    youtubeQuery: 'sangeet family dance performance ideas',
    fit: { families: ['wedding'], styles: ['grand', 'quirky', 'colourful'] },
  },
  {
    category: 'music',
    title: 'Shehnai during the pheras',
    description:
      'A live shehnai and tabla duo during the pheras: auspicious, quiet enough for the priest and loved by elders.',
    why: ['tradition', 'Suits a traditional Hindu ceremony and elder guests.'],
    effort: 'low',
    eco: true,
    costBand: 'within',
    youtubeQuery: 'shehnai wedding music live',
    fit: {
      families: ['wedding'],
      // No pheras in these ceremonies: nadaswaram, laavan, nikah or a church service instead.
      avoidTraditions: ['tamil', 'telugu', 'punjabi-sikh', 'muslim', 'christian'],
      styles: ['traditional', 'classic'],
    },
  },
  {
    category: 'favours',
    title: 'Seed-paper cards and sapling favours',
    description:
      'Invitations printed on plantable seed paper and a small sapling for each family as the return gift.',
    why: ['eco', 'Low waste and remembered long after the wedding.'],
    effort: 'low',
    eco: true,
    costBand: 'within',
    youtubeQuery: 'seed paper wedding invitation',
    fit: { families: ['wedding', 'family-function'], styles: ['minimal', 'rustic', 'modern'] },
  },
];
