// Measures how much of a set of real ingredient lists the engine understands. Shared by the
// coverage test and `npm run audit:ingredients`.
import { splitCandidates } from '@/features/analysis/model/ingredients';
import { normName } from '@/features/analysis/model/ingredients';
import { analyze } from '@/features/analysis/model/score';
import { DEFAULT_PROFILE } from '@/features/profile/model/profile';

export interface SampleProduct {
  code: string;
  name: string;
  country: string;
  ingredients: string;
}

export interface CoverageStats {
  products: number;
  ingredients: number;
  unrecognised: number;
  /** Share of individual ingredients recognised (0-1). */
  rate: number;
  /** Share of products with no unrecognised ingredient (0-1). */
  fullyRecognised: number;
  /** Unrecognised names with how many products they appear in, most frequent first. */
  top: { name: string; count: number; example: string }[];
}

// Common words of French, German, Dutch, Scandinavian and Spanish ingredient lists. The rules are
// English, so labels in other languages are out of scope and reported separately.
const FOREIGN = new Set(
  (
    'de du des le la et sucre farine huile lait sel poudre und mit zucker mehl weizen salz kerne mandeln ' +
    'blanchierte sukker vann og med aceite harina leche azucar agua con almendras suiker zout melk'
  ).split(' '),
);

/** True for labels that are mostly in a language other than English. */
export function isForeignLabel(text: string): boolean {
  const words = text.toLowerCase().split(/[^a-zà-ÿ]+/);
  return words.filter((w) => FOREIGN.has(w)).length >= 2;
}

/** Deterministic split: about 30% of products are held out to check the vocabulary generalises. */
export const isHoldout = (code: string): boolean => {
  let h = 0;
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 10 < 3;
};

export function measureCoverage(products: readonly SampleProduct[]): CoverageStats {
  let ingredients = 0;
  let unrecognised = 0;
  let clean = 0;
  const counts = new Map<string, { count: number; example: string }>();
  for (const p of products) {
    const result = analyze({ ingredientsText: p.ingredients }, { ...DEFAULT_PROFILE, onboarded: true });
    ingredients += splitCandidates(p.ingredients).length;
    const unknown = result.insufficient ? [] : result.unrecognised;
    unrecognised += unknown.length;
    if (!unknown.length) clean++;
    for (const u of unknown) {
      const key = normName(u.text);
      const entry = counts.get(key) ?? { count: 0, example: p.name };
      entry.count++;
      counts.set(key, entry);
    }
  }
  return {
    products: products.length,
    ingredients,
    unrecognised,
    rate: ingredients ? 1 - unrecognised / ingredients : 1,
    fullyRecognised: products.length ? clean / products.length : 1,
    top: [...counts.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  };
}
