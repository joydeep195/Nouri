export const NUTRIENT_KEYS = [
  'kcal',
  'sugars',
  'fat',
  'satFat',
  'salt',
  'fiber',
  'protein',
  'carbs',
  'alcohol',
] as const;
export type NutrientKey = (typeof NUTRIENT_KEYS)[number];

/** Per 100 g (food) or 100 ml (drinks). `null` means unknown. */
export type Nutrition = Record<NutrientKey, number | null>;
/** Nutrition as it arrives from forms or OCR: may be partial, strings, or empty. */
export type NutritionInput = Partial<Record<NutrientKey, number | string | null>>;

export type ProductSource = 'barcode' | 'label' | 'typed';
export type NutriScore = 'a' | 'b' | 'c' | 'd' | 'e';

export interface Product {
  source: ProductSource;
  name: string;
  code?: string | undefined;
  brand?: string | undefined;
  image?: string | null | undefined;
  quantity?: string | undefined;
  ingredientsText?: string | undefined;
  /** English ingredient taxonomy tags from Open Food Facts, e.g. "skimmed milk powder". */
  ingredientTags?: string[] | undefined;
  /** Additive tags like "en:e407" or "e471". */
  additives?: string[] | undefined;
  allergens?: string[] | undefined;
  labels?: string[] | undefined;
  categories?: string[] | undefined;
  isBeverage?: boolean | undefined;
  nova?: number | null | undefined;
  nutriscore?: NutriScore | null | undefined;
  nutrition?: NutritionInput | null | undefined;
}
