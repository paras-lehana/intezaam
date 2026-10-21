/**
 * Dead-export gate for domain/: every exported name must be read by production code.
 *
 * Responsibility: fail `npm test` (and so `npm run verify`) when a domain table, constant,
 * helper or type is exported but no engine, schema, server or web file — nor its own module —
 * reads it, so superseded figures cannot linger beside the ones the engines use. A test
 * that pins a value does not keep it alive. Boundary: a word-level scan of source text with
 * comments removed; it reads files, never imports them, and the domain barrel's re-exports
 * do not count as readers.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = new URL('../../../../', import.meta.url);
const DOMAIN_DIR = new URL('packages/core/src/domain/', REPO_ROOT);

/** Every workspace whose source can read a domain export. */
const PRODUCTION_ROOTS = ['packages/core/src/', 'apps/server/src/', 'apps/web/src/'];

/** Test files and the domain barrel are not readers: only shipped code keeps a name alive. */
const NOT_A_READER = /(?:^|\/)__tests__\/|\.test\.tsx?$|^domain\/index\.ts$/u;
const SOURCE_FILE = /\.tsx?$/u;
const EXPORTED_NAME = /^export (?:const|function|type|interface) (\w+)/gmu;
const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//gu;
const LINE_COMMENT = /^\s*\/\/.*$/gmu;

function sourceFiles(root: URL): string[] {
  return readdirSync(root, { recursive: true, encoding: 'utf8' })
    .map((path) => path.replaceAll('\\', '/'))
    .filter((path) => SOURCE_FILE.test(path) && !path.includes('node_modules/'));
}

function code(file: URL): string {
  return readFileSync(file, 'utf8').replace(BLOCK_COMMENT, '').replace(LINE_COMMENT, '');
}

/** Production source text, one entry per file, comments removed. */
const CORPUS: readonly string[] = PRODUCTION_ROOTS.flatMap((root) => {
  const base = new URL(root, REPO_ROOT);
  return sourceFiles(base)
    .filter((path) => !NOT_A_READER.test(path))
    .map((path) => code(new URL(path, base)));
});

/** Each domain module with the names it exports. */
const DOMAIN_EXPORTS = sourceFiles(DOMAIN_DIR)
  .filter((path) => path !== 'index.ts')
  .map((path) => ({
    path,
    names: [...readFileSync(new URL(path, DOMAIN_DIR), 'utf8').matchAll(EXPORTED_NAME)].flatMap(
      (match) => (match[1] === undefined ? [] : [match[1]]),
    ),
  }));

/** Occurrences of a whole word across the corpus; the declaration itself is one of them. */
function occurrences(name: string): number {
  const word = new RegExp(`\\b${name}\\b`, 'gu');
  return CORPUS.reduce((sum, text) => sum + (text.match(word)?.length ?? 0), 0);
}

describe('domain exports are read by production code', () => {
  it('scans every domain module', () => {
    expect(DOMAIN_EXPORTS.length).toBeGreaterThan(0);
    expect(DOMAIN_EXPORTS.every((module) => module.names.length > 0)).toBe(true);
  });

  it('no exported name is read only by its declaration', () => {
    const dead = DOMAIN_EXPORTS.flatMap(({ path, names }) =>
      names.filter((name) => occurrences(name) <= 1).map((name) => `${path}: ${name}`),
    );
    expect(dead).toEqual([]);
  });
});
