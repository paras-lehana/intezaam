/**
 * Festival anchors for reading dates such as "Diwali ke baad" or "Gurpurab par"
 * (research note 09 §5.2.2 and Gap 3 §3.5).
 *
 * Responsibility: the festival names a brief may use, the occasion's community kind, and
 * every candidate date per year (more than one date means published sources disagree, so a
 * window spans both). One source per fact: dates the domain festival table curates
 * (`FESTIVAL_DATES`, with its sources and grades) are taken from it, and so is the community
 * kind of every festival that is a community occasion (`COMMUNITY_OCCASION_PROFILES`). This
 * file adds only the dates that table does not hold — 2026 dates before its window (DoPT
 * holiday order of 3 Jul 2025, S-DOPT-2026, grade A), the fixed national days, and the
 * Navratri and Durga Puja 2027 start days (Drik Panchang 2027, S-DRIK-2027, grade B), which
 * span several days and so are not single clash dates. Islamic dates follow moon sighting.
 * Boundary: data only; a festival with no curated future date resolves to "no curated
 * date — ask", never a guess.
 */
import { occasionKind } from '../../domain/community-occasions.js';
import type { EventKind } from '../../domain/events.js';
import { FESTIVAL_DATES, type FestivalId } from '../../domain/festivals.js';

export const FESTIVAL_KEYS = [
  'diwali',
  'dussehra',
  'holi',
  'eid-ul-fitr',
  'eid-ul-adha',
  'eid',
  'eid-milan',
  'gurpurab',
  'christmas',
  'janmashtami',
  'independence-day',
  'republic-day',
  'ganesh-chaturthi',
  'navratri',
  'durga-puja',
  'onam',
  'makar-sankranti',
  'ram-navami',
] as const;

export type FestivalKey = (typeof FESTIVAL_KEYS)[number];

export interface FestivalAnchor {
  /** Spellings separated by "|" (multi-word names allowed). */
  readonly names: string;
  /** Candidate dates per year, sorted; two dates = the sources disagree, and both are kept. */
  readonly dates: Readonly<Record<number, readonly string[]>>;
  /** The community kind a society celebration of this festival maps to. */
  readonly communityKind: EventKind;
  /** True when the name alone is ambiguous (plain "Eid"): the form asks instead of guessing. */
  readonly ambiguous: boolean;
}

interface AnchorRow {
  readonly names: string;
  /** Rows of the domain festival table this name refers to; their dates are used as they are. */
  readonly festivalIds: readonly FestivalId[];
  /** Dates the domain table does not curate (see the header for their sources). */
  readonly otherDates?: readonly string[];
  readonly communityKind: EventKind;
  readonly ambiguous?: boolean;
}

/** An ISO date starts with its four-digit year. */
const YEAR_DIGITS = 4;

/** Groups the domain dates and the extra dates by year, each list sorted and deduplicated. */
function anchor(row: AnchorRow): FestivalAnchor {
  const all = [
    ...row.festivalIds.flatMap((id) => FESTIVAL_DATES[id].datesIso),
    ...(row.otherDates ?? []),
  ];
  const dates: Record<number, string[]> = {};
  for (const iso of [...new Set(all)].sort()) {
    const year = Number(iso.slice(0, YEAR_DIGITS));
    dates[year] = [...(dates[year] ?? []), iso];
  }
  return {
    names: row.names,
    dates,
    communityKind: row.communityKind,
    ambiguous: row.ambiguous === true,
  };
}

/** Festivals that are not one of the thirteen community occasions plan as these kinds. */
const SOCIETY: EventKind = 'society-festival';
const GATHERING: EventKind = 'religious-gathering';
/** A society's Eid celebration is an Eid Milan, whichever Eid it follows (09 §5.5). */
const EID_MILAN = occasionKind('eid-milan');

export const FESTIVAL_ANCHORS: Readonly<Record<FestivalKey, FestivalAnchor>> = {
  diwali: anchor({
    names: 'diwali | deepavali | divali | दिवाली | दीपावली | diwali mela',
    festivalIds: ['diwali-2026', 'diwali-2027'],
    communityKind: occasionKind('diwali-mela'),
  }),
  dussehra: anchor({
    names: 'dussehra | dasara | dussera | vijayadashami | दशहरा',
    festivalIds: ['dussehra-2026', 'dussehra-2027'],
    communityKind: SOCIETY,
  }),
  holi: anchor({
    names: 'holi | होली | holi milan',
    festivalIds: ['holi-2027'],
    otherDates: ['2026-03-04'],
    communityKind: occasionKind('holi-milan'),
  }),
  'eid-ul-fitr': anchor({
    names: 'eid ul fitr | eid-ul-fitr | id ul fitr | ramzan eid | meethi eid',
    festivalIds: ['eid-al-fitr-2027'],
    otherDates: ['2026-03-21'],
    communityKind: EID_MILAN,
  }),
  'eid-ul-adha': anchor({
    names: 'bakrid | bakri eid | eid ul adha | eid-ul-adha | id ul zuha | बकरीद',
    festivalIds: ['eid-al-adha-2027'],
    otherDates: ['2026-05-27'],
    communityKind: EID_MILAN,
  }),
  eid: anchor({
    names: 'eid | ईद',
    festivalIds: ['eid-al-fitr-2027', 'eid-al-adha-2027'],
    otherDates: ['2026-03-21', '2026-05-27'],
    communityKind: EID_MILAN,
    ambiguous: true,
  }),
  // An Eid Milan can follow either Eid and depends on moon sighting: the society picks the day.
  'eid-milan': anchor({
    names: 'eid milan | ईद मिलन',
    festivalIds: [],
    communityKind: occasionKind('eid-milan'),
  }),
  gurpurab: anchor({
    names: 'gurpurab | gurpurb | guru nanak jayanti | prakash purab | गुरुपर्व',
    festivalIds: ['gurpurab-2026', 'gurpurab-2027'],
    communityKind: occasionKind('gurpurab'),
  }),
  christmas: anchor({
    names: 'christmas | xmas | क्रिसमस',
    festivalIds: ['christmas-2026', 'christmas-2027'],
    communityKind: occasionKind('christmas'),
  }),
  janmashtami: anchor({
    names: 'janmashtami | जन्माष्टमी',
    festivalIds: ['janmashtami-2027'],
    otherDates: ['2026-09-04'],
    communityKind: GATHERING,
  }),
  'independence-day': anchor({
    names: 'independence day | 15 august | स्वतंत्रता दिवस | flag hoisting',
    festivalIds: [],
    otherDates: ['2026-08-15', '2027-08-15'],
    communityKind: occasionKind('national-day'),
  }),
  'republic-day': anchor({
    names: 'republic day | 26 january | गणतंत्र दिवस',
    festivalIds: [],
    otherDates: ['2026-01-26', '2027-01-26'],
    communityKind: occasionKind('national-day'),
  }),
  'ganesh-chaturthi': anchor({
    names:
      'ganesh chaturthi | ganesh utsav | ganesh puja | ganesh pooja | ganpati | ganapati | vinayaka chaturthi | गणेश चतुर्थी | गणपति',
    festivalIds: ['ganesh-chaturthi-2027'],
    communityKind: occasionKind('ganesh-utsav'),
  }),
  navratri: anchor({
    names: 'navratri | navaratri | garba | dandiya | नवरात्रि | गरबा',
    festivalIds: [],
    otherDates: ['2027-09-30'],
    communityKind: occasionKind('navratri-garba'),
  }),
  'durga-puja': anchor({
    names: 'durga puja | durga pujo | pujo | दुर्गा पूजा',
    festivalIds: [],
    otherDates: ['2027-10-06'],
    communityKind: occasionKind('durga-puja'),
  }),
  onam: anchor({
    names: 'onam | thiruvonam | sadya | ओणम',
    festivalIds: ['onam-2027'],
    communityKind: occasionKind('onam'),
  }),
  'makar-sankranti': anchor({
    names: 'makar sankranti | sankranti | pongal | मकर संक्रांति | पोंगल',
    festivalIds: ['makar-sankranti-2027'],
    communityKind: SOCIETY,
  }),
  'ram-navami': anchor({
    names: 'ram navami | ramnavami | राम नवमी',
    festivalIds: ['ram-navami-2027'],
    communityKind: GATHERING,
  }),
};
