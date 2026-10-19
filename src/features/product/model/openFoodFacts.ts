// Product lookup via Open Food Facts: a free, open database of ~4 million packaged foods.
// https://openfoodfacts.github.io/openfoodfacts-server/api/
// Only the barcode number is sent. Responses are validated before use (see schema.ts).

import { barcodeVariants } from '@/features/scan/model/scan';
import { FOOD_API_ORIGIN } from '@/shared/config/security';
import { fetchJson, HttpError } from '@/shared/lib/http';
import { toSafeImageUrl } from '@/shared/lib/safeUrl';
import { NUTRIENT_MAX } from './limits';
import { OffResponseSchema, type OffProduct } from './schema';
import type { NutrientKey, NutriScore, Nutrition, Product } from './types';

const FIELDS = [
  'code',
  'product_name',
  'product_name_en',
  'generic_name',
  'brands',
  'image_front_small_url',
  'image_front_url',
  'quantity',
  'ingredients_text',
  'ingredients_text_en',
  'ingredients_tags',
  'additives_tags',
  'allergens_tags',
  'labels_tags',
  'categories_tags',
  'nova_group',
  'nutriscore_grade',
  'nutriments',
].join(',');

/** A lookup failure with a message that is safe to show to the user. */
export class LookupError extends Error {
  override name = 'LookupError';
}

export const productApiUrl = (code: string): string =>
  `${FOOD_API_ORIGIN}/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`;

export const productPageUrl = (code: string): string => `${FOOD_API_ORIGIN}/product/${encodeURIComponent(code)}`;

/** Looks a barcode up. Resolves null when the product isn't in the database. */
export async function lookupBarcode(code: string, { signal }: { signal?: AbortSignal } = {}): Promise<Product | null> {
  for (const candidate of barcodeVariants(code)) {
    let response: { status: number; data: unknown };
    try {
      response = await fetchJson(productApiUrl(candidate), { signal, okStatuses: [404] });
    } catch (err) {
      if (signal?.aborted) throw err;
      if (err instanceof HttpError && err.kind === 'status' && err.status === 429) {
        throw new LookupError('The food database is busy right now. Wait a minute and try again.');
      }
      if (err instanceof HttpError && err.kind === 'status') {
        throw new LookupError(
          `The food database is having trouble (error ${err.status ?? '?'}). Try again in a moment.`,
        );
      }
      throw new LookupError("Couldn't reach the food database. Check your internet connection.");
    }
    if (response.status === 404) continue;
    const parsed = OffResponseSchema.safeParse(response.data);
    if (!parsed.success) throw new LookupError('The food database sent something unexpected. Try again later.');
    if (parsed.data.status === 1 && parsed.data.product) return fromOpenFoodFacts(parsed.data.product, candidate);
  }
  return null;
}

const stripLang = (t: string) => t.replace(/^[a-z]{2}:/, '');
/** The first value that has non-whitespace text (Open Food Facts often has empty strings). */
const firstText = (...values: (string | undefined)[]) => values.find((v) => v?.trim()) ?? '';

export function fromOpenFoodFacts(p: OffProduct, code: string): Product {
  const categories = (p.categories_tags ?? []).map(stripLang);
  const quantity = (p.quantity ?? '').replace(/\s*(℮|\be)\s*$/i, '').trim(); // drop the EU "estimated" mark
  const nutrition = fromNutriments(p.nutriments);
  const byVolume = /\d\s*(ml|cl|l)\b/i.test(quantity);
  const isBeverage =
    (categories.includes('beverages') && !categories.includes('dairies') && !categories.includes('fats')) ||
    (!categories.length && byVolume && (nutrition?.fat ?? 0) < 10);
  const grade = p.nutriscore_grade ?? '';

  return {
    source: 'barcode',
    code,
    name: firstText(p.product_name_en, p.product_name, p.generic_name).trim() || 'Unnamed product',
    brand: (p.brands ?? '').split(',')[0]?.trim() ?? '',
    image: toSafeImageUrl(firstText(p.image_front_small_url, p.image_front_url)),
    quantity,
    ingredientsText: firstText(p.ingredients_text_en, p.ingredients_text).replace(/_/g, '').replace(/\s+/g, ' ').trim(),
    ingredientTags: (p.ingredients_tags ?? [])
      .filter((t) => t.startsWith('en:'))
      .map((t) => stripLang(t).replace(/-/g, ' ')),
    additives: p.additives_tags ?? [],
    allergens: (p.allergens_tags ?? []).map(stripLang),
    labels: (p.labels_tags ?? []).map((t) => stripLang(t).replace(/-/g, ' ')),
    categories,
    isBeverage,
    nova: p.nova_group ?? null,
    nutriscore: /^[a-e]$/.test(grade) ? (grade as NutriScore) : null,
    nutrition,
  };
}

function fromNutriments(n: Record<string, unknown> | undefined): Nutrition | null {
  if (!n) return null;
  const num = (k: string): number | null => {
    const raw = n[k];
    const v = typeof raw === 'string' ? parseFloat(raw) : raw;
    return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
  };
  const inRange = (key: NutrientKey, v: number | null) => (v != null && v <= NUTRIENT_MAX[key] ? v : null);

  let kcal = num('energy-kcal_100g');
  const kj = num('energy_100g');
  if (kcal == null && kj != null) kcal = kj / 4.184;
  let salt = num('salt_100g');
  const sodium = num('sodium_100g');
  if (salt == null && sodium != null) salt = sodium * 2.5;
  const out: Nutrition = {
    kcal: inRange('kcal', kcal == null ? null : Math.round(kcal)),
    sugars: inRange('sugars', num('sugars_100g')),
    fat: inRange('fat', num('fat_100g')),
    satFat: inRange('satFat', num('saturated-fat_100g')),
    salt: inRange('salt', salt),
    fiber: inRange('fiber', num('fiber_100g')),
    protein: inRange('protein', num('proteins_100g')),
    carbs: inRange('carbs', num('carbohydrates_100g')),
    alcohol: inRange('alcohol', num('alcohol_100g')),
  };
  const known = (['kcal', 'sugars', 'fat', 'satFat', 'salt', 'protein'] as const).filter((k) => out[k] != null).length;
  return known >= 2 ? out : null;
}
