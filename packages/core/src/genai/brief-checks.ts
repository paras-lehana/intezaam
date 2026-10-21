/**
 * Per-field evidence checks for the brief guard (synthesis §5 job 1; research note 09 §5.3):
 * the city, the date and the diet, which need more than "same value when re-read".
 *
 * Responsibility: a gazetteer city must equal the code's reading and an unknown town must
 * appear in a quote; dates are recomputed by code from their quote; menu, halal and Jain
 * guests each need their own word. Boundary: writes only to the guard's draft and drops.
 */
import { findCity } from '../domain/city-table.js';
import type { BriefDraft, BriefModelOutput } from '../schemas/brief.js';
import { foldForMatch } from '../security/normalise.js';
import type { EvidenceGuard, Mutable } from './evidence.js';

/**
 * Sets a draft key only when there is a value.
 * @example
 * set(draft, 'city', undefined); // leaves draft.city untouched
 */
export function set<K extends keyof BriefDraft>(
  draft: Mutable<BriefDraft>,
  key: K,
  value: BriefDraft[K] | undefined,
): void {
  if (value !== undefined) draft[key] = value;
}

/**
 * A gazetteer city must equal the code's venue city; an unknown town must appear in a quote.
 * @example
 * checkCity(guard, { ...reply, city: 'Jaipur' }); // 'Jaipur' when a quote says Jaipur
 */
export function checkCity(guard: EvidenceGuard, output: BriefModelOutput): string | undefined {
  if (output.city === undefined) return undefined;
  const readings = guard.readings('city');
  if (readings === undefined) return undefined;
  const claimed = findCity(output.city)?.name;
  const code = readings.all.city?.value;
  if (claimed !== undefined) return code === claimed ? code : guard.drop('city', 'not-supported');
  const quoted = readings.tokens.map((token) => token.text).join(' ');
  return quoted.includes(foldForMatch(output.city))
    ? output.city.trim()
    : guard.drop('city', 'not-supported');
}

/**
 * Dates are recomputed by code from the quote; the model's date is discarded.
 * @example
 * checkDate(guard, reply); // guard.draft.dateIso is what code read from the date quote
 */
export function checkDate(guard: EvidenceGuard, output: BriefModelOutput): void {
  const claimed =
    output.dateIso !== undefined || output.month !== undefined || output.dateFlexible !== undefined;
  const readings = claimed ? guard.readings('date') : undefined;
  if (readings === undefined) return;
  const code = readings.all.date?.value;
  if (code === undefined) {
    guard.drop('date', 'not-supported');
    return;
  }
  set(guard.draft, 'dateIso', code.dateIso);
  set(guard.draft, 'month', code.month);
  guard.draft.dateFlexible = code.flexible;
}

/**
 * Menu, halal and Jain guests each need their own word in the diet quotes.
 * @example
 * checkDiet(guard, reply); // keeps menu 'jain' only when a diet quote says Jain
 */
export function checkDiet(guard: EvidenceGuard, output: BriefModelOutput): void {
  const claimed = output.diet;
  const readings = claimed === undefined ? undefined : guard.readings('diet');
  if (claimed === undefined || readings === undefined) return;
  const code = readings.all.diet?.value;
  const diet = {
    ...(claimed.menu !== undefined && code?.menu === claimed.menu ? { menu: claimed.menu } : {}),
    ...(claimed.halal === true && code?.halal === true ? { halal: true } : {}),
    ...(claimed.jainGuests === true && code?.menu === 'jain' ? { jainGuests: true } : {}),
  };
  if (Object.keys(diet).length > 0) guard.draft.diet = diet;
  else guard.drop('diet', 'not-supported');
}
