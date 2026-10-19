import type { Product } from '@/features/product/model/types';
import type { Profile } from '@/features/profile/model/profile';
import { DEFAULT_PROFILE } from '@/features/profile/model/profile';
import productsJson from './products.json';
import baselineJson from './score-baseline.json';

/** Real-world sample products used across the scoring tests. */
export const PRODUCTS = productsJson as Record<string, Partial<Product>>;

/** Profiles the baseline was recorded with. Keep in sync with score-baseline.json. */
export const BASELINE_PROFILES: Record<string, Partial<Profile>> = {
  default: {},
  lactose: { lactose: true },
  gluten: { gluten: true },
  flare: { flare: true },
  lowFodmap: { lowFodmap: true },
  spicyCaffeine: { spicy: true, caffeine: true },
  triggers: { triggers: ['corn', 'hazelnuts', 'salt'] },
  noWeightGoal: { weightLoss: false },
};

export interface BaselineCase {
  insufficient?: true;
  overall?: number;
  verdict?: string;
  health?: number;
  gut?: number;
  weight?: number;
  bad?: string[];
  good?: string[];
  dealbreakers?: string[];
  highlights?: number;
  nova?: number | null;
  novaEstimated?: boolean;
  confidence?: string;
  additives?: string[];
}

/** Scores recorded from the engine before the TypeScript port (v1.0.0). */
export const SCORE_BASELINE = baselineJson as Record<string, Record<string, BaselineCase>>;

export const profile = (over: Partial<Profile> = {}): Profile => ({ ...DEFAULT_PROFILE, onboarded: true, ...over });
