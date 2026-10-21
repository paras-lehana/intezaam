/**
 * Preference vocabulary for the offline brief reader (research note 09 §5.2.4–5.2.6;
 * bio-bandish guest-diet synonyms, research note 01 §3.8).
 *
 * Responsibility: explicit words for tradition, diet (with the change from bio-bandish:
 * "no onion garlic" is vegetarian, never Jain), halal, alcohol and its negation, venue
 * setting, accessibility needs, style chips and budget categories (for priorities and cuts).
 * Boundary: data only; a tradition is only ever read from these words, never from a
 * surname, a first name or the city ("Sharma ji", "Khan family" set nothing).
 */
import type { RankableCategory } from '../../domain/budget-categories.js';
import type { VenueSetting } from '../../domain/context-options.js';
import type { DietProfile } from '../../domain/diet.js';
import type { AccessNeed } from '../../domain/accessibility.js';
import type { StyleTag } from '../../domain/style.js';
import type { Tradition } from '../../domain/traditions.js';
import { phrases, type PhraseGroups } from './word-list.js';

/** Stated traditions; "Punjabi" alone never implies Anand Karaj (09 §5.2.4, battery B52). */
export const TRADITION_WORDS: PhraseGroups<Tradition> = [
  ['punjabi-sikh', 'punjabi | sikh | anand karaj | gurdwara | gurudwara | सिख | पंजाबी'],
  ['muslim', 'muslim | nikah | walima | मुस्लिम | निकाह'],
  ['christian', 'christian | church | church wedding | ईसाई'],
  ['bengali', 'bengali | bangali | बंगाली'],
  ['marathi', 'marathi | maharashtrian | मराठी'],
  ['gujarati', 'gujarati | गुजराती'],
  ['tamil', 'tamil | तमिल'],
  ['telugu', 'telugu | तेलुगु'],
  ['north-hindu', 'north indian | marwari | hindu wedding | उत्तर भारतीय'],
  ['civil-other', 'court marriage | registered marriage | special marriage act | civil wedding'],
];

/** Diet menu words; Jain only from the word Jain, because it fires the sunset rule. */
export const DIET_WORDS: PhraseGroups<DietProfile> = [
  ['jain', 'jain | जैन | jain food | jain khana | jain bhojan | जैन भोजन'],
  [
    'veg',
    'veg | vegetarian | pure veg | sirf veg | only veg | shakahari | शाकाहारी | शुद्ध शाकाहारी | no non veg | vegan | satvik | sattvic | no onion garlic | bina pyaaz lahsun | bina pyaz lehsun | बिना प्याज लहसुन',
  ],
  [
    'mixed',
    'non veg | nonveg | nv | mansahari | मांसाहारी | chicken | mutton | fish | machhli | maachh | veg aur nv dono | veg and non veg',
  ],
];

/** "halal" is a flag only; no diet value is inferred from it (battery B37). */
export const HALAL_WORDS = phrases('halal | हलाल | zabiha');

/** Alcohol: negation wins over a plain mention (battery B14). */
export const ALCOHOL_NO_WORDS = phrases(
  'no alcohol | no daaru | no daru | no drinks | dry | sharaab nahi | sharab nahi | alcohol free | no bar',
);
export const ALCOHOL_YES_WORDS = phrases(
  'bar | drinks | daaru | daru | दारू | sharaab | sharab | शराब | beer | open bar | cocktails | cocktail | alcohol',
);

/** Venue setting words (09 §5.2.6). */
export const SETTING_WORDS: PhraseGroups<VenueSetting> = [
  [
    'outdoor',
    'lawn | open lawn | outdoor | outdoors | terrace | chhat pe | ground | लॉन | garden | beach',
  ],
  ['indoor', 'hall | banquet | hotel | indoor | community hall | ground floor hall'],
  ['home', 'ghar pe | ghar par | at home | घर पर | घर पे | home'],
  ['mixed', 'farmhouse | farm house | resort'],
];

/** Accessibility needs stated directly (09 §5.2.6). */
export const ACCESS_WORDS: PhraseGroups<AccessNeed> = [
  ['wheelchair', 'wheelchair | व्हीलचेयर'],
  [
    'elderly',
    'elderly | buzurg | बुजुर्ग | elders | senior citizens | chal nahi sakti | chal nahi sakte',
  ],
  ['kids', 'kids | bachche | बच्चे | children'],
];

/** Grandparents count as an elderly need only beside a stated need ("Nani wheelchair pe hain"). */
export const ELDER_RELATIVE_WORDS = phrases(
  'dadi | nani | dada | nana | grandparents | दादी | नानी',
);

/** Style chips (the owner's quiz vocabulary, 01 §3.5). */
export const STYLE_WORDS: PhraseGroups<StyleTag> = [
  ['traditional', 'traditional | paramparik | पारंपरिक'],
  ['modern', 'modern | contemporary'],
  ['grand', 'grand | lavish | big fat | bhavya'],
  ['intimate', 'intimate | small | chhota | simple'],
  ['floral', 'floral | flowers | phool | marigold | genda'],
  ['minimal', 'minimal | minimalist'],
  ['colourful', 'colourful | colorful | rangeen | bright'],
  ['pastel', 'pastel | pastels'],
  ['royal', 'royal | rajwada | rajasthani theme | palace'],
  ['rustic', 'rustic | boho'],
  ['classic', 'classic | elegant'],
  ['quirky', 'quirky | fun theme'],
  ['regional', 'regional food | local food | ghar ka khana'],
  ['fusion', 'fusion'],
];

/** Budget categories by their everyday names, for priorities and cuts. */
export const CATEGORY_WORDS: PhraseGroups<RankableCategory> = [
  ['catering', 'food | khana | खाना | catering | caterer | menu'],
  ['decor', 'decor | decoration | sajavat | सजावट'],
  ['photo_video', 'photos | photo | photography | photographer | video | videography'],
  ['venue', 'venue | location'],
  ['attire', 'outfits | outfit | clothes | kapde | lehenga | sherwani'],
  ['makeup', 'makeup | make up | hair'],
  ['entertainment', 'music | dj | band | entertainment | dhol'],
  ['invites', 'invites | invitations | cards | invitation cards'],
  ['gifts', 'gifts | return gifts | favours'],
  ['transport', 'transport | cars | buses'],
  ['accommodation', 'rooms | stay | hotel rooms | accommodation'],
];

/** Priority markers before or after a category word ("food is most important"). */
export const PRIORITY_WORDS = phrases(
  'priority | priorities | important | most important | focus | zaroori | sabse zaroori | must',
);

/** Cut markers ("kam decor", "skip photos", "no need for dj"). */
export const CUT_WORDS = phrases('cut | skip | kam | less | no need | zarurat nahi | save on');

/**
 * Hindi words typed in Latin script: function words plus the Hindi-only entries of the brief
 * vocabulary (09 §5.2.1–5.2.3: fraction words, sau, tak, relative-date words, shaadi, sagai,
 * mehmaan). Two different ones in a brief with no Devanagari make it Hinglish, so drafts
 * default to Hinglish templates (09 §5.2.7). Words Indian English also uses (lakh, crore,
 * mehendi, sangeet) and English look-alikes (do, teen, din, pe) are left out, so an English
 * brief that names a lakh budget and a sangeet stays English.
 */
export const HINGLISH_WORDS = phrases(
  'mein | ki | ka | ke | hai | hain | aur | log | logon | baje | karna | wala | wali | chahiye | bachche | beti | beta | hazaar | hamara | humara | mera | meri | kar do | ' +
    'shaadi | shadi | sagai | mehmaan | sau | tak | dedh | dhai | sava | sawa | paune | saade | sade | lagbhag | agle | mahine | hafte | baad | pehle | nahi | sirf | bina | dono | rahi | ghar pe',
);
