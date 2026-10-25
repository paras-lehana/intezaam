/**
 * Optional-field copying under `exactOptionalPropertyTypes`.
 *
 * Responsibility: copy fields from one record to another, leaving out the ones that are
 * undefined, so an optional field is either present with a value or absent (the compiler
 * forbids `key: undefined`): a named set of fields (`pickDefined`) or every field of a
 * record built field by field (`withoutUndefined`). One typed call replaces a wall of
 * `...(x === undefined ? {} : { x })` spreads. Boundary: shallow and pure; no casts.
 */

/** A value with `undefined` removed from its type. */
export type Defined<T> = Exclude<T, undefined>;

/** The named fields of `T`, each optional and never `undefined`. */
export type DefinedPick<T, K extends keyof T> = { [P in K]?: Defined<T[P]> };

/** Narrows a value to "not undefined" (a type guard, so generic code needs no cast). */
function isDefined<V>(value: V): value is Defined<V> {
  return value !== undefined;
}

/** Narrows a string to a key the record really owns. */
function isOwnKey<T extends object>(record: T, key: PropertyKey): key is keyof T {
  return Object.hasOwn(record, key);
}

/**
 * Copies a record without its undefined fields, for a record built field by field.
 * @example
 * withoutUndefined({ city: fields.city?.value, kind: fields.kind?.value }); // { city: 'Jaipur' } when only city was read
 */
export function withoutUndefined<T extends object>(record: T): DefinedPick<T, keyof T> {
  const kept: DefinedPick<T, keyof T> = {};
  for (const key of Object.keys(record)) {
    if (!isOwnKey(record, key)) continue;
    const value = record[key];
    if (isDefined(value)) kept[key] = value;
  }
  return kept;
}

/**
 * Copies the named fields of `source` that are defined; undefined ones are left out.
 * @example
 * pickDefined({ city: 'Pune', guests: undefined }, ['city', 'guests']); // { city: 'Pune' }
 */
export function pickDefined<T extends object, K extends keyof T>(
  source: T,
  keys: readonly K[],
): DefinedPick<T, K> {
  const picked: DefinedPick<T, K> = {};
  for (const key of keys) {
    const value = source[key];
    if (isDefined(value)) picked[key] = value;
  }
  return picked;
}
