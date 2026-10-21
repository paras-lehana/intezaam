/**
 * Money models (VER-M, VER-F, CST-01) — how each kind of event is priced and judged.
 *
 * Responsibility: the ONE closed table saying, for every event kind, which money model judges
 * the budget and how its food is priced — the published wedding rows (weddings, and the 60th,
 * which 04 §5.2 prices as an intimate wedding in the same city, grade D), the published party
 * bands (first, kids' and teen birthdays, where children eat party food at ₹150–500 a head),
 * a bottom-up estimate from catered meals (milestone birthdays and family functions), or the
 * committee's own planned heads (community events: 04 §6.4 finds no published per-visitor
 * cost, "the committee sets it") — plus the caterer class each model prices food at.
 * Boundary: classification only; estimate.ts, verdict-money.ts, catering-basis.ts (the food
 * basis), cost-check.ts and the levers read it.
 */
import type { CateringLevel } from '../domain/catering.js';
import type { EventKind } from '../domain/events.js';
import type { SourceId } from '../domain/sources.js';
import type { Confidence } from '../domain/source-types.js';
import type { CateringBasis } from './catering-basis.js';
import type { ClassifiedContext } from './types.js';

export const MONEY_MODELS = ['wedding-rows', 'party-bands', 'bottom-up', 'committee'] as const;

export type MoneyModel = (typeof MONEY_MODELS)[number];

/** How one kind of event is judged (money model) and how its food is priced (basis). */
export interface KindMoney {
  readonly model: MoneyModel;
  readonly food: CateringBasis;
}

/**
 * A missing kind is a compile error, so every new occasion must choose both its money model
 * and its food basis in this one row (04 §5.2, §6.4; synthesis §4.5).
 */
export const KIND_MONEY: Readonly<Record<EventKind, KindMoney>> = {
  wedding: { model: 'wedding-rows', food: 'plate' },
  'first-birthday': { model: 'party-bands', food: 'party' },
  'kids-birthday': { model: 'party-bands', food: 'party' },
  'teen-birthday': { model: 'party-bands', food: 'teen-party' },
  'milestone-birthday': { model: 'bottom-up', food: 'plate' },
  'sixtieth-birthday': { model: 'wedding-rows', food: 'intimate-wedding' },
  'festival-pandal': { model: 'committee', food: 'prasad' },
  'society-festival': { model: 'committee', food: 'prasad' },
  'religious-gathering': { model: 'committee', food: 'prasad' },
  'rwa-function': { model: 'committee', food: 'prasad' },
  'charity-fundraiser': { model: 'committee', food: 'prasad' },
  engagement: { model: 'bottom-up', food: 'plate' },
  anniversary: { model: 'bottom-up', food: 'plate' },
  'griha-pravesh': { model: 'bottom-up', food: 'plate' },
  'home-puja': { model: 'bottom-up', food: 'plate' },
  'naming-mundan': { model: 'bottom-up', food: 'plate' },
  'baby-shower': { model: 'bottom-up', food: 'plate' },
  retirement: { model: 'bottom-up', food: 'plate' },
};

/**
 * The caterer class food is priced at when the model does not tie it to a money band: a
 * party's adults eat from a local party caterer (grade D), milestone and family functions
 * book a standard caterer (04 §5.2 "guests × per-plate"), and a committee buys at community
 * rates. Wedding rows follow the band instead (09 Gap 2 §2.5).
 */
export const DEFAULT_LEVEL_BY_MODEL: Readonly<Record<MoneyModel, CateringLevel>> = {
  'wedding-rows': 'standard',
  'party-bands': 'community',
  'bottom-up': 'standard',
  committee: 'community',
};

/** What a wedding-rows event is called in the verdict copy, and how far the rows fit it. */
export interface RowsSubject {
  readonly noun: string;
  readonly confidence: Confidence;
  readonly sourceIds: readonly SourceId[];
  /** Said once in the verdict when the rows are borrowed from weddings. */
  readonly basisNote: string | null;
}

const WEDDING_SUBJECT: RowsSubject = {
  noun: 'wedding',
  confidence: 'C',
  sourceIds: ['S-VK-2026', 'S-RSA-2026', 'S-CAIT-2025', 'S-INTEZAAM-D'],
  basisNote: null,
};

/**
 * 04 §5.2: "treat as an intimate or mid wedding in the same tier minus attire and jewellery".
 * The VK rows already leave out trousseau, jewellery and guest rooms (04 §1.3), and the event
 * spend drops those lines too, so the 60th is compared like-for-like without a further cut.
 */
const SUBJECT_BY_KIND: Readonly<Partial<Record<EventKind, RowsSubject>>> = {
  'sixtieth-birthday': {
    noun: '60th celebration',
    confidence: 'D',
    sourceIds: ['S-VK-2026', 'S-WIKI-SHASHTHIPURTI', 'S-INTEZAAM-D'],
    basisNote:
      'A 60th is compared with wedding rows for the same city, which leave out outfits and jewellery (an assumption).',
  },
};

/**
 * The money model for a classified context.
 * @example
 * moneyModelOf(chennai60thCtx); // 'wedding-rows'
 */
export function moneyModelOf(ctx: Pick<ClassifiedContext, 'kind'>): MoneyModel {
  return KIND_MONEY[ctx.kind].model;
}

/**
 * How a wedding-rows event is described, with the grade of the comparison.
 * @example
 * rowsSubject('sixtieth-birthday').confidence; // 'D'
 */
export function rowsSubject(kind: EventKind): RowsSubject {
  return SUBJECT_BY_KIND[kind] ?? WEDDING_SUBJECT;
}
