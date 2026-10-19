// Turns a product (from a barcode lookup, a label photo or typed ingredients) into a score.
//
// Three pillars, each 0-100:
//   health - processing level, additives, salt, saturated & trans fat
//   gut    - IBD / Crohn's triggers (emulsifiers, FODMAPs, sugar alcohols, personal sensitivities)
//   weight - calories, sugar, fat, and what keeps you full (protein, fibre)
// The overall score is a weighted mix that leans towards the weakest pillar, so a food can't
// hide a big problem behind one good number. This module is pure: no I/O, no React.

import { normalizeProfile, type Profile } from '@/features/profile/model/profile';
import type { Product } from '@/features/product/model/types';
import {
  additiveMatches,
  extractAdditiveCodes,
  findMatches,
  normalizeAdditive,
  splitIngredients,
  termRegex,
  unique,
  type TextMatch,
} from '@/shared/lib/text';
import { flagTotal, makeFlag } from './flags';
import { FuzzyIndex } from './fuzzy';
import { coreName, fuzzyAdditive, fuzzyKnown, normName, readIngredients, type Candidate } from './ingredients';
import { cleanNutrition, nutritionFlags } from './nutrition';
import { RULES } from './rules';
import {
  PILLAR_KEYS,
  type Analysis,
  type Confidence,
  type Flag,
  type Highlight,
  type Pillar,
  type PillarScore,
  type Resolvable,
  type RuleContext,
  type Severity,
  type Verdict,
  type VerdictKey,
} from './types';

export const PILLARS: Record<Pillar, { key: Pillar; label: string; short: string }> = {
  health: { key: 'health', label: 'Overall health', short: 'Health' },
  gut: { key: 'gut', label: 'Gut comfort', short: 'Gut' },
  weight: { key: 'weight', label: 'Weight goals', short: 'Weight' },
};

export const VERDICTS: Record<VerdictKey, Readonly<Verdict>> = {
  great: { key: 'great', min: 80, label: 'Great choice', line: 'Gentle on your gut and good for your goals.' },
  good: {
    key: 'good',
    min: 65,
    label: 'Good in moderation',
    line: 'A decent pick. Just keep an eye on the points below.',
  },
  caution: {
    key: 'caution',
    min: 40,
    label: 'Not ideal',
    line: 'A few things here may not suit you. Have it rarely, or look for a swap.',
  },
  avoid: { key: 'avoid', min: 0, label: 'Best avoided', line: 'Likely to upset your gut or work against your goals.' },
};

export function verdictFor(score: number): Readonly<Verdict> {
  if (score >= VERDICTS.great.min) return VERDICTS.great;
  if (score >= VERDICTS.good.min) return VERDICTS.good;
  if (score >= VERDICTS.caution.min) return VERDICTS.caution;
  return VERDICTS.avoid;
}

export function pillarWord(score: number): string {
  if (score >= 80) return 'Great';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
}

const resolve = <T>(v: Resolvable<T>, ctx: RuleContext): T =>
  typeof v === 'function' ? (v as (c: RuleContext) => T)(ctx) : v;

// Compile each rule's term list once.
const COMPILED = RULES.map((rule) => ({ rule, regex: rule.terms ? termRegex(rule.terms) : null }));

// Rule terms by spelling, for catching misspellings and OCR slips ("carageenan").
const FUZZY_RULE_TERMS = new FuzzyIndex<number>();
for (const [i, { rule }] of COMPILED.entries()) for (const t of rule.terms ?? []) FUZZY_RULE_TERMS.add(normName(t), i);

// Ingredients that mark a food as ultra-processed (NOVA 4) when we have to guess.
const UPF_TERMS = termRegex([
  'maltodextrin',
  'modified starch',
  'hydrolysed vegetable protein',
  'hydrolyzed vegetable protein',
  'hvp',
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

function estimateNova(text: string, additives: Set<string>, itemCount: number): number {
  const markers = new Set([...text.matchAll(UPF_TERMS)].map((m) => m[0].toLowerCase()));
  for (const a of additives) if (UPF_CODE.test(a)) markers.add(a);
  if (markers.size >= 2) return 4;
  if (markers.size === 1 || additives.size > 0) return 3;
  if (itemCount <= 1) return 1;
  CULINARY.lastIndex = 0;
  return CULINARY.test(text) ? 3 : 2;
}

const hasEnoughText = (ingredientsText: string) => ingredientsText.replace(/[^a-z]/gi, '').length >= 3;

/** True when a product has enough ingredient or nutrition data to be scored. */
export function canScore(product: Partial<Product>): boolean {
  return hasEnoughText((product.ingredientsText ?? '').trim()) || cleanNutrition(product.nutrition) != null;
}

/** Scores a product for a profile. Returns `{ insufficient: true }` when there is nothing to score. */
export function analyze(product: Partial<Product>, profile?: Partial<Profile> | null): Analysis {
  const p = normalizeProfile(profile);
  const ingredientsText = (product.ingredientsText ?? '').trim();
  const nutrition = cleanNutrition(product.nutrition);
  const hasNutrition = !!nutrition;
  const hasIngredients = hasEnoughText(ingredientsText);
  if (!hasIngredients && !hasNutrition) return { insufficient: true };

  const isBeverage = !!product.isBeverage;
  const items = hasIngredients ? splitIngredients(ingredientsText) : [];
  const extra = [product.name, ...(product.labels ?? []), ...(product.ingredientTags ?? [])]
    .filter(Boolean)
    .join(' ; ');
  const matchText = `${ingredientsText}\n${extra}`;
  const inIngredients = (m: TextMatch) => m.end <= ingredientsText.length;

  // Exact rule and trigger matches, which also tell us which ingredients we understood.
  const exact = COMPILED.map(({ rule, regex }) => (regex ? findMatches(regex, matchText, rule) : []));
  const triggerMatches = p.triggers.map((t) => findMatches(termRegex([t]), matchText));
  const covered = [...exact.flat(), ...triggerMatches.flat()].filter(inIngredients);

  // Ingredients we don't recognise get a second look for typos before being reported.
  const reading = hasIngredients ? readIngredients(ingredientsText, covered) : null;
  const fuzzyMatches = new Map<number, TextMatch[]>();
  const unrecognised: Candidate[] = [];
  for (const c of reading?.unknown ?? []) {
    const hit = FUZZY_RULE_TERMS.find(c.name) ?? FUZZY_RULE_TERMS.find(coreName(c.name));
    if (hit) {
      const list = fuzzyMatches.get(hit.value) ?? [];
      list.push({ start: c.start, end: c.end, term: `${c.text} (${hit.word}?)` });
      fuzzyMatches.set(hit.value, list);
      continue;
    }
    const code = fuzzyAdditive(c.name);
    if (code) reading?.additiveCodes.add(code);
    else if (!fuzzyKnown(c.name)) unrecognised.push(c);
  }

  const additives = new Set<string>([
    ...(product.additives ?? []).map(normalizeAdditive).filter((a): a is string => a != null),
    ...extractAdditiveCodes(ingredientsText),
    ...(reading?.additiveCodes ?? []),
  ]);
  const allergens = new Set((product.allergens ?? []).map((a) => a.replace(/^[a-z]{2}:/, '')));
  const indexOf = (pos: number) => {
    const i = items.findIndex((it) => pos >= it.start && pos < it.end);
    return i === -1 ? Infinity : i;
  };

  const flags: Flag[] = [];
  const highlights: Highlight[] = [];

  // 1. Ingredient rules
  for (const [ruleIndex, { rule }] of COMPILED.entries()) {
    if (rule.when && !rule.when(p)) continue;
    if (rule.skipIf?.test(matchText)) continue;
    const matches = [...(exact[ruleIndex] ?? []), ...(fuzzyMatches.get(ruleIndex) ?? [])];
    const codes = rule.e ? [...additives].filter((a) => additiveMatches(a, rule.e ?? [])) : [];
    const allergenHit = rule.allergens?.some((a) => allergens.has(a)) ?? false;
    const testHit = rule.test?.({ product, nutrition, isBeverage }) ?? false;
    if (!matches.length && !codes.length && !allergenHit && !testHit) continue;

    const inList = matches.filter((m) => m.end <= ingredientsText.length);
    const ctx: RuleContext = {
      profile: p,
      hasNutrition,
      nutrition,
      isBeverage,
      firstIndex: Math.min(Infinity, ...inList.map((m) => indexOf(m.start))),
      distinct: new Set(matches.map((m) => m.term.toLowerCase())).size + codes.length,
    };
    const impact: Partial<Record<Pillar, number>> = {};
    for (const [k, v] of Object.entries(rule.impact) as [Pillar, Resolvable<number>][]) {
      impact[k] = resolve(v, ctx) || 0;
    }
    if (!Object.values(impact).some(Boolean)) continue;

    const flag = makeFlag({
      id: rule.id,
      title: resolve(rule.title, ctx),
      detail: resolve(rule.detail, ctx),
      tip: rule.tip === undefined ? undefined : resolve(rule.tip, ctx),
      impact,
      found: unique([...inList.map((m) => m.term), ...codes.map((c) => c.toUpperCase())]).slice(0, 4),
      dealbreaker: !!rule.dealbreaker?.(p),
      cap: rule.cap === undefined ? undefined : resolve(rule.cap, ctx),
    });
    flags.push(flag);
    for (const m of inList) highlights.push({ start: m.start, end: m.end, kind: flag.kind });
  }

  // 2. Personal triggers
  for (const [i, trigger] of p.triggers.entries()) {
    const matches = triggerMatches[i] ?? [];
    if (!matches.length) continue;
    const inList = matches.filter((m) => m.end <= ingredientsText.length);
    flags.push(
      makeFlag({
        id: `trigger:${trigger.toLowerCase()}`,
        title: `Contains ${trigger}`,
        detail: "You've marked this as one of your personal triggers.",
        impact: { gut: 30 },
        found: unique(inList.map((m) => m.term)),
        dealbreaker: true,
      }),
    );
    for (const m of inList) highlights.push({ start: m.start, end: m.end, kind: 'bad' });
  }

  // 3. Nutrition per 100 g / 100 ml
  if (nutrition) flags.push(...nutritionFlags(nutrition, isBeverage, p));

  // 4. Processing level
  const givenNova = Number(product.nova);
  let nova: number | null = [1, 2, 3, 4].includes(givenNova) ? givenNova : null;
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
        detail:
          'Made with industrial ingredients and additives. Diets high in ultra-processed food are linked to IBD flares and weight gain.',
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

  // 5. Simple ingredient list vs. a long additive list. An ingredient we don't recognise could
  // be anything, so a list with one never earns the "simple" bonus.
  const badIngredientFlags = flags.filter((f) => f.kind === 'bad' && !f.id.startsWith('nova') && f.found.length);
  if (
    hasIngredients &&
    items.length <= 5 &&
    additives.size === 0 &&
    nova !== 4 &&
    badIngredientFlags.length <= 1 &&
    unrecognised.length === 0
  ) {
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
  const start: Record<Pillar, number> = { health: 100, gut: 100, weight: hasNutrition ? 100 : 80 };
  const pillars = {} as Record<Pillar, PillarScore>;
  for (const key of PILLAR_KEYS) {
    const sum = flags.reduce((s, f) => s + f.impact[key], 0);
    const score = clamp(Math.round(start[key] - sum));
    pillars[key] = { ...PILLARS[key], score, word: pillarWord(score), estimated: key === 'weight' && !hasNutrition };
  }

  // Weighted power mean (p = -2): like an average, but a weak pillar pulls the result down
  // much harder than a strong one lifts it, so a sugary drink can't hide behind "low fat".
  const w: Record<Pillar, number> = p.weightLoss
    ? { health: 0.35, gut: 0.35, weight: 0.3 }
    : { health: 0.45, gut: 0.45, weight: 0.1 };
  const inv = PILLAR_KEYS.reduce((s, k) => s + w[k] / Math.max(15, pillars[k].score) ** 2, 0);
  let overall = clamp(Math.round(inv ** -0.5));
  overall = Math.min(overall, pillars.gut.score + 15); // her gut is the priority

  const dealbreakers = flags.filter((f) => f.dealbreaker);
  if (dealbreakers.length) overall = Math.min(overall, 30);
  for (const f of flags) if (f.cap != null) overall = Math.min(overall, f.cap);
  const verdict: Verdict = { ...verdictFor(overall) };
  if (dealbreakers.length) {
    const names = dealbreakers.map((f) =>
      f.title
        .replace(/^Contains /, '')
        .replace(/ \(.*\)$/, '')
        .toLowerCase(),
    );
    verdict.line = `Contains ${listNames(names)}, which you've said bothers you.`;
  }

  const order: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
  // Most serious first; within a level, named ingredients before general notes like "ultra-processed".
  const bad = flags
    .filter((f) => f.kind === 'bad')
    .sort(
      (a, b) =>
        Number(b.dealbreaker) - Number(a.dealbreaker) ||
        order[a.severity] - order[b.severity] ||
        Number(!a.found.length) - Number(!b.found.length) ||
        flagTotal(b) - flagTotal(a),
    );
  const good = flags.filter((f) => f.kind === 'good').sort((a, b) => flagTotal(a) - flagTotal(b));

  let confidence: Confidence = 'high';
  if (!hasNutrition || !hasIngredients) confidence = 'medium';
  if (!hasNutrition && items.length < 2) confidence = 'low';
  // Many unrecognised ingredients make the score a weaker guess.
  const candidateCount = reading?.candidates.length ?? 0;
  if (candidateCount && unrecognised.length / candidateCount >= 0.2) {
    confidence = confidence === 'high' ? 'medium' : 'low';
  }

  return {
    insufficient: false,
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
    unrecognised: uniqueBy(unrecognised, (c) => c.name).map(({ text, start, end }) => ({ text, start, end })),
    abbreviations: reading?.abbreviations ?? [],
  };
}

function uniqueBy<T>(list: T[], key: (x: T) => string): T[] {
  const seen = new Set<string>();
  return list.filter((x) => (seen.has(key(x)) ? false : (seen.add(key(x)), true)));
}

function mergeHighlights(list: Highlight[]): Highlight[] {
  const sorted = [...list].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Highlight[] = [];
  for (const h of sorted) {
    const last = out[out.length - 1];
    if (last && h.start < last.end) {
      if (h.end > last.end) last.end = h.end;
      if (h.kind === 'bad') last.kind = 'bad';
    } else out.push({ ...h });
  }
  return out;
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));

function listNames(names: string[]): string {
  const u = unique(names);
  if (u.length <= 1) return u[0] ?? '';
  return `${u.slice(0, -1).join(', ')} and ${u[u.length - 1] ?? ''}`;
}
