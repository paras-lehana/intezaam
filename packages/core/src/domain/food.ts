/**
 * Food quantities (FOOD-01) — how much to cook per guest.
 *
 * Responsibility: grams per adult per sitting, the kids' portion factor and per-guest raw
 * quantities a caterer can check.
 * Boundary: planning quantities only; the caterer's menu decides the final list.
 */
import { range } from './units.js';

/** 600–750 g of food per adult per sitting, however many dishes are served (S-HASSANCHEF-2026). */
export const FOOD_GRAMS_PER_ADULT = range(600, 750);

/** Children eat about half an adult portion (grade D). */
export const KIDS_PORTION_FACTOR = 0.5;

/** Per-guest raw quantities for a vegetarian Indian menu (S-HASSANCHEF-2026, grade C/D). */
export const RAW_GRAMS_PER_GUEST = {
  rice: 47,
  dal: 32,
  breadFlour: 90,
  sweet: 60,
} as const;

/** Ice cream is planned per guest in millilitres (same source). */
export const ICE_CREAM_ML_PER_GUEST = 80;
