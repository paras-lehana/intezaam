/**
 * Tests for the runtime image's dependency closure (the Dockerfile's runtime stage).
 *
 * Responsibility: the runtime stage installs only this workspace's production tree, so prove
 * that tree is exactly what the server needs: every package the server source imports is a
 * declared runtime dependency (or the image would crash on start), every declared runtime
 * dependency is imported (or the image carries dead weight), and the install stays filtered to
 * this workspace. Boundary: reads the repository's own files; no network, no Docker daemon.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { isBuiltin } from 'node:module';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const SRC_DIR = fileURLToPath(new URL('..', import.meta.url));
const MANIFEST_PATH = fileURLToPath(new URL('../../package.json', import.meta.url));
const DOCKERFILE_PATH = fileURLToPath(new URL('../../../../Dockerfile', import.meta.url));

/** Only the fields this test reads; a missing field fails the parse with a clear message. */
const manifestSchema = z.object({
  name: z.string(),
  dependencies: z.record(z.string(), z.string()),
});

// Covers `from 'x'` (static import and re-export), `import 'x'` and `import('x')`.
const IMPORT_SPECIFIER = /\b(?:from|import)\s*\(?\s*'([^']+)'/g;

/** The workspace manifest, parsed rather than cast. */
function readManifest(): z.infer<typeof manifestSchema> {
  const raw: unknown = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  return manifestSchema.parse(raw);
}

/** Every production source file: tests are dev-only and never ship in the image. */
function productionSources(): readonly string[] {
  return readdirSync(SRC_DIR, { encoding: 'utf8', recursive: true })
    .filter((path) => path.endsWith('.ts') && !path.split(sep).includes('__tests__'))
    .map((path) => readFileSync(join(SRC_DIR, path), 'utf8'));
}

/** `@scope/name/sub` -> `@scope/name`, `name/sub` -> `name`: the unit npm installs. */
function packageNameOf(specifier: string): string {
  const [first = '', second = ''] = specifier.split('/');
  return first.startsWith('@') ? `${first}/${second}` : first;
}

/** Packages (not relative files, not Node built-ins) that the production source imports. */
function importedPackages(): ReadonlySet<string> {
  const names = new Set<string>();
  for (const source of productionSources()) {
    for (const [, specifier = ''] of source.matchAll(IMPORT_SPECIFIER)) {
      if (specifier.startsWith('.') || isBuiltin(specifier)) continue;
      names.add(packageNameOf(specifier));
    }
  }
  return names;
}

/** The runtime stage's `RUN npm ci ...` instruction, with line continuations joined. */
function runtimeInstallCommand(dockerfile: string): string {
  // Joining "\" continuations first lets one line hold the whole RUN instruction.
  const joined = dockerfile.replace(/\\\r?\n\s*/g, ' ');
  const runtimeStage = joined.split(/^FROM\s/m).find((stage) => /\bAS runtime\b/.test(stage));
  const lines = (runtimeStage ?? '').split(/\r?\n/);
  return lines.find((line) => line.startsWith('RUN npm ci')) ?? '';
}

describe('runtime image dependency closure', () => {
  const manifest = readManifest();
  const declared = Object.keys(manifest.dependencies);
  const imported = importedPackages();

  it('finds the packages the server imports', () => {
    // Guards the scanner itself: an empty set would make the next two checks pass vacuously.
    expect(imported.size).toBeGreaterThan(0);
  });

  it('declares every package the server source imports as a runtime dependency', () => {
    const undeclared = [...imported].filter((name) => !declared.includes(name));
    expect(undeclared).toEqual([]);
  });

  it('imports every declared runtime dependency, so none is dead weight in the image', () => {
    const unused = declared.filter((name) => !imported.has(name));
    expect(unused).toEqual([]);
  });

  it('installs only this workspace production tree in the runtime stage', () => {
    const command = runtimeInstallCommand(readFileSync(DOCKERFILE_PATH, 'utf8'));
    expect(command).toContain(`--workspace ${manifest.name}`);
    expect(command).toContain('--omit=dev');
    expect(command).toContain('--include-workspace-root=false');
  });
});
