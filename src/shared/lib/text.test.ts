import { describe, expect, it } from 'vitest';
import {
  additiveMatches,
  extractAdditiveCodes,
  findMatches,
  normalizeAdditive,
  splitIngredients,
  termRegex,
  unique,
} from './text';

describe('termRegex + findMatches', () => {
  it('matches whole words, plurals and hyphen/space variants', () => {
    const re = termRegex(['mono and diglycerides', 'onion']);
    const text = 'Mono- and diglycerides, Onions, onion powder, scallion';
    expect(findMatches(re, text).map((m) => m.term)).toEqual(['Mono- and diglycerides', 'Onions', 'onion']);
  });

  it('does not match inside other words', () => {
    expect(findMatches(termRegex(['malt']), 'maltodextrin, maltitol')).toEqual([]);
    expect(findMatches(termRegex(['gin']), 'ginger, origin')).toEqual([]);
  });

  it('skips "may contain" trace statements', () => {
    expect(findMatches(termRegex(['milk']), 'Sugar. May contain traces of nuts and milk.')).toEqual([]);
  });

  it('applies notBefore / notAfter context checks', () => {
    const re = termRegex(['milk']);
    const ctx = { notBefore: /(coconut|oat)[\s-]*$/i, notAfter: /^\s*free/i };
    const text = 'coconut milk, oat milk, milk free, skimmed milk';
    expect(findMatches(re, text, ctx).map((m) => m.start)).toEqual([text.lastIndexOf('milk')]);
  });
});

describe('splitIngredients', () => {
  it('splits at top-level commas only and drops the "Ingredients:" label', () => {
    const items = splitIngredients('Ingredients: Sugar, cocoa (cocoa mass, cocoa butter), milk; salt');
    expect(items.map((i) => i.text)).toEqual(['Sugar', 'cocoa (cocoa mass, cocoa butter)', 'milk', 'salt']);
  });
});

describe('additive codes', () => {
  it('reads E, INS and Indian bracket formats', () => {
    const codes = extractAdditiveCodes(
      'Emulsifiers (471, 472e), Colour (150d), Stabiliser INS 412, E407a, raising agent (500(ii)), Salt (2%)',
    );
    expect([...codes].sort()).toEqual(['e150d', 'e407a', 'e412', 'e471', 'e472e', 'e500']);
  });

  it('does not grab the first letter of the next word', () => {
    expect([...extractAdditiveCodes('E330 and E300')]).toEqual(['e330', 'e300']);
  });

  it('normalises Open Food Facts tags', () => {
    expect(normalizeAdditive('en:e322i')).toBe('e322');
    expect(normalizeAdditive('E150d')).toBe('e150d');
    expect(normalizeAdditive('en:lecithin')).toBeNull();
  });

  it('matches lettered variants to their family', () => {
    expect(additiveMatches('e472e', ['e472'])).toBe(true);
    expect(additiveMatches('e150a', ['e150d'])).toBe(false);
  });
});

describe('unique', () => {
  it('removes case-insensitive duplicates keeping the first spelling', () => {
    expect(unique(['Milk', 'milk', 'Sugar'])).toEqual(['Milk', 'Sugar']);
  });
});
