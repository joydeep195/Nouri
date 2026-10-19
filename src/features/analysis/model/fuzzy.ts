// Typo-tolerant matching for misspellings and OCR slips ("carageenan" → "carrageenan").

/** Edits allowed for a word of this length: none under 7 letters, 1 up to 10, 2 from 11. */
export function maxEdits(length: number): number {
  if (length >= 11) return 2;
  if (length >= 7) return 1;
  return 0;
}

/**
 * Optimal-string-alignment distance (Levenshtein + adjacent swaps), giving up early once the
 * distance must exceed `limit`. Returns limit + 1 in that case.
 */
export function editDistance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let prevPrev: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min((prev[j] ?? 0) + 1, (cur[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, (prevPrev[j - 2] ?? 0) + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > limit) return limit + 1;
    prevPrev = prev;
    prev = cur;
  }
  return prev[b.length] ?? limit + 1;
}

/** Index of words by first letter, so a lookup only compares plausible candidates. */
export class FuzzyIndex<T> {
  private readonly byFirst = new Map<string, { word: string; value: T }[]>();

  add(word: string, value: T): void {
    if (maxEdits(word.length) === 0) return;
    const key = word.charAt(0);
    const list = this.byFirst.get(key) ?? [];
    list.push({ word, value });
    this.byFirst.set(key, list);
  }

  /**
   * Closest entry within the allowed edits for `word`, or null. Exact matches are not reported.
   * Also tries the usual OCR confusions ("lodised"/"1odised" for "iodised", "0" for "o").
   */
  find(word: string): { word: string; value: T } | null {
    const limit = maxEdits(word.length);
    if (limit === 0) return null;
    let best: { word: string; value: T; d: number } | null = null;
    for (const variant of ocrVariants(word)) {
      const extra = variant === word ? 0 : 1; // an OCR fix counts as one edit
      for (const e of this.byFirst.get(variant.charAt(0)) ?? []) {
        if (Math.abs(e.word.length - variant.length) > limit || e.word === word) continue;
        const allowed = Math.min(limit, maxEdits(e.word.length)) - extra;
        if (allowed < 0) continue;
        const d = editDistance(variant, e.word, allowed) + extra;
        if (d <= Math.min(limit, maxEdits(e.word.length)) && (!best || d < best.d)) best = { ...e, d };
      }
    }
    return best ? { word: best.word, value: best.value } : null;
  }
}

const OCR_FIRST: Readonly<Record<string, string>> = { l: 'i', i: 'l', '1': 'i', '0': 'o' };

/** The word itself, then the word with OCR look-alikes fixed (first letter; digits inside words). */
function ocrVariants(word: string): string[] {
  const out = [word];
  const first = OCR_FIRST[word.charAt(0)];
  if (first) out.push(first + word.slice(1));
  const digits = word.replace(/0/g, 'o').replace(/1/g, 'i').replace(/5/g, 's');
  if (digits !== word && /[a-z]/.test(digits)) out.push(digits);
  return out;
}
