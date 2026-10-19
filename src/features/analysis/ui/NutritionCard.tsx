import type { NutrientKey, Nutrition } from '@/features/product/model/types';
import { nutrientLevel, type NutrientLevel } from '../model/nutrition';

type Level = NutrientLevel | 'good' | null;

function kcalLevel(kcal: number | null, isBeverage: boolean): Level {
  if (kcal == null) return null;
  if (isBeverage) return kcal <= 10 ? 'low' : kcal <= 40 ? 'medium' : 'high';
  return kcal <= 150 ? 'low' : kcal <= 400 ? 'medium' : 'high';
}

const LEVEL_TEXT: Record<Exclude<Level, null>, string> = { low: 'Low', medium: 'Med', high: 'High', good: 'Good' };
const fmt = (v: number) => (v >= 100 ? Math.round(v) : Math.round(v * 10) / 10);

export function NutritionCard({ n, isBeverage }: { n: Nutrition; isBeverage: boolean }) {
  const items: { key: NutrientKey; label: string; unit: string; level: Level }[] = [
    { key: 'kcal', label: 'Calories', unit: 'kcal', level: kcalLevel(n.kcal, isBeverage) },
    { key: 'sugars', label: 'Sugar', unit: 'g', level: nutrientLevel('sugars', n.sugars, isBeverage) },
    { key: 'fat', label: 'Fat', unit: 'g', level: nutrientLevel('fat', n.fat, isBeverage) },
    { key: 'satFat', label: 'Saturated fat', unit: 'g', level: nutrientLevel('satFat', n.satFat, isBeverage) },
    { key: 'salt', label: 'Salt', unit: 'g', level: nutrientLevel('salt', n.salt, isBeverage) },
    { key: 'protein', label: 'Protein', unit: 'g', level: (n.protein ?? 0) >= 8 ? 'good' : null },
    { key: 'fiber', label: 'Fibre', unit: 'g', level: (n.fiber ?? 0) >= 3 ? 'good' : null },
  ];

  return (
    <section className="card" aria-labelledby="nutrition-heading">
      <h2 id="nutrition-heading">Nutrition</h2>
      <p className="card-sub">Per {isBeverage ? '100 ml' : '100 g'}</p>
      <dl className="nutri">
        {items.map((i) => {
          const value = n[i.key];
          if (value == null) return null;
          return (
            <div key={i.key} className="nutri-item">
              <dt className="label">{i.label}</dt>
              <dd className="value">
                <b>
                  {fmt(value)}
                  <small>{i.unit}</small>
                </b>
                {i.level && <span className={`lvl lvl-${i.level}`}>{LEVEL_TEXT[i.level]}</span>}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
