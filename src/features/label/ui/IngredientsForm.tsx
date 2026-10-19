import { useState, type ReactNode, type SyntheticEvent } from 'react';
import { ChevronRight, ClipboardList, Info, Sparkles, TriangleAlert } from 'lucide-react';
import { MAX_INGREDIENTS_LENGTH, MAX_NAME_LENGTH, NUTRIENT_MAX, parseNutrient } from '@/features/product/model/limits';
import type { NutrientKey, Nutrition, NutritionInput, Product, ProductSource } from '@/features/product/model/types';
import { TopBar } from '@/shared/ui/TopBar';
import './label.css';

const NUTRI_FIELDS: { key: NutrientKey; label: string; unit: string }[] = [
  { key: 'kcal', label: 'Calories', unit: 'kcal' },
  { key: 'sugars', label: 'Sugar', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
  { key: 'satFat', label: 'Saturated fat', unit: 'g' },
  { key: 'salt', label: 'Salt', unit: 'g' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'fiber', label: 'Fibre', unit: 'g' },
];

export interface IngredientsFormInitial {
  name?: string | undefined;
  ingredients?: string | undefined;
  nutrition?: NutritionInput | null | undefined;
  isBeverage?: boolean | undefined;
}

interface IngredientsFormProps {
  title: string;
  source: ProductSource;
  base?: Partial<Product> | undefined;
  initial?: IngredientsFormInitial;
  banner?: 'review' | 'little' | undefined;
  onSubmit: (product: Product) => void;
  onBack: () => void;
  topRight?: ReactNode;
}

/**
 * Lets the user check/enter ingredients (and optional nutrition), then builds a product to score.
 * Used for typed-in food, for reviewing text read from a label photo, and for fixing a result.
 */
export default function IngredientsForm({
  title,
  source,
  base,
  initial = {},
  banner,
  onSubmit,
  onBack,
  topRight,
}: IngredientsFormProps) {
  const [name, setName] = useState((initial.name ?? base?.name ?? '').slice(0, MAX_NAME_LENGTH));
  const [ingredients, setIngredients] = useState((initial.ingredients ?? '').slice(0, MAX_INGREDIENTS_LENGTH));
  const [isBeverage, setIsBeverage] = useState(!!(initial.isBeverage ?? base?.isBeverage));
  const [nutri, setNutri] = useState<Record<NutrientKey, string>>(() => {
    const out = {} as Record<NutrientKey, string>;
    for (const f of NUTRI_FIELDS) out[f.key] = String(initial.nutrition?.[f.key] ?? '');
    return out;
  });
  const prefilled = NUTRI_FIELDS.some((f) => initial.nutrition?.[f.key] != null);

  const parsed = Object.fromEntries(NUTRI_FIELDS.map((f) => [f.key, parseNutrient(f.key, nutri[f.key])])) as Partial<
    Record<NutrientKey, number | null>
  >;
  const invalid = NUTRI_FIELDS.filter((f) => Number.isNaN(parsed[f.key]));
  const nutritionCount = Object.values(parsed).filter((v) => v != null && !Number.isNaN(v)).length;
  const canSubmit = !invalid.length && (ingredients.replace(/[^a-z]/gi, '').length >= 3 || nutritionCount >= 2);

  const submit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    // The user's text replaces whatever the database said about ingredients.
    const { nutrition: _n, ingredientTags: _t, additives: _a, allergens: _al, nova: _nova, ...rest } = base ?? {};
    const nutrition: Nutrition = {
      kcal: null,
      sugars: null,
      fat: null,
      satFat: null,
      salt: null,
      fiber: null,
      protein: null,
      carbs: null,
      alcohol: null,
      ...parsed,
    };
    onSubmit({
      ...rest,
      source: rest.code ? (rest.source ?? source) : source,
      name: name.trim() || (source === 'label' ? 'Food from a label' : 'Your food'),
      ingredientsText: ingredients.trim(),
      nutrition: nutritionCount >= 2 ? nutrition : null,
      isBeverage,
    });
  };

  return (
    <main className="screen has-bar no-tabs">
      <TopBar title={title} onBack={onBack} right={topRight} />
      <form className="form" onSubmit={submit} noValidate>
        {banner === 'review' && (
          <div className="banner">
            <Sparkles size={18} aria-hidden="true" />
            <span>
              Here&apos;s what we read. Check it quickly and fix anything that looks off, since small print can trip the
              reader up.
            </span>
          </div>
        )}
        {banner === 'little' && (
          <div className="banner warn">
            <TriangleAlert size={18} aria-hidden="true" />
            <span>
              We could only make out a little text. Fix what&apos;s below, or retake the photo closer up in good light.
            </span>
          </div>
        )}

        <div className="field">
          <label htmlFor="food-name">
            Food name <span className="hint">(optional)</span>
          </label>
          <input
            id="food-name"
            className="input"
            placeholder="e.g. Masala oats"
            value={name}
            maxLength={MAX_NAME_LENGTH}
            onChange={(e) => {
              setName(e.target.value);
            }}
            autoComplete="off"
          />
        </div>

        <div className="field">
          <label htmlFor="ingredients">Ingredients</label>
          <textarea
            id="ingredients"
            className="textarea"
            placeholder="e.g. Rolled oats, sugar, milk solids, salt, emulsifier (471), flavouring"
            value={ingredients}
            maxLength={MAX_INGREDIENTS_LENGTH}
            onChange={(e) => {
              setIngredients(e.target.value);
            }}
            autoFocus={source === 'typed' && !initial.ingredients}
          />
        </div>

        <label className="check-row">
          <input
            type="checkbox"
            checked={isBeverage}
            onChange={(e) => {
              setIsBeverage(e.target.checked);
            }}
          />
          It&apos;s a drink
        </label>

        <details className="nutri-form" open={prefilled || invalid.length > 0}>
          <summary>
            <ClipboardList size={18} aria-hidden="true" />
            <span>
              Nutrition per 100 {isBeverage ? 'ml' : 'g'}{' '}
              <span className="hint">(optional, for a better weight score)</span>
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </summary>
          {prefilled && (
            <div className="banner" style={{ marginBottom: 12 }}>
              <Info size={18} aria-hidden="true" />
              <span>We read these from the photo. Make sure they&apos;re the per-100 g (or 100 ml) column.</span>
            </div>
          )}
          <div className="nutri-inputs">
            {NUTRI_FIELDS.map((f) => {
              const bad = Number.isNaN(parsed[f.key]);
              return (
                <label key={f.key}>
                  {f.label} ({f.unit})
                  <input
                    className={`input ${bad ? 'invalid' : ''}`}
                    inputMode="decimal"
                    placeholder="–"
                    value={nutri[f.key]}
                    maxLength={7}
                    aria-invalid={bad}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d.,]/g, '');
                      setNutri((n) => ({ ...n, [f.key]: value }));
                    }}
                  />
                  {bad && <span className="field-error">0 to {NUTRIENT_MAX[f.key]}</span>}
                </label>
              );
            })}
          </div>
        </details>

        <div className="action-bar">
          <button className="btn btn-primary" type="submit" disabled={!canSubmit}>
            <Sparkles size={20} /> Check this food
          </button>
        </div>
      </form>
    </main>
  );
}
