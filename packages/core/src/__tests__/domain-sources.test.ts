/**
 * Tests for domain/sources.ts: the source register: id pattern, wire shape and grades.
 *
 * Responsibility: pin the behaviour other packages rely on, and keep the register size the
 * root docs state equal to the register itself. Boundary: expected values come from inputs
 * the test owns or are derived from the tables under test, never hand-computed; reads the
 * file system only to compare the docs with the register.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CONFIDENCE_GRADES, CONFIDENCE_LABELS, type Confidence } from '../domain/source-types.js';
import {
  isSourceId,
  listSources,
  SOURCE_ID_PATTERN,
  SOURCES,
  sourceRef,
} from '../domain/sources.js';
import { sourceRefSchema } from '../schemas/trace.js';

const ids = Object.keys(SOURCES);

describe('source register', () => {
  it('every id follows the S-<KEY>-<YEAR|ND> pattern and every entry is a valid SourceRef', () => {
    for (const ref of listSources()) {
      expect(ref.id).toMatch(SOURCE_ID_PATTERN);
      expect(sourceRefSchema.safeParse(ref).success).toBe(true);
      expect(ref.url.startsWith('https://')).toBe(true);
    }
  });

  it('lists every register entry once', () => {
    expect(listSources().map((ref) => ref.id)).toEqual(ids);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('turns an id into its wire reference', () => {
    expect(sourceRef('S-NDMA-2014')).toEqual({ id: 'S-NDMA-2014', ...SOURCES['S-NDMA-2014'] });
  });

  it('recognises registered ids only', () => {
    expect(isSourceId('S-VK-2026')).toBe(true);
    expect(isSourceId('S-NOPE')).toBe(false);
    expect(isSourceId('toString')).toBe(false);
  });

  it('marks our own assumptions as grade D and links them to the method page', () => {
    for (const id of ['S-OWNER-DEFAULTS', 'S-INTEZAAM-D'] as const) {
      expect(SOURCES[id].confidence).toBe('D');
      expect(SOURCES[id].url).toContain('#assumptions');
    }
  });

  it('labels every grade, and calls grade D an assumption', () => {
    for (const grade of CONFIDENCE_GRADES)
      expect(CONFIDENCE_LABELS[grade].length).toBeGreaterThan(0);
    expect(CONFIDENCE_LABELS.D.toLowerCase()).toContain('assumption');
  });
});

/** The repository root, where the README and the other evaluator docs live. */
const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

/** A root document with its whitespace folded, so a sentence the formatter wrapped still matches. */
function rootDoc(fileName: string): string {
  return readFileSync(`${REPO_ROOT}${fileName}`, 'utf8').replace(/\s+/g, ' ');
}

/** How many register entries carry one grade. */
function countGraded(grade: Confidence): number {
  return listSources().filter((ref) => ref.confidence === grade).length;
}

describe('register counts stated in the root docs', () => {
  it('the README states the register size and the count of every grade', () => {
    const readme = rootDoc('README.md');
    expect(readme).toContain(`a register of ${ids.length} sources (${countGraded('A')} grade A:`);
    expect(readme).toContain(
      `${countGraded('B')} grade B; ${countGraded('C')} grade C; ${countGraded('D')} grade D)`,
    );
  });

  it('the changelog and the evaluation mapping state the same register size', () => {
    expect(rootDoc('CHANGELOG.md')).toContain(`a register of ${ids.length} sources graded A–D`);
    expect(rootDoc('EVALUATION_MAPPING.md')).toContain(`one of ${ids.length} registered sources`);
  });
});
