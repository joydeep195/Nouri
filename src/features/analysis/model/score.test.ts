import { describe, expect, it } from 'vitest';
import { BASELINE_PROFILES, PRODUCTS, SCORE_BASELINE, profile, type BaselineCase } from '../../../../tests/fixtures';
import { analyze } from './score';
import type { Analysis, ScoredAnalysis } from './types';

const scored = (a: Analysis): ScoredAnalysis => {
  if (a.insufficient) throw new Error('expected a scored analysis');
  return a;
};
const ids = (r: ScoredAnalysis) => [...r.bad, ...r.good].map((f) => f.id);

function summarize(a: Analysis): BaselineCase {
  if (a.insufficient) return { insufficient: true };
  return {
    overall: a.overall,
    verdict: a.verdict.key,
    health: a.pillars.health.score,
    gut: a.pillars.gut.score,
    weight: a.pillars.weight.score,
    bad: a.bad.map((f) => f.id),
    good: a.good.map((f) => f.id),
    dealbreakers: a.dealbreakers.map((f) => f.id),
    highlights: a.highlights.length,
    nova: a.nova,
    novaEstimated: a.novaEstimated,
    confidence: a.confidence,
    additives: [...a.additives].sort(),
  };
}

describe('score regression against the v1 engine', () => {
  for (const [profileKey, over] of Object.entries(BASELINE_PROFILES)) {
    describe(`profile: ${profileKey}`, () => {
      for (const [productKey, product] of Object.entries(PRODUCTS)) {
        it(productKey, () => {
          expect(summarize(analyze(product, profile(over)))).toEqual(SCORE_BASELINE[profileKey]?.[productKey]);
        });
      }
    });
  }

  it('is deterministic regardless of what was scored before', () => {
    const first = Object.values(PRODUCTS).map((p) => summarize(analyze(p, profile())));
    const reversed = Object.values(PRODUCTS)
      .reverse()
      .map((p) => summarize(analyze(p, profile())))
      .reverse();
    expect(reversed).toEqual(first);
  });
});

describe('verdicts for common products', () => {
  const r = (key: string, over = {}) => scored(analyze(PRODUCTS[key] ?? {}, profile(over)));

  it('marks junk food and sugary drinks as best avoided', () => {
    for (const key of ['coke', 'nutella', 'gum', 'chips', 'biscuitTyped', 'masalaNoodles', 'beer']) {
      expect(r(key).overall, key).toBeLessThan(40);
    }
    expect(r('dietCoke').overall).toBeLessThan(60);
  });

  it('marks simple whole foods as good choices', () => {
    for (const key of ['oats', 'water', 'riceTyped', 'bread', 'yogurt'])
      expect(r(key).overall, key).toBeGreaterThanOrEqual(60);
  });

  it('turns personal sensitivities into dealbreakers', () => {
    const yogurt = r('yogurt', { lactose: true });
    expect(yogurt.overall).toBeLessThanOrEqual(30);
    expect(yogurt.dealbreakers[0]?.id).toBe('dairy');
    expect(r('bread', { gluten: true }).verdict.line).toMatch(/gluten/);
    const corn = scored(analyze({ ingredientsText: 'Water, corn starch, salt' }, profile({ triggers: ['corn'] })));
    expect(corn.overall).toBeLessThanOrEqual(30);
  });

  it('is stricter on fibre during a flare', () => {
    expect(r('oats', { flare: true }).pillars.gut.score).toBeLessThan(r('oats').pillars.gut.score);
    expect(ids(r('oats', { flare: true }))).toContain('fibre-flare');
  });

  it('does not count plant milks or trace warnings as dairy', () => {
    const a = scored(
      analyze(
        { ingredientsText: 'Water, coconut milk (20%), almond milk, sugar. May contain traces of milk and nuts.' },
        profile({ lactose: true }),
      ),
    );
    expect(ids(a)).not.toContain('dairy');
  });

  it('respects "sugar-free" and "alcohol-free" wording', () => {
    const a = scored(
      analyze(
        { ingredientsText: 'Water, lemon juice, sugar-free sweetener (stevia), alcohol-free malt extract' },
        profile(),
      ),
    );
    expect(ids(a)).not.toContain('added-sugar');
    expect(ids(a)).not.toContain('alcohol');
  });

  it('finds carrageenan from its additive code alone', () => {
    const a = r('almondMilk');
    expect(a.bad[0]?.id).toBe('carrageenan');
    expect(a.pillars.gut.score).toBeLessThanOrEqual(75);
  });

  it('reports insufficient data when there is nothing to score', () => {
    expect(analyze({ name: 'Mystery' }, profile())).toEqual({ insufficient: true });
  });
});
