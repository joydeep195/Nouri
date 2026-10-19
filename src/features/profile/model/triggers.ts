export const MAX_TRIGGERS = 30;
export const MAX_TRIGGER_LENGTH = 40;
const TRIGGER_RE = /^[\p{L}\p{N}][\p{L}\p{N} '\-&]*$/u;

export type TriggerCheck = { ok: true; value: string } | { ok: false; reason: string };

/** Cleans and validates a personal trigger the user typed. */
export function checkTrigger(raw: string, existing: readonly string[]): TriggerCheck {
  const value = raw.trim().replace(/\s+/g, ' ').toLowerCase();
  if (value.length < 2) return { ok: false, reason: 'Type at least 2 letters.' };
  if (value.length > MAX_TRIGGER_LENGTH)
    return { ok: false, reason: `Keep it under ${MAX_TRIGGER_LENGTH} characters.` };
  if (!TRIGGER_RE.test(value)) return { ok: false, reason: 'Use letters and numbers only.' };
  if (existing.includes(value)) return { ok: false, reason: 'Already on your list.' };
  if (existing.length >= MAX_TRIGGERS) return { ok: false, reason: `You can add up to ${MAX_TRIGGERS} triggers.` };
  return { ok: true, value };
}
