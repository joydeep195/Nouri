import { z } from 'zod';
import type { StoreSpec } from '@/shared/lib/storage';
import { DEFAULT_PROFILE, type Profile } from './profile';
import { checkTrigger } from './triggers';

const flag = (fallback: boolean) => z.boolean().catch(fallback);

const ProfileSchema = z.object({
  name: z
    .string()
    .transform((s) => s.slice(0, 40))
    .catch(''),
  onboarded: flag(false),
  weightLoss: flag(true),
  flare: flag(false),
  lowFodmap: flag(false),
  lactose: flag(false),
  gluten: flag(false),
  spicy: flag(false),
  caffeine: flag(false),
  triggers: z
    .array(z.unknown())
    .catch([])
    .transform((items) => {
      const out: string[] = [];
      for (const t of items) {
        if (typeof t !== 'string') continue;
        const check = checkTrigger(t, out);
        if (check.ok) out.push(check.value);
      }
      return out;
    }),
}) satisfies z.ZodType<Profile>;

/** Validates a stored profile; bad fields fall back to their defaults. */
export function parseProfile(raw: unknown): Profile | null {
  const result = ProfileSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export const PROFILE_STORE: StoreSpec<Profile> = {
  key: 'nouri.profile',
  version: 2,
  parse: parseProfile,
  fallback: () => ({ ...DEFAULT_PROFILE, triggers: [] }),
  // v1 (Nouri 1.0) stored the bare profile object under this key.
  legacyKeys: ['nouri.profile.v1'],
};
