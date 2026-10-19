export const SENSITIVITY_KEYS = ['flare', 'lowFodmap', 'lactose', 'gluten', 'spicy', 'caffeine'] as const;
export type SensitivityKey = (typeof SENSITIVITY_KEYS)[number];

export interface Profile extends Record<SensitivityKey, boolean> {
  name: string;
  onboarded: boolean;
  weightLoss: boolean;
  /** Personal trigger foods, lower-case. Anything containing one is "Best avoided". */
  triggers: string[];
}

export const DEFAULT_PROFILE: Readonly<Profile> = Object.freeze({
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
});

export function normalizeProfile(profile?: Partial<Profile> | null): Profile {
  return { ...DEFAULT_PROFILE, ...(profile ?? {}), triggers: (profile?.triggers ?? []).filter(Boolean) };
}
