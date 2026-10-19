import { describe, expect, it } from 'vitest';
import { analyze } from '@/features/analysis/model/score';
import sample from './fixtures/off-ingredient-sample.json';
import { profile } from './fixtures';
import { isForeignLabel, isHoldout, measureCoverage, type SampleProduct } from './ingredientCoverage';

// Real labels from Open Food Facts (see docs/INGREDIENT-COVERAGE.md). If a change makes these
// fail, run `npm run audit:ingredients` to see which ingredients stopped being recognised.
const products = (sample.products as SampleProduct[]).filter((p) => !isForeignLabel(p.ingredients));

describe('ingredient coverage on real labels', () => {
  it('uses a meaningful sample', () => {
    expect(products.length).toBeGreaterThan(400);
  });

  it('recognises at least 95% of ingredients overall and on the check set', () => {
    expect(measureCoverage(products).rate).toBeGreaterThanOrEqual(0.95);
    expect(measureCoverage(products.filter((p) => isHoldout(p.code))).rate).toBeGreaterThanOrEqual(0.94);
  });

  it('never gives the simple-list bonus to a product with an unrecognised ingredient', () => {
    for (const p of products) {
      const r = analyze({ ingredientsText: p.ingredients }, profile());
      if (r.insufficient || !r.unrecognised.length) continue;
      expect(
        r.good.map((f) => f.id),
        p.name,
      ).not.toContain('simple');
    }
  });
});
