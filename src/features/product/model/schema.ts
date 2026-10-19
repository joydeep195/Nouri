// Runtime validation for product data that comes from outside the code: the Open Food Facts API
// and products stored on the phone. Unknown fields are dropped, strings are length-capped and
// numbers range-checked. A bad field is discarded on its own instead of failing the whole record.

import { z } from '@/shared/lib/zod';
import { toSafeImageUrl } from '@/shared/lib/safeUrl';
import { MAX_INGREDIENTS_LENGTH, MAX_NAME_LENGTH, MAX_TAGS, MAX_TAG_LENGTH, NUTRIENT_MAX } from './limits';
import type { NutrientKey, Nutrition, Product } from './types';

/** A string, truncated to `max` characters. */
const text = (max: number) => z.string().transform((s) => s.slice(0, max));
/** An optional capped string; anything that isn't a string becomes undefined. */
const optText = (max: number) => text(max).optional().catch(undefined);

/** A list of short strings; non-strings are skipped and the list is capped. */
const tagList = z
  .array(z.unknown())
  .transform((items) =>
    items
      .filter((x): x is string => typeof x === 'string')
      .slice(0, MAX_TAGS)
      .map((s) => s.slice(0, MAX_TAG_LENGTH)),
  )
  .optional()
  .catch(undefined);

/** A per-100 g value within its believable range; anything else becomes null (unknown). */
const nutrient = (key: NutrientKey) =>
  z
    .number()
    .min(0)
    .max(NUTRIENT_MAX[key])
    .nullable()
    .optional()
    .catch(null)
    .transform((v) => v ?? null);

const NutritionSchema = z.object({
  kcal: nutrient('kcal'),
  sugars: nutrient('sugars'),
  fat: nutrient('fat'),
  satFat: nutrient('satFat'),
  salt: nutrient('salt'),
  fiber: nutrient('fiber'),
  protein: nutrient('protein'),
  carbs: nutrient('carbs'),
  alcohol: nutrient('alcohol'),
}) satisfies z.ZodType<Nutrition>;

export const ProductSchema = z.object({
  source: z.enum(['barcode', 'label', 'typed']).catch('typed'),
  name: text(MAX_NAME_LENGTH).catch('Unnamed product'),
  code: z
    .string()
    .regex(/^\d{8,14}$/)
    .optional()
    .catch(undefined),
  brand: optText(120),
  image: z
    .unknown()
    .transform((v) => toSafeImageUrl(v))
    .optional(),
  quantity: optText(60),
  ingredientsText: optText(MAX_INGREDIENTS_LENGTH),
  ingredientTags: tagList,
  additives: tagList,
  allergens: tagList,
  labels: tagList,
  categories: tagList,
  isBeverage: z.boolean().optional().catch(undefined),
  nova: z.number().int().min(1).max(4).nullable().optional().catch(null),
  nutriscore: z.enum(['a', 'b', 'c', 'd', 'e']).nullable().optional().catch(null),
  nutrition: NutritionSchema.nullable().optional().catch(null),
});

/** Validates a stored product. Returns null when it isn't a product at all. */
export function parseProduct(raw: unknown): Product | null {
  const result = ProductSchema.safeParse(raw);
  if (!result.success) return null;
  const product: Product = result.data;
  return product;
}

// ---------- Open Food Facts API ----------

const OffProductSchema = z.object({
  product_name: optText(300),
  product_name_en: optText(300),
  generic_name: optText(300),
  brands: optText(300),
  image_front_small_url: optText(2048),
  image_front_url: optText(2048),
  quantity: optText(100),
  ingredients_text: optText(MAX_INGREDIENTS_LENGTH),
  ingredients_text_en: optText(MAX_INGREDIENTS_LENGTH),
  ingredients_tags: tagList,
  additives_tags: tagList,
  allergens_tags: tagList,
  labels_tags: tagList,
  categories_tags: tagList,
  nova_group: z.coerce.number().int().min(1).max(4).optional().catch(undefined),
  nutriscore_grade: optText(10),
  nutriments: z.record(z.string(), z.unknown()).optional().catch(undefined),
});

export type OffProduct = z.infer<typeof OffProductSchema>;

export const OffResponseSchema = z.object({
  status: z.number().optional().catch(undefined),
  product: OffProductSchema.optional().catch(undefined),
});
