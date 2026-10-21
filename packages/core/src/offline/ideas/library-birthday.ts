/**
 * Curated ideas, part 2: birthdays from a first birthday to a 60th (feature #29 offline
 * library).
 *
 * Responsibility: themes, menus, activities, music and return gifts tagged by age band
 * (04 §5.2: baby, kid, teen, adult, elder), season (rainy-day indoor plans) and setting, so
 * a 7th birthday in the monsoon and a 60th Shashtiabdapurti get different suggestions.
 * No prices: code attaches the cost band. Boundary: data only.
 */
import type { LibraryIdea } from './idea-types.js';

export const BIRTHDAY_IDEAS: readonly LibraryIdea[] = [
  {
    category: 'theme',
    title: 'Superhero training camp',
    description:
      'Capes at the door, a "mission" obstacle trail and a certificate for every little hero at the end.',
    why: ['age-band', 'Built for children of five to twelve.'],
    effort: 'med',
    eco: false,
    costBand: 'within',
    youtubeQuery: 'superhero birthday party games kids',
    fit: { families: ['birthday'], ages: ['kid'], styles: ['quirky', 'colourful'] },
  },
  {
    category: 'theme',
    title: 'Jungle safari',
    description:
      'Green drapes, paper animal masks the children colour themselves and a "spot the animal" hunt around the room.',
    why: ['age-band', 'Easy to stage indoors for young children.'],
    effort: 'med',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'jungle theme birthday decoration diy',
    fit: { families: ['birthday'], ages: ['baby', 'kid'], styles: ['colourful', 'quirky'] },
  },
  {
    category: 'theme',
    title: 'Space explorers',
    description:
      'Glow stars on a dark ceiling, a cardboard rocket photo booth and planet-themed snacks for a rainy-day indoor party.',
    why: ['season', 'Keeps everyone indoors and busy when it rains.'],
    effort: 'med',
    eco: false,
    costBand: 'within',
    youtubeQuery: 'space theme birthday party ideas',
    fit: {
      families: ['birthday'],
      ages: ['kid'],
      seasons: ['monsoon'],
      settings: ['indoor', 'home'],
    },
  },
  {
    category: 'theme',
    title: 'Board-game café night',
    description:
      'Borrow board games from friends, set up three tables and rotate groups; snacks and a scoreboard do the rest.',
    why: ['age-band', 'Teens and adults enjoy it, and it costs little.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'board game birthday party ideas',
    fit: { families: ['birthday'], ages: ['teen', 'adult'], settings: ['home', 'indoor'] },
  },
  {
    category: 'theme',
    title: 'Retro Bollywood night',
    description:
      'Guests come dressed as their favourite film star, with old film posters on the walls and a dance floor of classic songs.',
    why: ['style', 'A fun, colourful theme for a milestone birthday.'],
    effort: 'med',
    eco: false,
    costBand: 'within',
    youtubeQuery: 'retro bollywood theme party decor',
    fit: {
      families: ['birthday', 'family-function'],
      ages: ['adult', 'elder'],
      styles: ['quirky', 'colourful', 'fusion'],
    },
  },
  {
    category: 'decor',
    title: 'Two-colour balloon arch',
    description:
      'One balloon arch in two colours behind the cake table makes the photo backdrop; skip helium and confetti to cut waste.',
    why: ['budget', 'The most photographed spot for very little spend.'],
    effort: 'low',
    eco: false,
    costBand: 'saves',
    youtubeQuery: 'balloon arch diy two colours',
    fit: { families: ['birthday'], ages: ['baby', 'kid', 'teen'] },
  },
  {
    category: 'decor',
    title: 'Photo timeline through the years',
    description:
      "Print photos from every decade of the guest of honour's life and hang them on a string with wooden clips.",
    why: ['age-band', 'Made for milestone and 60th birthdays.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'photo timeline birthday decoration',
    fit: { families: ['birthday', 'family-function'], ages: ['adult', 'elder'] },
  },
  {
    category: 'menu',
    title: 'Mini-pizza and pasta bar',
    description:
      'Small bases and bowls the children top themselves with veggies and cheese; parents get the same with spice.',
    why: ['age-band', 'Children eat what they make themselves.'],
    effort: 'med',
    eco: false,
    costBand: 'within',
    youtubeQuery: 'mini pizza bar kids party',
    fit: { families: ['birthday'], ages: ['kid', 'teen'], contains: ['onion-garlic'] },
  },
  {
    category: 'menu',
    title: 'Eggless cake and cupcake tower',
    description:
      'An eggless cake for the cutting and a tower of cupcakes to serve: quicker to share and fine for vegetarian guests.',
    why: ['diet', 'Eggless suits every vegetarian guest.'],
    effort: 'low',
    eco: false,
    costBand: 'saves',
    youtubeQuery: 'eggless cupcake tower birthday',
    fit: { families: ['birthday'] },
  },
  {
    category: 'menu',
    title: 'Fruit cups and corn chaat',
    description:
      'Cut fruit in paper cups and sweet-corn chaat keep children fed between games without a heavy meal.',
    why: ['age-band', 'Light, quick food for young guests.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'healthy snacks kids birthday party',
    fit: { families: ['birthday'], ages: ['baby', 'kid'] },
  },
  {
    category: 'activity',
    title: 'Treasure hunt with picture clues',
    description:
      'Picture clues hidden around the house or hall lead teams to a box of small prizes; pair younger children with older ones.',
    why: ['age-band', 'Keeps children of mixed ages playing together.'],
    effort: 'med',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'treasure hunt clues kids birthday',
    fit: { families: ['birthday'], ages: ['kid'] },
  },
  {
    category: 'activity',
    title: 'Paint-your-own diya or pot',
    description:
      'Plain clay diyas or small pots and washable paints: every child takes home what they made as the return gift.',
    why: ['eco', 'A craft that doubles as the return gift.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'diya painting kids activity',
    fit: { families: ['birthday', 'community'], ages: ['kid', 'teen'] },
  },
  {
    category: 'activity',
    title: 'Magic or puppet show',
    description:
      'A short magic or puppet show seats all the children at once and gives the hosts time to set up the cake.',
    why: ['age-band', "Holds young children's attention in one place."],
    effort: 'low',
    eco: true,
    costBand: 'within',
    youtubeQuery: 'puppet show kids birthday party india',
    fit: { families: ['birthday'], ages: ['baby', 'kid'] },
  },
  {
    category: 'activity',
    title: 'Indoor obstacle course',
    description:
      'Cushions, tunnels made of chairs and a hula-hoop hop turn a living room or hall into a rain-proof obstacle course.',
    why: ['season', 'A rainy-day plan that still burns energy.'],
    effort: 'med',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'indoor obstacle course kids party',
    fit: {
      families: ['birthday'],
      ages: ['kid'],
      seasons: ['monsoon'],
      settings: ['indoor', 'home'],
    },
  },
  {
    category: 'music',
    title: 'Karaoke corner',
    description:
      'A speaker, a microphone and a song list on a screen; teens and adults queue up for duets all evening.',
    why: ['age-band', 'Teens and adults entertain themselves.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'karaoke party setup at home',
    fit: { families: ['birthday', 'family-function'], ages: ['teen', 'adult'] },
  },
  {
    category: 'music',
    title: 'Old-songs antakshari',
    description:
      'Two teams, one song each, starting with the last letter of the previous one: elders always win, and everyone joins in.',
    why: ['age-band', 'Brings grandparents and grandchildren into one game.'],
    effort: 'low',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'antakshari rules family party',
    fit: { families: ['birthday', 'family-function', 'community'], ages: ['adult', 'elder'] },
  },
  {
    category: 'favours',
    title: 'Story books as return gifts',
    description:
      'A picture book for each child instead of plastic toys; write a thank-you note on the first page.',
    why: ['eco', 'A gift that lasts and creates no plastic waste.'],
    effort: 'low',
    eco: true,
    costBand: 'within',
    youtubeQuery: 'return gift ideas kids birthday books',
    fit: { families: ['birthday'], ages: ['baby', 'kid'] },
  },
  {
    category: 'activity',
    title: 'Video wishes from far-away family',
    description:
      'Collect short phone videos from relatives who cannot travel and play them as a montage after the puja or cake.',
    why: ['age-band', 'Moves elders at a 60th or milestone celebration.'],
    effort: 'med',
    eco: true,
    costBand: 'saves',
    youtubeQuery: 'birthday video montage from family',
    fit: { families: ['birthday', 'family-function'], ages: ['adult', 'elder'] },
  },
];
