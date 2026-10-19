import type { Flag, Impact, Pillar } from './types';

export interface FlagInput {
  id: string;
  title: string;
  detail: string;
  tip?: string | undefined;
  impact: Partial<Record<Pillar, number>>;
  found?: string[];
  dealbreaker?: boolean;
  estimated?: boolean;
  cap?: number | undefined;
}

export function makeFlag({
  id,
  title,
  detail,
  tip,
  impact,
  found = [],
  dealbreaker = false,
  estimated = false,
  cap,
}: FlagInput): Flag {
  const imp: Impact = { health: impact.health ?? 0, gut: impact.gut ?? 0, weight: impact.weight ?? 0 };
  const total = imp.health + imp.gut + imp.weight;
  const worst = Math.max(imp.health, imp.gut, imp.weight);
  return {
    id,
    title,
    detail,
    tip,
    found,
    impact: imp,
    pillars: (Object.keys(imp) as Pillar[]).filter((k) => imp[k] !== 0),
    kind: total > 0 ? 'bad' : 'good',
    severity: dealbreaker || worst >= 18 ? 'high' : worst >= 9 ? 'medium' : 'low',
    dealbreaker,
    estimated,
    cap,
  };
}

export const flagTotal = (f: Flag): number => f.impact.health + f.impact.gut + f.impact.weight;
