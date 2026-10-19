// Cleans up text read from a photo of a food label: pulls out the ingredient list and,
// when the nutrition table is in the same photo, the per-100 g values.

import type { NutrientKey } from '@/features/product/model/types';

const START_RE = /\bingred[il1|]ents?\b\s*[:;.-]?\s*/i;
const STOP_RE =
  /\b(nutrition(?:al)?|typical values|allergy advice|storage|store (?:in|at)|keep (?:in|refrigerated)|best before|use by|manufactured by|mfd\b|marketed by|packed by|net (?:wt|weight|quantity|content)|batch no|customer care|fssai|per 100\s?g)/i;

export function extractIngredients(raw: string | null | undefined): string {
  let t = (raw ?? '')
    .replace(/\r/g, '')
    .replace(/(\w)-[ \t]*\n[ \t]*(\w)/g, '$1$2')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/[ \t]{2,}/g, ' ');
  const start = START_RE.exec(t);
  if (start) t = t.slice(start.index + start[0].length);
  const stop = t.search(STOP_RE);
  if (stop > 10) t = t.slice(0, stop);
  return t.replace(/\s+([,.;:)])/g, '$1').trim();
}

const toNum = (s: string) => parseFloat(s.replace(',', '.'));

interface FoundValue {
  value: number;
  unit: string;
}

// Several values often share a line ("Fat 19.5 g of which saturates 9.8 g"), so look at each
// label occurrence and take the number right after it.
function valueAfter(lines: string[], label: RegExp, excludeBefore?: RegExp): FoundValue | null {
  const re = new RegExp(label.source, 'gi');
  for (const rawLine of lines) {
    const line = rawLine.replace(/\bO(?=[.,]\d)/g, '0');
    for (const m of line.matchAll(re)) {
      if (excludeBefore?.test(line.slice(Math.max(0, m.index - 14), m.index))) continue;
      const after = line.slice(m.index + m[0].length, m.index + m[0].length + 32);
      if (after.startsWith('-')) continue; // "fat-reduced cocoa"
      const n = /^[^\d\n]{0,18}?(\d{1,4}(?:[.,]\d{1,2})?)(?![\d.,])(?!\s*%)\s*(mg|g)?/i.exec(after);
      if (n?.[1]) return { value: toNum(n[1]), unit: (n[2] ?? '').toLowerCase() };
    }
  }
  return null;
}

export type ParsedNutrition = Partial<Record<NutrientKey, number>>;

const FIELDS: [NutrientKey, RegExp, RegExp?][] = [
  ['fat', /\bfat\b/, /(saturated|trans|sat\.?|mono\w*|poly\w*)\s*$/i],
  ['satFat', /saturated fat|saturates|saturated|sat\.?\s*fat/],
  ['sugars', /sugars?\b/, /(added|no|free)\s*$/i],
  ['fiber', /dietary fib(?:re|er)|fib(?:re|er)/],
  ['protein', /proteins?\b/],
  ['salt', /\bsalt\b/],
];

/** Best-effort read of a nutrition table. Returns only the values it found, or null. */
export function parseNutrition(raw: string | null | undefined): ParsedNutrition | null {
  const text = (raw ?? '').replace(/\r/g, '');
  const lines = text.split('\n');
  const out: ParsedNutrition = {};

  const kcal = /(\d{1,4}(?:[.,]\d)?)\s*k\s?cal/i.exec(text);
  if (kcal?.[1]) out.kcal = toNum(kcal[1]);
  else {
    const kj = /(\d{2,4}(?:[.,]\d)?)\s*kj/i.exec(text);
    if (kj?.[1]) out.kcal = Math.round(toNum(kj[1]) / 4.184);
  }

  for (const [key, label, exclude] of FIELDS) {
    const hit = valueAfter(lines, label, exclude);
    if (hit) out[key] = hit.value;
  }
  if (out.salt == null) {
    const sodium = valueAfter(lines, /sodium/);
    if (sodium) out.salt = Math.round((sodium.unit === 'mg' ? sodium.value / 1000 : sodium.value) * 2.5 * 100) / 100;
  }
  return Object.keys(out).length ? out : null;
}
