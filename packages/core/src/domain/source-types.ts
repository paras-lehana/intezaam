/**
 * Source grades and the shape of one source-register entry.
 *
 * Responsibility: the confidence vocabulary (A–D) every domain row, rule and trace item
 * uses, and the entry type the grouped source registers share. Boundary: types and labels
 * only; the entries live in the `sources-*.ts` registers and are merged in sources.ts.
 */

/**
 * A = statute, regulator, court, IMD or NDMA · B = industry body, large survey or Wikipedia ·
 * C = vendor or planner blog (ranges, never quotes) · D = derived by us (an editable assumption).
 * The scale is shown to users next to every number.
 */
export const CONFIDENCE_GRADES = ['A', 'B', 'C', 'D'] as const;

export type Confidence = (typeof CONFIDENCE_GRADES)[number];

/** How the UI names each grade; grade D is always labelled an assumption. */
export const CONFIDENCE_LABELS: Readonly<Record<Confidence, string>> = {
  A: 'Law or official guidance',
  B: 'Survey or reference work',
  C: 'Published industry estimate',
  D: 'Assumption (you can change it)',
};

/** Pages without a visible publication date are cited as "n.d." rather than guessed. */
export type SourceYear = number | 'n.d.';

/** One published source. Facts cite it by id; the id is the register key. */
export interface SourceEntry {
  readonly title: string;
  readonly publisher: string;
  readonly url: string;
  readonly year: SourceYear;
  readonly confidence: Confidence;
}
