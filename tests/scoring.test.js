import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, DEFAULT_PROFILE } from '../src/lib/score.js';
import { extractAdditiveCodes } from '../src/lib/text.js';
import { parseScan } from '../src/lib/scan.js';
import { extractIngredients, parseNutrition } from '../src/lib/labelText.js';

const me = (over = {}) => ({ ...DEFAULT_PROFILE, onboarded: true, ...over });
const ids = (r) => [...r.bad, ...r.good].map((f) => f.id);
const show = (name, r) =>
  console.log(
    `${name.padEnd(26)} ${String(r.overall).padStart(3)}  ${r.verdict.label.padEnd(18)} H${r.pillars.health.score} G${r.pillars.gut.score} W${r.pillars.weight.score}`,
  );

const products = {
  coke: {
    name: 'Coca-Cola',
    ingredientsText: 'Carbonated water, sugar, colour (caramel E150d), phosphoric acid, natural flavourings including caffeine.',
    nutrition: { kcal: 42, sugars: 10.6, fat: 0, satFat: 0, salt: 0, protein: 0 },
    isBeverage: true,
    nova: 4,
  },
  dietCoke: {
    name: 'Diet Coke',
    ingredientsText:
      'Carbonated water, colour (caramel E150d), sweeteners (aspartame, acesulfame K), natural flavourings including caffeine, phosphoric acid, citric acid.',
    nutrition: { kcal: 0.4, sugars: 0, fat: 0, satFat: 0, salt: 0.02, protein: 0 },
    isBeverage: true,
    nova: 4,
  },
  nutella: {
    name: 'Nutella',
    ingredientsText:
      'Sugar, palm oil, hazelnuts (13%), skimmed milk powder (8.7%), fat-reduced cocoa (7.4%), emulsifier: lecithins (soya), vanillin.',
    nutrition: { kcal: 539, sugars: 56.3, fat: 30.9, satFat: 10.6, salt: 0.107, protein: 6.3, fiber: 0 },
    allergens: ['en:milk', 'en:nuts', 'en:soybeans'],
    nova: 4,
  },
  oats: {
    name: 'Rolled oats',
    ingredientsText: 'Rolled oats',
    nutrition: { kcal: 375, sugars: 1, fat: 8, satFat: 1.5, salt: 0.01, protein: 13, fiber: 10 },
    nova: 1,
  },
  water: {
    name: 'Natural mineral water',
    ingredientsText: 'Natural mineral water',
    nutrition: { kcal: 0, sugars: 0, fat: 0, satFat: 0, salt: 0.01, protein: 0 },
    isBeverage: true,
    nova: 1,
  },
  gum: {
    name: 'Sugar-free chewing gum',
    ingredientsText:
      'Sweeteners (sorbitol, mannitol, maltitol syrup, aspartame, acesulfame K), gum base, flavourings, thickener (gum arabic), humectant (glycerol), emulsifier (soy lecithin), colour (E171), antioxidant (BHA).',
    nutrition: { kcal: 155, sugars: 0, fat: 0.5, satFat: 0.4, salt: 0, protein: 0 },
  },
  yogurt: {
    name: 'Plain Greek yogurt',
    ingredientsText: 'Pasteurised milk, live cultures',
    nutrition: { kcal: 97, sugars: 3.6, fat: 5, satFat: 3.4, salt: 0.1, protein: 9 },
    allergens: ['en:milk'],
    nova: 1,
  },
  chips: {
    name: 'Magic Masala potato chips',
    ingredientsText:
      'Potato, edible vegetable oil (palmolein, rice bran oil), seasoning (spices & condiments (onion powder, chilli powder, garlic powder, coriander, ginger), sugar, salt, black salt, tomato powder), flavour enhancers (627, 631), anticaking agent (551).',
    nutrition: { kcal: 544, sugars: 2.4, fat: 34, satFat: 15, salt: 1.8, protein: 6.5 },
    nova: 4,
  },
  bread: {
    name: 'Whole wheat bread',
    ingredientsText: 'Whole wheat flour (atta), water, yeast, sugar, salt, wheat gluten, vegetable oil.',
    nutrition: { kcal: 250, sugars: 4, fat: 3, satFat: 0.6, salt: 1, protein: 10, fiber: 6 },
    nova: 3,
  },
  biscuitTyped: {
    name: 'Cream biscuits',
    ingredientsText:
      'Sugar, refined wheat flour (maida), palm oil, cocoa solids, glucose syrup, emulsifier (471), raising agent (500(ii)), salt, artificial flavour.',
  },
  riceTyped: { name: 'Rice cakes', ingredientsText: 'Brown rice, salt' },
};

test('scores look sensible for common products', () => {
  const r = Object.fromEntries(Object.entries(products).map(([k, prod]) => [k, analyze(prod, me())]));
  for (const [k, res] of Object.entries(r)) show(k, res);

  assert.ok(r.coke.overall < 40, 'Coke should be best avoided');
  assert.ok(r.nutella.overall < 40, 'Nutella should be best avoided');
  assert.ok(r.gum.overall < 40, 'sugar-free gum should be best avoided');
  assert.ok(r.chips.overall < 40, 'masala chips should be best avoided');
  assert.ok(r.dietCoke.overall < 60, 'Diet Coke should not be a good choice');
  assert.ok(r.biscuitTyped.overall < 45, 'typed biscuit ingredients should score poorly');
  assert.ok(r.oats.overall >= 80, 'oats should be a great choice');
  assert.ok(r.water.overall >= 80, 'water should be a great choice');
  assert.ok(r.yogurt.overall >= 60, 'plain yogurt should be fine without a lactose sensitivity');
  assert.ok(r.riceTyped.overall >= 60, 'plain rice cakes should be fine');
  assert.ok(r.bread.overall >= 60, 'whole wheat bread should be fine without gluten sensitivity');
});

test('sensitivities turn foods into dealbreakers', () => {
  const yogurt = analyze(products.yogurt, me({ lactose: true }));
  assert.ok(yogurt.overall <= 30);
  assert.equal(yogurt.dealbreakers[0].id, 'dairy');

  const bread = analyze(products.bread, me({ gluten: true }));
  assert.ok(bread.overall <= 30);
  assert.match(bread.verdict.line, /gluten/);

  const corn = analyze({ ingredientsText: 'Water, corn starch, salt' }, me({ triggers: ['corn'] }));
  assert.ok(corn.overall <= 30);
});

test('flare mode is stricter on fibre and spice', () => {
  const calm = analyze(products.oats, me());
  const flare = analyze(products.oats, me({ flare: true }));
  assert.ok(flare.pillars.gut.score < calm.pillars.gut.score);
  assert.ok(ids(flare).includes('fibre-flare'));
});

test('plant milks and trace warnings are not counted as dairy', () => {
  const r = analyze(
    { ingredientsText: 'Water, coconut milk (20%), almond milk, sugar. May contain traces of milk and nuts.' },
    me({ lactose: true }),
  );
  assert.ok(!ids(r).includes('dairy'));
});

test('sugar-free and alcohol-free wording is respected', () => {
  const r = analyze({ ingredientsText: 'Water, lemon juice, sugar-free sweetener (stevia), alcohol-free malt extract' }, me());
  assert.ok(!ids(r).includes('added-sugar'));
  assert.ok(!ids(r).includes('alcohol'));
});

test('additive codes are read in E, INS and Indian bracket formats', () => {
  const codes = extractAdditiveCodes('Emulsifiers (471, 472e), Colour (150d), Stabiliser INS 412, E407a, raising agent (500(ii)), Salt (2%)');
  for (const c of ['e471', 'e472e', 'e150d', 'e412', 'e407a', 'e500']) assert.ok(codes.has(c), c);
  assert.equal(codes.size, 6);
});

test('carrageenan found by code alone', () => {
  const r = analyze({ ingredientsText: 'Water, almonds (2%), calcium phosphate, stabiliser (407), salt' }, me());
  assert.equal(r.bad[0].id, 'carrageenan');
  assert.ok(r.pillars.gut.score <= 75);
});

test('QR codes and barcodes are understood', () => {
  assert.deepEqual(parseScan('5449000000996'), { type: 'barcode', code: '5449000000996' });
  assert.deepEqual(parseScan('https://id.gs1.org/01/09506000134352/10/ABC'), { type: 'barcode', code: '9506000134352' });
  assert.deepEqual(parseScan('(01)05449000000996(17)250101'), { type: 'barcode', code: '5449000000996' });
  assert.equal(parseScan('https://example.com/promo').type, 'url');
  assert.equal(parseScan('hello').type, 'text');
});

test('label text is cleaned up', () => {
  const raw = `NUTRI CRUNCH\nINGREDIENTS: Rolled oats (60%), sugar, sun-\nflower oil, honey.\nNUTRITION INFORMATION per 100g\nEnergy 1850kJ / 442 kcal\nFat 15.2 g\nof which saturates 2.1g\nCarbohydrate 64 g\nof which sugars 18.5 g\nFibre 7.1g\nProtein 9.4 g\nSalt 0.35 g`;
  assert.equal(extractIngredients(raw), 'Rolled oats (60%), sugar, sunflower oil, honey.');
  const n = parseNutrition(raw);
  assert.equal(n.kcal, 442);
  assert.equal(n.fat, 15.2);
  assert.equal(n.satFat, 2.1);
  assert.equal(n.sugars, 18.5);
  assert.equal(n.fiber, 7.1);
  assert.equal(n.protein, 9.4);
  assert.equal(n.salt, 0.35);
});

test('nutrition values sharing a line are read separately', () => {
  const raw = `INGREDIENTS: Sugar, fat-reduced cocoa (7.4%), salt.\nNUTRITION INFORMATION per 100g\nEnergy 2010kJ / 480 kcal\nFat 19.5 g   of which saturates 9.8 g\nSugars 31 g    Protein 6.1 g    Salt 0.6 g\nSodium 240 mg`;
  assert.deepEqual(parseNutrition(raw), { kcal: 480, fat: 19.5, satFat: 9.8, sugars: 31, protein: 6.1, salt: 0.6 });
  assert.equal(parseNutrition('Sodium 400mg').salt, 1);
});
