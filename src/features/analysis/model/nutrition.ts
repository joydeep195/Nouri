// Nutrition-table rules, per 100 g (food) or 100 ml (drinks).

import type { Profile } from '@/features/profile/model/profile';
import { NUTRIENT_KEYS, type Nutrition, type NutritionInput } from '@/features/product/model/types';
import { makeFlag, type FlagInput } from './flags';
import type { Flag } from './types';

export type NutrientLevel = 'low' | 'medium' | 'high';
type LevelKey = 'fat' | 'satFat' | 'sugars' | 'salt';

// UK FSA "traffic light" thresholds: [low at or below, high above].
const LEVELS: Record<'food' | 'drink', Record<LevelKey, readonly [number, number]>> = {
  food: { fat: [3, 17.5], satFat: [1.5, 5], sugars: [5, 22.5], salt: [0.3, 1.5] },
  drink: { fat: [1.5, 8.75], satFat: [0.75, 2.5], sugars: [2.5, 11.25], salt: [0.3, 0.75] },
};

export function nutrientLevel(key: LevelKey, value: number | null, isBeverage: boolean): NutrientLevel | null {
  const t = (isBeverage ? LEVELS.drink : LEVELS.food)[key];
  if (value == null) return null;
  if (value <= t[0]) return 'low';
  if (value > t[1]) return 'high';
  return 'medium';
}

/** Parses loose input into numbers; returns null unless at least two key values are known. */
export function cleanNutrition(n: NutritionInput | null | undefined): Nutrition | null {
  if (!n) return null;
  const out = {} as Nutrition;
  for (const k of NUTRIENT_KEYS) {
    const raw = n[k];
    const v = typeof raw === 'string' ? parseFloat(raw.replace(',', '.')) : raw;
    out[k] = typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
  }
  const known = (['kcal', 'sugars', 'fat', 'satFat', 'salt', 'protein'] as const).filter((k) => out[k] != null).length;
  return known >= 2 ? out : null;
}

const fmt = (v: number) => (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10);

export function nutritionFlags(n: Nutrition, isBeverage: boolean, p: Profile): Flag[] {
  const flags: Flag[] = [];
  const add = (f: FlagInput) => flags.push(makeFlag(f));
  const unit = isBeverage ? '100 ml' : '100 g';

  // Calories
  if (n.kcal != null) {
    const k = n.kcal;
    const steps: [number, number][] = isBeverage
      ? [
          [45, 20],
          [25, 14],
          [10, 6],
        ]
      : [
          [500, 38],
          [450, 32],
          [350, 16],
          [250, 10],
          [150, 5],
        ];
    const hit = steps.find(([t]) => k > t);
    if (hit) {
      const [very, high] = isBeverage ? [45, 25] : [450, 350];
      add({
        id: 'kcal',
        title: k > very ? 'Very high in calories' : k > high ? 'High in calories' : 'Moderate calories',
        detail: `${Math.round(k)} kcal per ${unit}. ${isBeverage ? "Liquid calories don't fill you up." : 'Watch the portion size.'}`,
        impact: { weight: hit[1] },
      });
    } else if ((isBeverage && k <= 5) || (!isBeverage && k < 80)) {
      add({
        id: 'kcal-low',
        title: 'Low in calories',
        detail: `Only ${Math.round(k)} kcal per ${unit}.`,
        impact: { weight: -4 },
      });
    }
  }

  // Sugar: [threshold, weight, health, gut] penalties
  if (n.sugars != null) {
    const s = n.sugars;
    const steps: [number, number, number, number][] = isBeverage
      ? [
          [11.25, 50, 15, 10],
          [8, 45, 12, 8],
          [5, 30, 8, 4],
          [2.5, 14, 3, 0],
        ]
      : [
          [22.5, 28, 10, 8],
          [12, 16, 4, 3],
          [5, 6, 0, 0],
        ];
    const hit = steps.find(([t]) => s > t);
    if (hit) {
      const tsp = Math.round(s / 4);
      add({
        id: 'sugar',
        title: hit === steps[0] ? 'Very high in sugar' : hit === steps[1] ? 'High in sugar' : 'Some sugar',
        detail: `${fmt(s)} g sugar per ${unit}${s >= 4 ? ` (about ${tsp} teaspoon${tsp === 1 ? '' : 's'})` : ''}.${
          isBeverage && s > 5 ? ' Sugary drinks are one of the biggest blockers to weight loss.' : ''
        }`,
        tip: isBeverage && s > 5 ? 'Try still water with lemon, or an unsweetened iced tea.' : undefined,
        impact: { weight: hit[1], health: hit[2], gut: hit[3] },
        cap: isBeverage && s > 8 ? 39 : undefined,
      });
    }
  }

  // Fat
  if (n.fat != null && n.fat > (isBeverage ? 8.75 : 17.5)) {
    const very = !isBeverage && n.fat > 25;
    add({
      id: 'fat',
      title: very ? 'Very high in fat' : 'High in fat',
      detail: `${fmt(n.fat)} g fat per ${unit}. Rich, fatty food can trigger cramps and loose stools, and it is calorie-dense.`,
      impact: very ? { gut: 16, weight: 10 } : { gut: 10, weight: 8 },
    });
  } else if (n.fat != null && !isBeverage && n.fat > 10) {
    add({
      id: 'fat',
      title: 'Fairly high in fat',
      detail: `${fmt(n.fat)} g fat per ${unit}.`,
      impact: { weight: 4, gut: 3 },
    });
  }
  if (n.satFat != null) {
    const high = isBeverage ? 2.5 : 5;
    if (n.satFat > high) {
      add({
        id: 'sat-fat',
        title: 'High in saturated fat',
        detail: `${fmt(n.satFat)} g per ${unit}. Too much is hard on the heart.`,
        impact: { health: 12 },
      });
    } else if (n.satFat > high / 2) {
      add({
        id: 'sat-fat',
        title: 'Some saturated fat',
        detail: `${fmt(n.satFat)} g per ${unit}.`,
        impact: { health: 5 },
      });
    }
  }

  // Salt
  if (n.salt != null) {
    const [mid, high] = isBeverage ? [0.4, 0.75] : [0.9, 1.5];
    if (n.salt > high) {
      add({
        id: 'salt',
        title: 'High in salt',
        detail: `${fmt(n.salt)} g salt per ${unit}. Salt leads to water retention and raises blood pressure.`,
        impact: { health: 12, weight: 2 },
      });
    } else if (n.salt > mid) {
      add({ id: 'salt', title: 'Quite salty', detail: `${fmt(n.salt)} g salt per ${unit}.`, impact: { health: 5 } });
    }
  }

  // Lots of calories with nothing to fill you up
  if (!isBeverage && (n.kcal ?? 0) > 300 && (n.protein ?? 0) < 8 && (n.fiber ?? 0) < 3) {
    add({
      id: 'not-filling',
      title: 'Easy to overeat',
      detail: 'Lots of calories but little protein or fibre to keep you full, so one serving easily turns into three.',
      tip: 'Portion it into a small bowl instead of eating from the pack.',
      impact: { weight: 8 },
    });
  }

  // Protein keeps you full
  if (n.protein != null && !isBeverage) {
    if (n.protein >= 15) {
      add({
        id: 'protein',
        title: 'High in protein',
        detail: `${fmt(n.protein)} g per ${unit}. Protein keeps you fuller for longer.`,
        impact: { weight: -10, health: -2 },
      });
    } else if (n.protein >= 8) {
      add({
        id: 'protein',
        title: 'Good source of protein',
        detail: `${fmt(n.protein)} g per ${unit}. It helps you stay full.`,
        impact: { weight: -5 },
      });
    }
  }

  // Fibre: good normally, rough on the gut during a flare
  if (n.fiber != null) {
    if (p.flare && n.fiber > 6) {
      add({
        id: 'fibre-flare',
        title: 'High in fibre',
        detail: `${fmt(n.fiber)} g per ${unit}. Lots of fibre can be hard going during a flare.`,
        tip: 'Save high-fibre foods for when symptoms have settled.',
        impact: { gut: 15 },
      });
    } else if (!p.flare && n.fiber >= 6) {
      add({
        id: 'fibre',
        title: 'High in fibre',
        detail: `${fmt(n.fiber)} g per ${unit}. Fibre feeds good gut bacteria and keeps you full.`,
        impact: { health: -6, weight: -6, gut: -4 },
      });
    } else if (!p.flare && n.fiber >= 3) {
      add({
        id: 'fibre',
        title: 'Source of fibre',
        detail: `${fmt(n.fiber)} g per ${unit}.`,
        impact: { health: -3, weight: -3 },
      });
    }
  }
  return flags;
}
