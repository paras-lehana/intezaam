/**
 * Reading back JSON the browser kept: on-device memory and saved-plan files.
 *
 * Responsibility: the one guarded JSON parse the web uses, and the one "read a remembered
 * value through its schema" step every on-device tool shares (spend amounts, ticked tasks,
 * vendor statuses, the guest list). Stored text is untrusted input — edited by hand, cut
 * short or left by an older version — so it is parsed defensively and validated by the
 * tool's own zod schema, and anything absent, blocked or malformed becomes the tool's empty
 * value. Boundary: no React; writing stays with `storePreference` in lib/preferences.
 */
import type { z } from 'zod';
import { readPreference } from '../../../lib/preferences';

/**
 * The value a JSON text encodes, or undefined when it is not valid JSON.
 * @example
 * parseJsonSafe('{"a":1}'); // { a: 1 }
 * parseJsonSafe('{oops'); // undefined
 */
export function parseJsonSafe(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * A remembered value, validated by its schema; the fallback when it is absent, blocked or
 * does not pass.
 * @example
 * readStored('intezaam:done-tasks', z.array(z.string()), []); // [] on a first visit
 */
export function readStored<T>(key: string, schema: z.ZodType<T>, fallback: NoInfer<T>): T {
  const stored = readPreference(key);
  if (stored === null) return fallback;
  const parsed = schema.safeParse(parseJsonSafe(stored));
  return parsed.success ? parsed.data : fallback;
}
