import { describe, expect, it } from 'vitest';
import { extractIngredients, parseNutrition } from './labelText';

const LABEL = `NUTRI CRUNCH
INGREDIENTS: Rolled oats (60%), sugar, sun-
flower oil, honey.
NUTRITION INFORMATION per 100g
Energy 1850kJ / 442 kcal
Fat 15.2 g
of which saturates 2.1g
Carbohydrate 64 g
of which sugars 18.5 g
Fibre 7.1g
Protein 9.4 g
Salt 0.35 g`;

describe('extractIngredients', () => {
  it('keeps just the ingredient list and joins broken words', () => {
    expect(extractIngredients(LABEL)).toBe('Rolled oats (60%), sugar, sunflower oil, honey.');
  });

  it('returns the text as-is when there is no "Ingredients" heading', () => {
    expect(extractIngredients('Water, salt')).toBe('Water, salt');
    expect(extractIngredients(null)).toBe('');
  });
});

describe('parseNutrition', () => {
  it('reads a standard table', () => {
    expect(parseNutrition(LABEL)).toEqual({
      kcal: 442,
      fat: 15.2,
      satFat: 2.1,
      sugars: 18.5,
      fiber: 7.1,
      protein: 9.4,
      salt: 0.35,
    });
  });

  it('reads values that share a line and ignores percentages', () => {
    const raw = `INGREDIENTS: Sugar, fat-reduced cocoa (7.4%), salt.\nNUTRITION INFORMATION per 100g\nEnergy 2010kJ / 480 kcal\nFat 19.5 g   of which saturates 9.8 g\nSugars 31 g    Protein 6.1 g    Salt 0.6 g\nSodium 240 mg`;
    expect(parseNutrition(raw)).toEqual({ kcal: 480, fat: 19.5, satFat: 9.8, sugars: 31, protein: 6.1, salt: 0.6 });
  });

  it('converts sodium and kJ when needed', () => {
    expect(parseNutrition('Sodium 400mg')?.salt).toBe(1);
    expect(parseNutrition('Energy 1674 kJ')?.kcal).toBe(400);
    expect(parseNutrition('nothing useful here')).toBeNull();
  });
});
