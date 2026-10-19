// Text helpers for reading ingredient lists: term matching, splitting and additive codes.

export interface TextMatch {
  start: number;
  end: number;
  /** The matched text exactly as written on the label. */
  term: string;
}

export interface MatchContext {
  /** Ignore a match when the text just before it matches. Must not use the `g` flag. */
  notBefore?: RegExp | undefined;
  /** Ignore a match when the text just after it matches. Must not use the `g` flag. */
  notAfter?: RegExp | undefined;
}

export interface IngredientItem {
  start: number;
  end: number;
  text: string;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Builds one case-insensitive, whole-word regex for a list of terms (plurals and hyphens allowed). */
export function termRegex(terms: readonly string[]): RegExp {
  const parts = [...new Set(terms.map((t) => t.trim().toLowerCase()))]
    .sort((a, b) => b.length - a.length)
    .map((t) => escapeRe(t).replace(/\s+/g, '[\\s\\-]+'));
  return new RegExp(`\\b(?:${parts.join('|')})(?:e?s)?\\b`, 'gi');
}

// "May contain traces of milk" is about cross-contamination, not a real ingredient.
const TRACE_RE =
  /(may contain|traces? of|trace amounts|made in a|produced in a|manufactured in a|same (?:line|facility)|factory (?:that|which))[^.;:]*$/i;

/** All matches of `regex` (which must have the `g` flag) in `text`, minus ones excluded by context checks. */
export function findMatches(regex: RegExp, text: string, ctx: MatchContext = {}): TextMatch[] {
  const out: TextMatch[] = [];
  for (const m of text.matchAll(regex)) {
    const start = m.index;
    const end = start + m[0].length;
    const before = text.slice(Math.max(0, start - 60), start);
    if (TRACE_RE.test(before)) continue;
    if (ctx.notBefore?.test(before.slice(-24))) continue;
    if (ctx.notAfter?.test(text.slice(end, end + 24))) continue;
    out.push({ start, end, term: m[0] });
  }
  return out;
}

/** Splits an ingredient list at top-level commas/semicolons (ignores ones inside brackets). */
export function splitIngredients(text: string): IngredientItem[] {
  const items: IngredientItem[] = [];
  let depth = 0;
  let start = 0;
  const label = /^\s*ingredients?\s*[:-]?\s*/i.exec(text);
  if (label) start = label[0].length;
  const push = (end: number) => {
    const raw = text.slice(start, end);
    if (raw.trim()) items.push({ start, end, text: raw.trim() });
  };
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (c === '(' || c === '[' || c === '{') depth++;
    else if ((c === ')' || c === ']' || c === '}') && depth > 0) depth--;
    else if ((c === ',' || c === ';') && depth === 0) {
      push(i);
      start = i + 1;
    }
  }
  push(text.length);
  return items;
}

/** Normalises additive tags like "en:e322i" or "E150d" to "e322" / "e150d". */
export function normalizeAdditive(tag: unknown): string | null {
  const m = /^(?:[a-z]{2}:)?(e\d{3,4}[a-h]?)(?:[ivx]+)?$/i.exec(String(tag).trim());
  return m?.[1] ? m[1].toLowerCase() : null;
}

/** True when an additive code (e.g. "e472e") belongs to one of the listed codes (e.g. "e472"). */
export function additiveMatches(code: string, list: readonly string[]): boolean {
  return list.some((x) => code === x || code.replace(/[a-h]$/, '') === x);
}

const CODE = String.raw`(?:(?:ins|e)\s?)?\d{3,4}[a-h]?`;
const CODE_LIST_RE = new RegExp(String.raw`^\s*${CODE}(?:\s*[,&/]\s*${CODE})*\s*$`, 'i');
const CLASS_RE = new RegExp(
  String.raw`\b(?:emulsifiers?|stabili[sz]ers?|thickeners?|thickening agents?|gelling agents?|colou?rs?|preservatives?|antioxidants?|acidity regulators?|acidulants?|raising agents?|leavening agents?|sweeteners?|flavou?r enhancers?|humectants?|firming agents?|glazing agents?|anti[\s-]?caking agents?|bulking agents?|improvers?|sequestrants?)\s*[:\-]?\s*(${CODE}(?:\s*[,&/]\s*${CODE})*)`,
  'gi',
);

/** Finds additive codes written as "E407", "INS 471" or "Emulsifier (471, 472e)" (common on Indian labels). */
export function extractAdditiveCodes(text: string): Set<string> {
  const out = new Set<string>();
  const clean = text.replace(/\(\s*[ivx]+\s*\)/gi, ''); // 500(ii) -> 500
  const add = (s: string) => {
    for (const m of s.matchAll(/(\d{3,4})([a-h](?![a-z]))?/gi)) out.add(`e${m[1] ?? ''}${(m[2] ?? '').toLowerCase()}`);
  };
  for (const m of clean.matchAll(/\b(?:e|ins)[\s\-.]?(\d{3,4})([a-h](?![a-z]))?(?!\d)/gi)) {
    out.add(`e${m[1] ?? ''}${(m[2] ?? '').toLowerCase()}`);
  }
  for (const m of clean.matchAll(/\(([^()]*)\)/g)) if (m[1] && CODE_LIST_RE.test(m[1])) add(m[1]);
  for (const m of clean.matchAll(CLASS_RE)) if (m[1]) add(m[1]);
  return out;
}

/** Removes case-insensitive duplicates, keeping the first spelling. */
export function unique<T>(arr: readonly T[]): T[] {
  const seen = new Set<string>();
  return arr.filter((x) => {
    const k = String(x).toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
