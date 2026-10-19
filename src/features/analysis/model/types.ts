import type { Profile } from '@/features/profile/model/profile';
import type { Nutrition, Product } from '@/features/product/model/types';

export const PILLAR_KEYS = ['health', 'gut', 'weight'] as const;
export type Pillar = (typeof PILLAR_KEYS)[number];
export type Impact = Record<Pillar, number>;
export type Severity = 'high' | 'medium' | 'low';
export type FlagKind = 'bad' | 'good';

export interface Flag {
  id: string;
  title: string;
  detail: string;
  tip: string | undefined;
  /** Words or additive codes that triggered this flag, as they appear on the label. */
  found: string[];
  /** Positive = penalty, negative = bonus, per pillar. */
  impact: Impact;
  pillars: Pillar[];
  kind: FlagKind;
  severity: Severity;
  dealbreaker: boolean;
  estimated: boolean;
  /** Highest overall score a food with this flag can get. */
  cap: number | undefined;
}

export interface RuleContext {
  profile: Profile;
  /** Index (0-based) of the first ingredient that matched, or Infinity. */
  firstIndex: number;
  hasNutrition: boolean;
  nutrition: Nutrition | null;
  isBeverage: boolean;
  /** Number of distinct matched terms + additive codes. */
  distinct: number;
}

export type Resolvable<T> = T | ((ctx: RuleContext) => T);

export interface Rule {
  id: string;
  title: Resolvable<string>;
  detail: Resolvable<string>;
  tip?: Resolvable<string | undefined>;
  /** Whole-word terms (plurals and hyphen/space variants allowed). */
  terms?: string[];
  /** Additive codes, e.g. "e407". A code without a letter also matches its lettered variants. */
  e?: string[];
  /** Open Food Facts allergen tags without the language prefix, e.g. "milk". */
  allergens?: string[];
  /** Only apply the rule for profiles where this returns true. */
  when?: (profile: Profile) => boolean;
  /** Skip the rule entirely when the label text matches (e.g. "gluten-free"). */
  skipIf?: RegExp;
  /** Ignore a match when the text just before it matches (no `g` flag). */
  notBefore?: RegExp;
  /** Ignore a match when the text just after it matches (no `g` flag). */
  notAfter?: RegExp;
  /** Extra non-text trigger, e.g. alcohol content in the nutrition data. */
  test?: (input: { product: Partial<Product>; nutrition: Nutrition | null; isBeverage: boolean }) => boolean;
  impact: Partial<Record<Pillar, Resolvable<number>>>;
  cap?: Resolvable<number | undefined>;
  dealbreaker?: (profile: Profile) => boolean;
}

export type VerdictKey = 'great' | 'good' | 'caution' | 'avoid';
export interface Verdict {
  key: VerdictKey;
  min: number;
  label: string;
  line: string;
}

export interface PillarScore {
  key: Pillar;
  label: string;
  short: string;
  score: number;
  word: string;
  /** True when the score is a guess (e.g. weight without nutrition facts). */
  estimated: boolean;
}

export interface Highlight {
  start: number;
  end: number;
  kind: FlagKind;
}

export type Confidence = 'high' | 'medium' | 'low';

export interface ScoredAnalysis {
  insufficient: false;
  overall: number;
  verdict: Verdict;
  pillars: Record<Pillar, PillarScore>;
  bad: Flag[];
  good: Flag[];
  dealbreakers: Flag[];
  highlights: Highlight[];
  nova: number | null;
  novaEstimated: boolean;
  additives: string[];
  nutrition: Nutrition | null;
  isBeverage: boolean;
  hasIngredients: boolean;
  hasNutrition: boolean;
  confidence: Confidence;
  /** Ingredients we couldn't identify, as written on the label. They are not scored. */
  unrecognised: { text: string; start: number; end: number }[];
  /** Label abbreviations we expanded, e.g. PGPR → Polyglycerol polyricinoleate. */
  abbreviations: { abbr: string; meaning: string; code?: string | undefined }[];
}

export interface InsufficientAnalysis {
  insufficient: true;
}

export type Analysis = ScoredAnalysis | InsufficientAnalysis;
