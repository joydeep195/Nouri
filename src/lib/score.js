// Turns a product (from a barcode lookup, a label photo or typed ingredients) into a score.
//
// Three pillars, each 0-100:
//   health - processing level, additives, salt, saturated & trans fat
//   gut    - IBD / Crohn's triggers (emulsifiers, FODMAPs, sugar alcohols, personal sensitivities)
//   weight - calories, sugar, fat, and what keeps you full (protein, fibre)
// The overall score is a weighted mix that leans towards the weakest pillar, so a food can't
// hide a big problem behind one good number.

import { RULES } from './rules.js';
import {
  termRegex,
  findMatches,
  splitIngredients,
  extractAdditiveCodes,
  normalizeAdditive,
  additiveMatches,
  unique,
} from './text.js';

export const PILLARS = {
  health: { key: 'health', label: 'Overall health', short: 'Health' },
  gut: { key: 'gut', label: 'Gut comfort', short: 'Gut' },
  weight: { key: 'weight', label: 'Weight goals', short: 'Weight' },
};

export const VERDICTS = {
  great: { key: 'great', min: 80, label: 'Great choice', line: 'Gentle on your gut and good for your goals.' },
  good: { key: 'good', min: 65, label: 'Good in moderation', line: 'A decent pick. Just keep an eye on the points below.' },
  caution: { key: 'caution', min: 40, label: 'Not ideal', line: 'A few things here may not suit you. Have it rarely, or look for a swap.' },
  avoid: { key: 'avoid', min: 0, label: 'Best avoided', line: 'Likely to upset your gut or work against your goals.' },
};

export function verdictFor(score) {
  if (score >= 80) return VERDICTS.great;
  if (score >= 65) return VERDICTS.good;
  if (score >= 40) return VERDICTS.caution;
  return VERDICTS.avoid;
}

export function pillarWord(score) {
  if (score >= 80) return 'Great';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
}

export const DEFAULT_PROFILE = {
  name: '',
  onboarded: false,
  weightLoss: true,
  flare: false,
  lowFodmap: false,
  lactose: false,
  gluten: false,
  spicy: false,
  caffeine: false,
  triggers: [],
};

export function normalizeProfile(profile) {
  return { ...DEFAULT_PROFILE, ...(profile || {}), triggers: (profile?.triggers || []).filter(Boolean) };
}

// UK FSA "traffic light" thresholds, per 100 g (food) or 100 ml (drinks).
const LEVELS = {
  food: { fat: [3, 17.5], satFat: [1.5, 5], sugars: [5, 22.5], salt: [0.3, 1.5] },
  drink: { fat: [1.5, 8.75], satFat: [0.75, 2.5], sugars: [2.5, 11.25], salt: [0.3, 0.75] },
};

export function nutrientLevel(key, value, isBeverage) {
  const t = (isBeverage ? LEVELS.drink : LEVELS.food)[key];
  if (!t || value == null) return null;
  if (value <= t[0]) return 'low';
  if (value > t[1]) return 'high';
  return 'medium';
}

function cleanNutrition(n) {
  if (!n) return null;
  const out = {};
  for (const k of ['kcal', 'sugars', 'fat', 'satFat', 'salt', 'fiber', 'protein', 'carbs', 'alcohol']) {
    const v = typeof n[k] === 'string' ? parseFloat(n[k].replace(',', '.')) : n[k];
    out[k] = Number.isFinite(v) && v >= 0 ? v : null;
  }
  const known = ['kcal', 'sugars', 'fat', 'satFat', 'salt', 'protein'].filter((k) => out[k] != null).length;
  return known >= 2 ? out : null;
}

const resolve = (v, ctx) => (typeof v === 'function' ? v(ctx) : v);

function makeFlag({ id, title, detail, tip, impact, found = [], dealbreaker = false, estimated = false, cap }) {
  const imp = { health: impact.health || 0, gut: impact.gut || 0, weight: impact.weight || 0 };
  const total = imp.health + imp.gut + imp.weight;
  const worst = Math.max(imp.health, imp.gut, imp.weight);
  return {
    id,
    title,
    detail,
    tip,
    found,
    impact: imp,
    pillars: Object.keys(imp).filter((k) => imp[k] !== 0),
    kind: total > 0 ? 'bad' : 'good',
    severity: dealbreaker || worst >= 18 ? 'high' : worst >= 9 ? 'medium' : 'low',
    dealbreaker,
    estimated,
    cap,
  };
}

// Ingredients that mark a food as ultra-processed (NOVA 4) when we have to guess.
const UPF_TERMS = termRegex([
  'maltodextrin',
  'modified starch',
  'modified maize starch',
  'modified corn starch',
  'glucose syrup',
  'liquid glucose',
  'corn syrup',
  'high fructose corn syrup',
  'invert sugar',
  'dextrose',
  'hydrolysed protein',
  'hydrolyzed protein',
  'protein isolate',
  'soy protein isolate',
  'whey protein concentrate',
  'flavouring',
  'flavoring',
  'flavour',
  'flavor',
  'artificial sweetener',
  'hydrogenated',
  'interesterified',
  'emulsifier',
  'stabiliser',
  'stabilizer',
  'thickener',
  'colour',
  'color',
  'flavour enhancer',
  'monosodium glutamate',
  'carrageenan',
]);
const UPF_CODE = /^e(1\d\d|4\d\d|6[2-3]\d|9[5-6]\d)/; // colours, emulsifiers/thickeners, enhancers, sweeteners
const CULINARY = termRegex(['salt', 'sugar', 'oil', 'vinegar', 'butter', 'ghee', 'syrup']);

function estimateNova(text, additives, itemCount) {
  const markers = new Set([...text.matchAll(UPF_TERMS)].map((m) => m[0].toLowerCase()));
  for (const a of additives) if (UPF_CODE.test(a)) markers.add(a);
  if (markers.size >= 2) return 4;
  if (markers.size === 1 || additives.size > 0) return 3;
  if (itemCount <= 1) return 1;
  return CULINARY.test(text) ? 3 : 2;
}

/**
 * @param product { name, brand, ingredientsText, ingredientTags?, additives?, allergens?, labels?,
 *                  categories?, isBeverage?, nova?, nutriscore?, nutrition? }
 * @param profile the user's sensitivities and goals
 */
export function analyze(product, profile) {
  const p = normalizeProfile(profile);
  const ingredientsText = (product.ingredientsText || '').trim();
  const nutrition = cleanNutrition(product.nutrition);
  const hasNutrition = !!nutrition;
  const hasIngredients = ingredientsText.replace(/[^a-z]/gi, '').length >= 3;
  if (!hasIngredients && !hasNutrition) return { insufficient: true };

  const isBeverage = !!product.isBeverage;
  const items = hasIngredients ? splitIngredients(ingredientsText) : [];
  const extra = [product.name, ...(product.labels || []), ...(product.ingredientTags || [])].filter(Boolean).join(' ; ');
  const matchText = `${ingredientsText}\n${extra}`;
  const additives = new Set([
    ...(product.additives || []).map(normalizeAdditive).filter(Boolean),
    ...extractAdditiveCodes(ingredientsText),
  ]);
  const allergens = new Set((product.allergens || []).map((a) => String(a).replace(/^[a-z]{2}:/, '')));
  const indexOf = (pos) => {
    const i = items.findIndex((it) => pos >= it.start && pos < it.end);
    return i === -1 ? Infinity : i;
  };

  const flags = [];
  const highlights = [];
  const baseCtx = { profile: p, hasNutrition, nutrition, isBeverage };

  // 1. Ingredient rules
  for (const rule of RULES) {
    if (rule.when && !rule.when(p)) continue;
    if (rule.skipIf && rule.skipIf.test(matchText)) continue;
    rule.regex ??= rule.terms ? termRegex(rule.terms) : null;
    const matches = rule.regex ? findMatches(rule.regex, matchText, rule) : [];
    const codes = rule.e ? [...additives].filter((a) => additiveMatches(a, rule.e)) : [];
    const allergenHit = rule.allergens?.some((a) => allergens.has(a));
    const testHit = rule.test?.({ product, nutrition, isBeverage });
    if (!matches.length && !codes.length && !allergenHit && !testHit) continue;

    const inList = matches.filter((m) => m.end <= ingredientsText.length);
    const ctx = {
      ...baseCtx,
      firstIndex: Math.min(Infinity, ...inList.map((m) => indexOf(m.start))),
      distinct: new Set(matches.map((m) => m.term.toLowerCase())).size + codes.length,
    };
    const impact = {};
    for (const [k, v] of Object.entries(rule.impact)) impact[k] = resolve(v, ctx) || 0;
    if (!Object.values(impact).some(Boolean)) continue;

    const flag = makeFlag({
      id: rule.id,
      title: resolve(rule.title, ctx),
      detail: resolve(rule.detail, ctx),
      tip: resolve(rule.tip, ctx),
      impact,
      found: unique([...inList.map((m) => m.term), ...codes.map((c) => c.toUpperCase())]).slice(0, 4),
      dealbreaker: !!rule.dealbreaker?.(p),
      cap: resolve(rule.cap, ctx),
    });
    flags.push(flag);
    for (const m of inList) highlights.push({ start: m.start, end: m.end, kind: flag.kind });
  }

  // 2. Personal triggers
  for (const trigger of p.triggers) {
    const matches = findMatches(termRegex([trigger]), matchText);
    if (!matches.length) continue;
    flags.push(
      makeFlag({
        id: `trigger:${trigger.toLowerCase()}`,
        title: `Contains ${trigger}`,
        detail: "You've marked this as one of your personal triggers.",
        impact: { gut: 30 },
        found: unique(matches.filter((m) => m.end <= ingredientsText.length).map((m) => m.term)),
        dealbreaker: true,
      }),
    );
    for (const m of matches) if (m.end <= ingredientsText.length) highlights.push({ start: m.start, end: m.end, kind: 'bad' });
  }

  // 3. Nutrition per 100 g / 100 ml
  if (nutrition) flags.push(...nutritionFlags(nutrition, isBeverage, p));

  // 4. Processing level
  let nova = [1, 2, 3, 4].includes(Number(product.nova)) ? Number(product.nova) : null;
  let novaEstimated = false;
  if (!nova && hasIngredients) {
    nova = estimateNova(ingredientsText, additives, items.length);
    novaEstimated = true;
  }
  if (nova === 4) {
    flags.push(
      makeFlag({
        id: 'nova-4',
        title: novaEstimated ? 'Likely ultra-processed' : 'Ultra-processed',
        detail: 'Made with industrial ingredients and additives. Diets high in ultra-processed food are linked to IBD flares and weight gain.',
        tip: 'Simpler foods with a short, recognisable ingredient list are a better bet.',
        impact: { health: 30, gut: 12, weight: 4 },
        estimated: novaEstimated,
      }),
    );
  } else if (nova === 3) {
    flags.push(
      makeFlag({
        id: 'nova-3',
        title: 'Processed',
        detail: 'Made from whole foods with added salt, sugar or oil, or a few additives.',
        impact: { health: 8 },
        estimated: novaEstimated,
      }),
    );
  } else if (nova === 1) {
    flags.push(
      makeFlag({
        id: 'nova-1',
        title: 'Whole or minimally processed',
        detail: 'Close to how nature made it, which is the best kind of food.',
        impact: { health: -8, gut: -4 },
        estimated: novaEstimated,
      }),
    );
  }

  // 5. Simple ingredient list vs. a long additive list
  const badIngredientFlags = flags.filter((f) => f.kind === 'bad' && !f.id.startsWith('nova') && f.found.length);
  if (hasIngredients && items.length <= 5 && additives.size === 0 && nova !== 4 && badIngredientFlags.length <= 1) {
    flags.push(
      makeFlag({
        id: 'simple',
        title: 'Short, simple ingredient list',
        detail: `Just ${items.length} ingredient${items.length === 1 ? '' : 's'} and no additives.`,
        impact: { health: -6, gut: -4 },
      }),
    );
  } else if (additives.size > 5) {
    flags.push(
      makeFlag({
        id: 'many-additives',
        title: `Lots of additives (${additives.size})`,
        detail: 'A long additive list is a sign of a heavily processed food.',
        impact: { health: 6, gut: 3 },
        found: [...additives].slice(0, 6).map((a) => a.toUpperCase()),
      }),
    );
  }

  // Pillar scores
  const start = { health: 100, gut: 100, weight: hasNutrition ? 100 : 80 };
  const pillars = {};
  for (const key of Object.keys(PILLARS)) {
    const sum = flags.reduce((s, f) => s + f.impact[key], 0);
    pillars[key] = { ...PILLARS[key], score: clamp(Math.round(start[key] - sum)) };
    pillars[key].word = pillarWord(pillars[key].score);
  }
  pillars.weight.estimated = !hasNutrition;

  // Weighted power mean (p = -2): like an average, but a weak pillar pulls the result down
  // much harder than a strong one lifts it, so a sugary drink can't hide behind "low fat".
  const w = p.weightLoss ? { health: 0.35, gut: 0.35, weight: 0.3 } : { health: 0.45, gut: 0.45, weight: 0.1 };
  const inv = Object.keys(w).reduce((s, k) => s + w[k] / Math.max(15, pillars[k].score) ** 2, 0);
  let overall = clamp(Math.round(inv ** -0.5));
  overall = Math.min(overall, pillars.gut.score + 15); // her gut is the priority

  const dealbreakers = flags.filter((f) => f.dealbreaker);
  if (dealbreakers.length) overall = Math.min(overall, 30);
  for (const f of flags) if (f.cap != null) overall = Math.min(overall, f.cap);
  const verdict = { ...verdictFor(overall) };
  if (dealbreakers.length) {
    verdict.line = `Contains ${listNames(dealbreakers.map((f) => f.title.replace(/^Contains /, '').replace(/ \(.*\)$/, '').toLowerCase()))}, which you've said bothers you.`;
  }

  const order = { high: 0, medium: 1, low: 2 };
  const total = (f) => f.impact.health + f.impact.gut + f.impact.weight;
  // Most serious first; within a level, named ingredients before general notes like "ultra-processed".
  const bad = flags
    .filter((f) => f.kind === 'bad')
    .sort(
      (a, b) =>
        Number(b.dealbreaker) - Number(a.dealbreaker) ||
        order[a.severity] - order[b.severity] ||
        Number(!a.found.length) - Number(!b.found.length) ||
        total(b) - total(a),
    );
  const good = flags.filter((f) => f.kind === 'good').sort((a, b) => total(a) - total(b));

  let confidence = 'high';
  if (!hasNutrition || !hasIngredients) confidence = 'medium';
  if (!hasNutrition && items.length < 2) confidence = 'low';

  return {
    overall,
    verdict,
    pillars,
    bad,
    good,
    dealbreakers,
    highlights: mergeHighlights(highlights),
    nova,
    novaEstimated,
    additives: [...additives],
    nutrition,
    isBeverage,
    hasIngredients,
    hasNutrition,
    confidence,
  };
}

function nutritionFlags(n, isBeverage, p) {
  const flags = [];
  const add = (f) => flags.push(makeFlag(f));
  const unit = isBeverage ? '100 ml' : '100 g';
  const fmt = (v) => (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10);

  // Calories
  if (n.kcal != null) {
    const k = n.kcal;
    const steps = isBeverage ? [[45, 20], [25, 14], [10, 6]] : [[500, 38], [450, 32], [350, 16], [250, 10], [150, 5]];
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
      add({ id: 'kcal-low', title: 'Low in calories', detail: `Only ${Math.round(k)} kcal per ${unit}.`, impact: { weight: -4 } });
    }
  }

  // Sugar
  if (n.sugars != null) {
    const s = n.sugars;
    // [threshold, weight, health, gut] penalties
    const steps = isBeverage
      ? [[11.25, 50, 15, 10], [8, 45, 12, 8], [5, 30, 8, 4], [2.5, 14, 3, 0]]
      : [[22.5, 28, 10, 8], [12, 16, 4, 3], [5, 6, 0, 0]];
    const hit = steps.find(([t]) => s > t);
    if (hit) {
      add({
        id: 'sugar',
        title: hit === steps[0] ? 'Very high in sugar' : hit === steps[1] ? 'High in sugar' : 'Some sugar',
        detail: `${fmt(s)} g sugar per ${unit}${s >= 4 ? ` (about ${Math.round(s / 4)} teaspoon${Math.round(s / 4) === 1 ? '' : 's'})` : ''}.${isBeverage && s > 5 ? ' Sugary drinks are one of the biggest blockers to weight loss.' : ''}`,
        tip: isBeverage && s > 5 ? 'Try still water with lemon, or an unsweetened iced tea.' : undefined,
        impact: { weight: hit[1], health: hit[2], gut: hit[3] },
        cap: isBeverage && s > 8 ? 39 : undefined,
      });
    }
  }

  // Fat
  const fatHigh = n.fat != null && n.fat > (isBeverage ? 8.75 : 17.5);
  if (fatHigh) {
    const very = !isBeverage && n.fat > 25;
    add({
      id: 'fat',
      title: very ? 'Very high in fat' : 'High in fat',
      detail: `${fmt(n.fat)} g fat per ${unit}. Rich, fatty food can trigger cramps and loose stools, and it is calorie-dense.`,
      impact: very ? { gut: 16, weight: 10 } : { gut: 10, weight: 8 },
    });
  } else if (n.fat != null && !isBeverage && n.fat > 10) {
    add({ id: 'fat', title: 'Fairly high in fat', detail: `${fmt(n.fat)} g fat per ${unit}.`, impact: { weight: 4, gut: 3 } });
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
      add({ id: 'sat-fat', title: 'Some saturated fat', detail: `${fmt(n.satFat)} g per ${unit}.`, impact: { health: 5 } });
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
  if (!isBeverage && n.kcal > 300 && (n.protein ?? 0) < 8 && (n.fiber ?? 0) < 3) {
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
      add({ id: 'protein', title: 'High in protein', detail: `${fmt(n.protein)} g per ${unit}. Protein keeps you fuller for longer.`, impact: { weight: -10, health: -2 } });
    } else if (n.protein >= 8) {
      add({ id: 'protein', title: 'Good source of protein', detail: `${fmt(n.protein)} g per ${unit}. It helps you stay full.`, impact: { weight: -5 } });
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
      add({ id: 'fibre', title: 'High in fibre', detail: `${fmt(n.fiber)} g per ${unit}. Fibre feeds good gut bacteria and keeps you full.`, impact: { health: -6, weight: -6, gut: -4 } });
    } else if (!p.flare && n.fiber >= 3) {
      add({ id: 'fibre', title: 'Source of fibre', detail: `${fmt(n.fiber)} g per ${unit}.`, impact: { health: -3, weight: -3 } });
    }
  }
  return flags;
}

function mergeHighlights(list) {
  const sorted = [...list].sort((a, b) => a.start - b.start || b.end - a.end);
  const out = [];
  for (const h of sorted) {
    const last = out[out.length - 1];
    if (last && h.start < last.end) {
      if (h.end > last.end) last.end = h.end;
      if (h.kind === 'bad') last.kind = 'bad';
    } else out.push({ ...h });
  }
  return out;
}

const clamp = (n) => Math.max(0, Math.min(100, n));

function listNames(names) {
  const u = unique(names);
  if (u.length <= 1) return u[0] || '';
  return `${u.slice(0, -1).join(', ')} and ${u[u.length - 1]}`;
}
