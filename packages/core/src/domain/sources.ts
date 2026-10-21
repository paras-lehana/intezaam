/**
 * Source register — every published fact the planner relies on, keyed by a closed id.
 *
 * Responsibility: merge the grouped registers into one `SOURCES` table whose keys form
 * the `SourceId` union, so a domain row or rule that cites an unknown source is a compile
 * error, and turn an id into the wire `SourceRef` the plan's trace links to.
 * Boundary: metadata only; facts live in the domain tables that cite these ids.
 */
import type { SourceRef } from '../schemas/trace.js';
import { CALENDAR_SOURCES } from './sources-calendar.js';
import { LAW_SOURCES } from './sources-law.js';
import { MONEY_SOURCES } from './sources-money.js';
import { PRACTICE_SOURCES } from './sources-practice.js';
import { RITUAL_SOURCES } from './sources-ritual.js';

/** The whole register. Ids look like `S-VK-2026` (publisher key + publication year or ND). */
export const SOURCES = {
  ...MONEY_SOURCES,
  ...LAW_SOURCES,
  ...CALENDAR_SOURCES,
  ...RITUAL_SOURCES,
  ...PRACTICE_SOURCES,
} as const;

export type SourceId = keyof typeof SOURCES;

/** The register's id pattern; the plan schema checks cited ids against it. */
export const SOURCE_ID_PATTERN = /^S-[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

/**
 * The wire form of one source, as the plan's `sources` list carries it.
 * @example
 * sourceRef('S-NDMA-2014').confidence; // 'A'
 */
export function sourceRef(id: SourceId): SourceRef {
  return { id, ...SOURCES[id] };
}

/**
 * True when a string is a registered source id (for validating ids that arrive as text).
 * @example
 * isSourceId('S-VK-2026'); // true
 * isSourceId('S-NOPE'); // false
 */
export function isSourceId(id: string): id is SourceId {
  return Object.hasOwn(SOURCES, id);
}

/**
 * Every source in the register, for the method page (stable register order).
 * @example
 * listSources().length > 0; // true
 */
export function listSources(): SourceRef[] {
  return Object.entries(SOURCES).map(([id, entry]) => ({ id, ...entry }));
}
