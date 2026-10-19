// Product lookup via Open Food Facts: a free, open database of ~4 million packaged foods.
// https://openfoodfacts.github.io/openfoodfacts-server/api/

import { barcodeVariants } from '@/features/scan/model/scan';
import type { NutriScore, Nutrition, Product } from './types';

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

export class LookupError extends Error {
  override name = 'LookupError';
}

/** The subset of an Open Food Facts product record that we read. */
export interface OffProduct {
  product_name?: string;
  product_name_en?: string;
  generic_name?: string;
  brands?: string;
  image_front_small_url?: string;
  image_front_url?: string;
  quantity?: string;
  ingredients_text?: string;
  ingredients_text_en?: string;
  ingredients_tags?: string[];
  additives_tags?: string[];
  allergens_tags?: string[];
  labels_tags?: string[];
  categories_tags?: string[];
  nova_group?: number | null;
  nutriscore_grade?: string;
  nutriments?: Record<string, unknown>;
}

export async function lookupBarcode(code: string, { signal }: { signal?: AbortSignal } = {}): Promise<Product | null> {
  for (const candidate of barcodeVariants(code)) {
    let res: Response;
    try {
      res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${candidate}.json?fields=${FIELDS}`, {
        signal: signal ?? null,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      throw new LookupError("Couldn't reach the food database. Check your internet connection.");
    }
    if (res.status === 404) continue;
    if (!res.ok)
      throw new LookupError(`The food database is having trouble (error ${res.status}). Try again in a moment.`);
    const data = (await res.json()) as { status?: number; product?: OffProduct };
    if (data.status === 1 && data.product) return fromOpenFoodFacts(data.product, candidate);
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
    image: firstText(p.image_front_small_url, p.image_front_url) || null,
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
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  };
  let kcal = num('energy-kcal_100g');
  const kj = num('energy_100g');
  if (kcal == null && kj != null) kcal = kj / 4.184;
  let salt = num('salt_100g');
  const sodium = num('sodium_100g');
  if (salt == null && sodium != null) salt = sodium * 2.5;
  const out: Nutrition = {
    kcal: kcal == null ? null : Math.round(kcal),
    sugars: num('sugars_100g'),
    fat: num('fat_100g'),
    satFat: num('saturated-fat_100g'),
    salt,
    fiber: num('fiber_100g'),
    protein: num('proteins_100g'),
    carbs: num('carbohydrates_100g'),
    alcohol: num('alcohol_100g'),
  };
  const known = (['kcal', 'sugars', 'fat', 'satFat', 'salt', 'protein'] as const).filter((k) => out[k] != null).length;
  return known >= 2 ? out : null;
}

export const productPageUrl = (code: string): string =>
  `https://world.openfoodfacts.org/product/${encodeURIComponent(code)}`;
