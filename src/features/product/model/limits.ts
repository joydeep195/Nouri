// Hard limits on product data, shared by the forms and by validation of stored/downloaded data.

import type { NutrientKey } from './types';

export const MAX_NAME_LENGTH = 120;
export const MAX_INGREDIENTS_LENGTH = 5000;
export const MAX_TAGS = 300;
export const MAX_TAG_LENGTH = 120;

/** Highest believable value per 100 g / 100 ml. */
export const NUTRIENT_MAX: Record<NutrientKey, number> = {
  kcal: 1000,
  sugars: 100,
  fat: 100,
  satFat: 100,
  salt: 100,
  fiber: 100,
  protein: 100,
  carbs: 100,
  alcohol: 100,
};

/** Parses a user-typed nutrient value. Returns null when empty, NaN when invalid or out of range. */
export function parseNutrient(key: NutrientKey, raw: string): number | null {
  const s = raw.trim().replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= NUTRIENT_MAX[key] ? n : NaN;
}
