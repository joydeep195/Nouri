// Product lookup via Open Food Facts: a free, open database of ~4 million packaged foods.
// https://openfoodfacts.github.io/openfoodfacts-server/api/

import { barcodeVariants } from './scan.js';

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

export class LookupError extends Error {}

export async function lookupBarcode(code, { signal } = {}) {
  for (const candidate of barcodeVariants(code)) {
    let res;
    try {
      res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${candidate}.json?fields=${FIELDS}`, { signal });
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      throw new LookupError("Couldn't reach the food database. Check your internet connection.");
    }
    if (res.status === 404) continue;
    if (!res.ok) throw new LookupError(`The food database is having trouble (error ${res.status}). Try again in a moment.`);
    const data = await res.json();
    if (data.status === 1 && data.product) return fromOpenFoodFacts(data.product, candidate);
  }
  return null;
}

const stripLang = (t) => String(t).replace(/^[a-z]{2}:/, '');

export function fromOpenFoodFacts(p, code) {
  const categories = (p.categories_tags || []).map(stripLang);
  const quantity = (p.quantity || '').replace(/\s*(℮|\be)\s*$/i, '').trim(); // drop the EU "estimated" mark
  const nutrition = fromNutriments(p.nutriments);
  const byVolume = /\d\s*(ml|cl|l)\b/i.test(quantity);
  const isBeverage =
    (categories.includes('beverages') && !categories.includes('dairies') && !categories.includes('fats')) ||
    (!categories.length && byVolume && (nutrition?.fat ?? 0) < 10);

  return {
    source: 'barcode',
    code,
    name: (p.product_name_en || p.product_name || p.generic_name || '').trim() || 'Unnamed product',
    brand: (p.brands || '').split(',')[0].trim(),
    image: p.image_front_small_url || p.image_front_url || null,
    quantity,
    ingredientsText: (p.ingredients_text_en || p.ingredients_text || '').replace(/_/g, '').replace(/\s+/g, ' ').trim(),
    ingredientTags: (p.ingredients_tags || []).filter((t) => t.startsWith('en:')).map((t) => stripLang(t).replace(/-/g, ' ')),
    additives: p.additives_tags || [],
    allergens: (p.allergens_tags || []).map(stripLang),
    labels: (p.labels_tags || []).map((t) => stripLang(t).replace(/-/g, ' ')),
    categories,
    isBeverage,
    nova: p.nova_group ?? null,
    nutriscore: /^[a-e]$/.test(p.nutriscore_grade || '') ? p.nutriscore_grade : null,
    nutrition,
  };
}

function fromNutriments(n) {
  if (!n) return null;
  const num = (k) => {
    const v = typeof n[k] === 'string' ? parseFloat(n[k]) : n[k];
    return Number.isFinite(v) ? v : null;
  };
  let kcal = num('energy-kcal_100g');
  if (kcal == null && num('energy_100g') != null) kcal = num('energy_100g') / 4.184;
  let salt = num('salt_100g');
  if (salt == null && num('sodium_100g') != null) salt = num('sodium_100g') * 2.5;
  const out = {
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
  const known = ['kcal', 'sugars', 'fat', 'satFat', 'salt', 'protein'].filter((k) => out[k] != null).length;
  return known >= 2 ? out : null;
}

export const productPageUrl = (code) => `https://world.openfoodfacts.org/product/${code}`;
