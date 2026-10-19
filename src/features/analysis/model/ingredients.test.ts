import { describe, expect, it } from 'vitest';
import { profile } from '../../../../tests/fixtures';
import { editDistance, FuzzyIndex, maxEdits } from './fuzzy';
import { additiveCodesFor, additiveInfo, isKnownName, readIngredients, splitCandidates } from './ingredients';
import { analyze } from './score';
import type { ScoredAnalysis } from './types';

const scored = (text: string, over = {}): ScoredAnalysis => {
  const r = analyze({ ingredientsText: text }, profile(over));
  if (r.insufficient) throw new Error('insufficient');
  return r;
};
const ids = (r: ScoredAnalysis) => [...r.bad, ...r.good].map((f) => f.id);

describe('fuzzy matching', () => {
  it('allows edits only for longer words', () => {
    expect(maxEdits(6)).toBe(0);
    expect(maxEdits(8)).toBe(1);
    expect(maxEdits(12)).toBe(2);
  });

  it('measures edits, including swapped letters', () => {
    expect(editDistance('carageenan', 'carrageenan', 2)).toBe(1);
    expect(editDistance('sorbtiol', 'sorbitol', 2)).toBe(1);
    expect(editDistance('sorbitan', 'sorbitol', 1)).toBe(2);
  });

  it('finds the closest word with the same first letter', () => {
    const idx = new FuzzyIndex<string>();
    idx.add('maltodextrin', 'a');
    idx.add('maltitol', 'b');
    expect(idx.find('maltodextine')?.value).toBe('a');
    expect(idx.find('maltodextrin')).toBeNull();
    expect(idx.find('xaltitol')).toBeNull();
  });
});

describe('splitCandidates', () => {
  it('splits ingredients and their bracketed parts', () => {
    const c = splitCandidates('Ingredients: Seasoning (onion powder, chilli (2%)), Sugar, cocoa solids (4%)');
    expect(c.map((x) => x.name)).toEqual(['onion powder', 'chilli', 'seasoning', 'sugar', 'cocoa solids']);
    expect(new Set(c.slice(0, 3).map((x) => x.item))).toEqual(new Set([0]));
  });

  it('drops class prefixes, percentages and trace statements', () => {
    const c = splitCandidates('Emulsifier: soy lecithin, Salt 2%. May contain traces of nuts, milk');
    expect(c.map((x) => x.name)).toEqual(['soy lecithin', 'salt']);
  });
});

describe('recognition', () => {
  it('knows foods, forms and modifiers', () => {
    for (const n of ['wheat flour', 'roasted cumin powder', 'jeera', 'iodised salt', 'black salt', 'cocoa butter']) {
      expect(isKnownName(n), n).toBe(true);
    }
    expect(isKnownName('zxqv powder')).toBe(false);
  });

  it('is not fooled by built-in object property names', () => {
    expect(isKnownName('constructor')).toBe(false);
    expect(additiveCodesFor('tostring')).toEqual([]);
  });

  it('maps additive names, codes and abbreviations to codes', () => {
    expect(additiveCodesFor('glyceryl monostearate')).toEqual(['e471']);
    expect(additiveCodesFor('ins 412')).toEqual(['e412']);
    expect(additiveCodesFor('pgpr')).toEqual(['e476']);
    expect(additiveCodesFor('tomato')).toEqual([]);
    expect(additiveCodesFor('amaranth')).toEqual([]);
  });

  it('names additives and their jobs', () => {
    expect(additiveInfo('e471')).toEqual({
      code: 'e471',
      name: 'Mono- and diglycerides of fatty acids',
      functions: expect.arrayContaining(['Emulsifier']) as unknown,
    });
    expect(additiveInfo('e9999')).toBeNull();
  });

  it('reports what it does not know', () => {
    const r = readIngredients('Water, florbix, salt, E9999', []);
    expect(r.unknown.map((u) => u.text)).toEqual(['florbix', 'E9999']);
  });

  it('expands label abbreviations', () => {
    const r = readIngredients('Cocoa butter, emulsifier (PGPR), SMP', []);
    expect(r.abbreviations.map((a) => a.abbr)).toEqual(['PGPR', 'SMP']);
    expect([...r.additiveCodes]).toContain('e476');
    expect(r.unknown).toEqual([]);
  });
});

describe('analysis with recognition', () => {
  it('lists unrecognised ingredients and withholds the simple-list bonus', () => {
    const r = scored('Water, florbix, salt');
    expect(r.unrecognised.map((u) => u.text)).toEqual(['florbix']);
    expect(ids(r)).not.toContain('simple');
  });

  it('catches misspelt and OCR-garbled trigger ingredients', () => {
    const r = scored('Almond milk, carageenan, salt');
    expect(r.bad[0]?.id).toBe('carrageenan');
    expect(r.bad[0]?.found[0]).toMatch(/carageenan.*carrageenan/);
    expect(r.overall).toBeLessThanOrEqual(59);
    expect(scored('Water, sorbtiol, mint').bad.map((f) => f.id)).toContain('polyols');
  });

  it('treats typos of ordinary foods as recognised', () => {
    expect(scored('Rice, tumeric, salt').unrecognised).toEqual([]);
  });

  it('applies emulsifier rules to abbreviations and additive names', () => {
    expect(ids(scored('Sugar, cocoa butter, PGPR'))).toContain('emulsifiers');
    expect(ids(scored('Flour, glyceryl monostearate'))).toContain('emulsifiers');
  });

  it('knows hidden sugars, rare sugars and added fibres', () => {
    expect(ids(scored('Water, evaporated cane juice'))).toContain('added-sugar');
    expect(ids(scored('Cocoa, allulose'))).toContain('rare-sugars');
    expect(ids(scored('Cocoa butter, polydextrose'))).toContain('added-fibres');
  });

  it('understands Hindi names and Indian ingredients', () => {
    expect(ids(scored('Potato, pyaz, lahsun', { lowFodmap: true }))).toContain('onion-garlic');
    expect(ids(scored('Dal, salt, hing', { gluten: true }))).toContain('hing');
    expect(ids(scored('Dal, salt, hing'))).not.toContain('hing');
    expect(ids(scored('Dal, salt, gluten-free hing', { gluten: true }))).not.toContain('hing');
    expect(ids(scored('Rajgira (amaranth) flour, jaggery'))).not.toContain('colours');
  });

  it('flags milk proteins and abbreviations for dairy', () => {
    expect(scored('Water, sodium caseinate', { lactose: true }).dealbreakers[0]?.id).toBe('dairy');
    expect(scored('Sugar, SMP, cocoa', { lactose: true }).dealbreakers[0]?.id).toBe('dairy');
  });

  it('counts tea as caffeine but not herbal teas', () => {
    expect(ids(scored('Black tea, sugar'))).toContain('caffeine');
    expect(ids(scored('Chamomile tea, honey'))).not.toContain('caffeine');
  });

  it('stops reporting an ingredient once it is a personal trigger', () => {
    expect(scored('Water, florbix').unrecognised).toHaveLength(1);
    const r = scored('Water, florbix', { triggers: ['florbix'] });
    expect(r.unrecognised).toEqual([]);
    expect(r.dealbreakers[0]?.id).toBe('trigger:florbix');
  });
});
