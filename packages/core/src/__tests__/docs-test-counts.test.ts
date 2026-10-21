/**
 * Tests that the root docs state one set of test counts and coverage figures.
 *
 * Responsibility: TESTING.md holds the measured run (a row per workspace, a headline total and
 * the Playwright count); this suite checks the headline is the sum of the rows and that the
 * README, the evaluation mapping and the changelog repeat exactly those figures, so a doc
 * edited after a new run can never disagree with the others. Boundary: reads the root docs
 * only; the runner's own output is copied into TESTING.md by hand after each run.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/** The repository root, where TESTING.md and the other evaluator docs live. */
const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

/** The three Vitest workspaces, in the order every doc lists them. */
const WORKSPACES = ['packages/core', 'apps/server', 'apps/web'] as const;
type Workspace = (typeof WORKSPACES)[number];

/** One row of the TESTING.md "Latest local run" table, as written there. */
interface LayerRow {
  readonly files: string;
  readonly tests: string;
  readonly branches: string;
  readonly lines: string;
}

/** Thousands separators as the docs write them (1,822). */
const COUNT_FORMAT = new Intl.NumberFormat('en-US');

/** A root document with its whitespace folded, so a sentence the formatter wrapped still matches. */
function rootDoc(fileName: string): string {
  return readFileSync(`${REPO_ROOT}${fileName}`, 'utf8').replace(/\s+/g, ' ');
}

/** The captured groups of the first match, or an empty list when the pattern is absent. */
function groups(text: string, pattern: RegExp): readonly string[] {
  return text.match(pattern)?.slice(1) ?? [];
}

/** A doc number such as "1,274" as a number. */
function count(text: string | undefined): number {
  return Number((text ?? '').replace(/,/g, ''));
}

const testingDoc = rootDoc('TESTING.md');

/** The table row for one workspace: files, tests, statements, branches, functions, lines. */
function layerRow(workspace: Workspace): LayerRow {
  const cell = '\\| ([\\d.,]+%?) ';
  const [files = '', tests = '', , branches = '', , lines = ''] = groups(
    testingDoc,
    new RegExp(`\\| \`${workspace}\` ${cell.repeat(6)}\\|`),
  );
  return { files, tests, branches, lines };
}

const rows: Readonly<Record<Workspace, LayerRow>> = {
  'packages/core': layerRow('packages/core'),
  'apps/server': layerRow('apps/server'),
  'apps/web': layerRow('apps/web'),
};
const core = rows['packages/core'];
const server = rows['apps/server'];
const web = rows['apps/web'];

const [totalTests, totalFiles] = groups(
  testingDoc,
  /passed \*\*([\d,]+) tests in ([\d,]+) files\*\*/,
);
const [e2ePassed, e2eTotal, perDevice, journeys, personas, axeScans] = groups(
  testingDoc,
  /passed \*\*(\d+) of (\d+)\*\* \((\d+) per device: (\d+) journeys, (\d+) persona checks and (\d+) axe scans\)/,
);

describe('TESTING.md, the source of the counts', () => {
  it('has a measured row for every workspace', () => {
    for (const workspace of WORKSPACES) {
      const row = rows[workspace];
      expect(count(row.tests), workspace).toBeGreaterThan(0);
      expect(count(row.files), workspace).toBeGreaterThan(0);
      expect(row.lines, workspace).toMatch(/%$/);
      expect(row.branches, workspace).toMatch(/%$/);
    }
  });

  it('states a headline total that is the sum of the workspace rows', () => {
    const sum = (field: 'files' | 'tests'): number =>
      WORKSPACES.reduce((total, workspace) => total + count(rows[workspace][field]), 0);
    expect(count(totalTests)).toBe(sum('tests'));
    expect(count(totalFiles)).toBe(sum('files'));
  });

  it('counts the same Playwright tests on each of the two devices', () => {
    expect(e2ePassed).toBe(e2eTotal);
    expect(count(journeys) + count(personas) + count(axeScans)).toBe(count(perDevice));
    expect(count(perDevice) * 2).toBe(count(e2eTotal));
  });
});

/** The doc's own sentence matching a shape, so a mismatch prints a one-line diff. */
function stated(doc: string, shape: RegExp): string {
  return doc.match(shape)?.[0] ?? `no sentence matching ${String(shape)}`;
}

describe('the other root docs repeat the TESTING.md figures', () => {
  const total = COUNT_FORMAT.format(count(totalTests));
  const e2e = e2eTotal ?? '';

  it('the README', () => {
    expect(stated(rootDoc('README.md'), /[\d,]+ unit, integration .*? Playwright tests/)).toBe(
      `${total} unit, integration and component tests pass (core ${core.tests} · server ${server.tests} · ` +
        `web ${web.tests}) plus ${e2e} Playwright tests`,
    );
  });

  it('the evaluation mapping', () => {
    const mapping = rootDoc('EVALUATION_MAPPING.md');
    expect(stated(mapping, /Core unit tests .*? web component tests \([\d,]+\)/)).toBe(
      `Core unit tests (${core.tests}), server integration tests (${server.tests}) and web component tests (${web.tests})`,
    );
    expect(stated(mapping, /measured core \S+ lines, server \S+ lines, web \S+ lines/)).toBe(
      `measured core ${core.lines} lines, server ${server.lines} lines, web ${web.lines} lines`,
    );
    expect(stated(mapping, /\d+ Playwright tests \(\d+ journeys/)).toBe(
      `${e2e} Playwright tests (${journeys ?? ''} journeys`,
    );
  });

  it('the changelog', () => {
    const changelog = rootDoc('CHANGELOG.md');
    expect(stated(changelog, /[\d,]+ tests pass — core .*? files\)(?=\. )/)).toBe(
      `${total} tests pass — core ${core.tests} (${core.files} files), server ${server.tests} ` +
        `(${server.files} files), web ${web.tests} (${web.files} files)`,
    );
    expect(stated(changelog, /Coverage: core .*? branches\./)).toBe(
      `Coverage: core ${core.lines} lines / ${core.branches} branches; server ${server.lines} lines / ` +
        `${server.branches} branches; web ${web.lines} lines / ${web.branches} branches.`,
    );
    expect(stated(changelog, /\d+ of \d+ pass/)).toBe(`${e2ePassed ?? ''} of ${e2e} pass`);
  });
});
