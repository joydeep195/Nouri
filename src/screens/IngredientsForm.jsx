import { useState } from 'react';
import { ChevronRight, ClipboardList, Info, Sparkles, TriangleAlert } from 'lucide-react';
import { TopBar } from '../components/ui.jsx';

const NUTRI_FIELDS = [
  { key: 'kcal', label: 'Calories', unit: 'kcal' },
  { key: 'sugars', label: 'Sugar', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
  { key: 'satFat', label: 'Saturated fat', unit: 'g' },
  { key: 'salt', label: 'Salt', unit: 'g' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'fiber', label: 'Fibre', unit: 'g' },
];

const toNum = (v) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/**
 * Lets the user check/enter ingredients (and optional nutrition), then builds a product to score.
 * Used for typed-in food, for reviewing text read from a label photo, and for fixing a result.
 */
export default function IngredientsForm({ title, source, base, initial = {}, banner, onSubmit, onBack, topRight }) {
  const [name, setName] = useState(initial.name ?? base?.name ?? '');
  const [ingredients, setIngredients] = useState(initial.ingredients ?? '');
  const [isBeverage, setIsBeverage] = useState(!!(initial.isBeverage ?? base?.isBeverage));
  const [nutri, setNutri] = useState(() =>
    Object.fromEntries(NUTRI_FIELDS.map((f) => [f.key, initial.nutrition?.[f.key] ?? ''])),
  );
  const prefilled = NUTRI_FIELDS.some((f) => initial.nutrition?.[f.key] != null);

  const nutrition = Object.fromEntries(NUTRI_FIELDS.map((f) => [f.key, toNum(nutri[f.key])]));
  const nutritionCount = Object.values(nutrition).filter((v) => v != null).length;
  const canSubmit = ingredients.replace(/[^a-z]/gi, '').length >= 3 || nutritionCount >= 2;

  const submit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    // The user's text replaces whatever the database said about ingredients.
    const { nutrition: _n, ingredientTags: _t, additives: _a, allergens: _al, nova: _nova, ...rest } = base || {};
    onSubmit({
      ...rest,
      source: rest.code ? rest.source || source : source,
      name: name.trim() || (source === 'label' ? 'Food from a label' : 'Your food'),
      ingredientsText: ingredients.trim(),
      nutrition: nutritionCount >= 2 ? nutrition : null,
      isBeverage,
    });
  };

  return (
    <main className="screen has-bar no-tabs">
      <TopBar title={title} onBack={onBack} right={topRight} />
      <form className="form" onSubmit={submit}>
        {banner === 'review' && (
          <div className="banner">
            <Sparkles size={18} />
            <span>Here's what we read. Check it quickly and fix anything that looks off, since small print can trip the reader up.</span>
          </div>
        )}
        {banner === 'little' && (
          <div className="banner warn">
            <TriangleAlert size={18} />
            <span>We could only make out a little text. Fix what's below, or retake the photo closer up in good light.</span>
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
            onChange={(e) => setName(e.target.value)}
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
            onChange={(e) => setIngredients(e.target.value)}
            autoFocus={source === 'typed' && !initial.ingredients}
          />
        </div>

        <label className="check-row">
          <input type="checkbox" checked={isBeverage} onChange={(e) => setIsBeverage(e.target.checked)} />
          It's a drink
        </label>

        <details className="nutri-form" open={prefilled}>
          <summary>
            <ClipboardList size={18} />
            <span>
              Nutrition per 100 {isBeverage ? 'ml' : 'g'} <span className="hint">(optional, for a better weight score)</span>
            </span>
            <ChevronRight size={18} />
          </summary>
          {prefilled && (
            <div className="banner" style={{ marginBottom: 12 }}>
              <Info size={18} />
              <span>We read these from the photo. Make sure they're the per-100 g (or 100 ml) column.</span>
            </div>
          )}
          <div className="nutri-inputs">
            {NUTRI_FIELDS.map((f) => (
              <label key={f.key}>
                {f.label} ({f.unit})
                <input
                  className="input"
                  inputMode="decimal"
                  placeholder="–"
                  value={nutri[f.key]}
                  onChange={(e) => setNutri((n) => ({ ...n, [f.key]: e.target.value.replace(/[^\d.,]/g, '') }))}
                />
              </label>
            ))}
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
