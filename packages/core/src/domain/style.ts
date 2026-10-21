/**
 * Style tags and the 8-pair style quiz (feature #30).
 *
 * Responsibility: the closed vocabulary of style chips the user, the brief reader and the
 * idea generator share, built from the owner's 8 A/B quiz pairs (01 §3.5).
 * Boundary: vocabulary only; ideas are filtered by these tags elsewhere.
 */

export const STYLE_TAGS = [
  'traditional',
  'modern',
  'grand',
  'intimate',
  'floral',
  'minimal',
  'colourful',
  'pastel',
  'outdoor',
  'indoor',
  'royal',
  'rustic',
  'classic',
  'quirky',
  'regional',
  'fusion',
] as const;

export type StyleTag = (typeof STYLE_TAGS)[number];

export const STYLE_AXES = [
  'tradition',
  'scale',
  'decor',
  'palette',
  'setting',
  'mood',
  'vibe',
  'flavour',
] as const;

export type StyleAxis = (typeof STYLE_AXES)[number];

export interface StylePair {
  readonly question: string;
  readonly a: StyleTag;
  readonly b: StyleTag;
}

/** One A/B question per axis; each answer adds one tag (owner's quiz, 01 §3.5). */
export const STYLE_QUIZ: Readonly<Record<StyleAxis, StylePair>> = {
  tradition: { question: 'Traditional or modern?', a: 'traditional', b: 'modern' },
  scale: { question: 'Grand or intimate?', a: 'grand', b: 'intimate' },
  decor: { question: 'Lots of flowers or clean and minimal?', a: 'floral', b: 'minimal' },
  palette: { question: 'Bright colours or soft pastels?', a: 'colourful', b: 'pastel' },
  setting: { question: 'Under the sky or under a roof?', a: 'outdoor', b: 'indoor' },
  mood: { question: 'Royal or rustic?', a: 'royal', b: 'rustic' },
  vibe: { question: 'Classic or quirky?', a: 'classic', b: 'quirky' },
  flavour: { question: 'Regional food or fusion?', a: 'regional', b: 'fusion' },
};

export const STYLE_TAG_LABELS: Readonly<Record<StyleTag, string>> = {
  traditional: 'Traditional',
  modern: 'Modern',
  grand: 'Grand',
  intimate: 'Intimate',
  floral: 'Floral',
  minimal: 'Minimal',
  colourful: 'Colourful',
  pastel: 'Pastel',
  outdoor: 'Outdoor',
  indoor: 'Indoor',
  royal: 'Royal',
  rustic: 'Rustic',
  classic: 'Classic',
  quirky: 'Quirky',
  regional: 'Regional food',
  fusion: 'Fusion food',
};
