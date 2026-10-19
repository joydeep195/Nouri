# How Nouri scores food

Every product gets three pillar scores from 0 to 100, plus an overall score and a verdict. The engine lives in `src/features/analysis/model/` and is pure TypeScript: no I/O, no React. That means it is fully unit-tested, including a 136-case regression suite (`score.test.ts`).

## Pillars

| Pillar             | Starts at                          | Looks at                                                                                         |
| ------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Overall health** | 100                                | Processing (NOVA), additives, salt, saturated and trans fat, fibre                               |
| **Gut comfort**    | 100                                | IBD/Crohn's triggers (emulsifiers, FODMAPs, sugar alcohols…), fat, sugar, personal sensitivities |
| **Weight goals**   | 100, or 80 without nutrition facts | Calories, sugar (especially in drinks), fat, and whether it keeps you full (protein, fibre)      |

Each finding is a **flag** with an impact per pillar: a positive impact is a penalty, a negative one is a bonus. A pillar's score is `start − sum(impacts)`, clamped to 0–100.

## Overall score

1. **Weighted power mean (p = −2)** of the three pillars. The weights are health 0.35, gut 0.35, weight 0.30 (or 0.45/0.45/0.10 when the weight-loss goal is off). Each pillar is floored at 15 inside the mean. A weak pillar drags the result down much harder than a strong one lifts it.
2. **Gut priority:** the overall can't be more than the gut score + 15.
3. **Dealbreakers** (personal triggers, plus dairy or gluten when marked as a sensitivity) cap the overall at **30**.
4. **Rule caps:** some findings cap the overall:

   | Finding                                                                    | Cap   |
   | -------------------------------------------------------------------------- | ----- |
   | Carrageenan, polysorbates, CMC                                             | 59    |
   | Alcohol, sugar alcohols as a main ingredient, sugary drinks (> 8 g/100 ml) | 35–39 |

| Overall | Verdict            |
| ------- | ------------------ |
| 80–100  | Great choice       |
| 65–79   | Good in moderation |
| 40–64   | Not ideal          |
| 0–39    | Best avoided       |

## Ingredient rules

Defined in `rules.ts`. Matching is whole-word, case-insensitive, and allows plurals and hyphen/space variants. It also understands E-numbers, INS numbers and Indian bracket codes ("Emulsifier (471)"). "May contain traces of…" statements are ignored.

In the table, "varies" means the value depends on the profile or on where the ingredient appears in the list. "Profile-only" rules apply only to some profiles: low-FODMAP, flare, gluten, or not-in-flare.

| id                    | Title                                   | Health | Gut    | Weight | Cap    | Profile-only | Dealbreaker |
| --------------------- | --------------------------------------- | ------ | ------ | ------ | ------ | ------------ | ----------- |
| carrageenan           | Carrageenan                             | 6      | 25     |        | 59     |              |             |
| polysorbate           | Polysorbate emulsifier                  | 6      | 22     |        | 59     |              |             |
| cmc                   | Cellulose gum (CMC)                     | 4      | 22     |        | 59     |              |             |
| maltodextrin          | Maltodextrin                            |        | 10     | 4      |        |              |             |
| emulsifiers           | Emulsifiers                             | 2      | 6      |        |        |              |             |
| titanium-dioxide      | Titanium dioxide                        | 10     | 6      |        |        |              |             |
| polyols               | Sugar alcohols                          |        | varies |        | varies |              |             |
| erythritol            | Erythritol                              |        | 6      |        |        |              |             |
| artificial-sweeteners | Artificial sweeteners                   | 8      | varies |        |        |              |             |
| inulin                | Inulin / chicory fibre                  |        | varies |        |        |              |             |
| onion-garlic          | Onion / garlic                          |        | varies |        |        |              |             |
| fructose              | Excess fructose                         |        | varies |        |        |              |             |
| fodmap-fruit          | High-FODMAP fruit                       |        | 8      |        |        | yes          |             |
| legumes               | Beans & lentils                         |        | varies |        |        |              |             |
| fodmap-nuts           | Cashews / pistachios                    |        | 6      |        |        | yes          |             |
| wheat-fructans        | Wheat (fructans)                        |        | 6      |        |        | yes          |             |
| dairy                 | Dairy (lactose)                         |        | varies |        |        |              | yes         |
| gluten                | Gluten (wheat, barley, rye)             |        | 28     |        |        | yes          | yes         |
| spicy                 | Spicy                                   |        | varies |        |        |              |             |
| caffeine              | Caffeine                                |        | varies |        |        |              |             |
| alcohol               | Alcohol                                 | 14     | 22     | 8      | 35     |              |             |
| fizzy                 | Fizzy                                   |        | 10     |        |        |              |             |
| processed-meat        | Processed meat / nitrites               | 15     | 10     |        |        |              |             |
| sulfites              | Sulphites                               | 3      | 6      |        |        |              |             |
| fried                 | Fried                                   |        | 6      | 8      |        |              |             |
| rough-fibre           | Rough fibre (nuts, seeds, whole grains) |        | 12     |        |        | yes          |             |
| hydrogenated          | Hydrogenated fat                        | 18     | 4      |        |        |              |             |
| colours               | Artificial colours                      | 8      | 2      |        |        |              |             |
| preservatives         | Preservatives of concern                | 8      |        |        |        |              |             |
| phosphates            | Added phosphates                        | 4      |        |        |        |              |             |
| flavour-enhancers     | Flavour enhancers (MSG)                 | 3      |        |        |        |              |             |
| artificial-flavours   | Artificial flavouring                   | 3      |        |        |        |              |             |
| palm-oil              | Palm oil                                | 4      |        |        |        |              |             |
| refined-flour         | Refined flour                           | 4      |        | 6      |        |              |             |
| added-sugar           | Added sugar                             | varies |        | varies |        |              |             |
| oil-early             | Oil is a main ingredient                |        |        | varies |        |              |             |
| probiotics            | Live cultures                           |        | −8     |        |        |              |             |
| soothing              | Gut-friendly ingredients                |        | varies |        |        |              |             |
| omega-3               | Omega-3 rich                            | −4     | −2     |        |        |              |             |
| whole-grains          | Whole grains                            | −5     |        | −2     |        | yes          |             |
| low-fodmap-label      | Low-FODMAP certified                    |        | −10    |        |        |              |             |

Personal triggers add a +30 gut penalty and are always dealbreakers.

## Nutrition rules

These are defined in `nutrition.ts`, per 100 g (food) or 100 ml (drinks). The traffic-light levels follow the UK FSA thresholds. The main ones:

- **Calories:** food over 500 kcal is −38 weight, sliding down to −5 above 150 kcal. Drinks over 45 kcal are −20. Very low calories earn a bonus.
- **Sugar:** drinks are judged much more strictly. Over 8 g/100 ml is −45 weight, and the overall is capped at 39.
- **Fat** over 17.5 g is a gut and weight penalty, and **saturated fat** over 5 g is −12 health.
- **Salt** over 1.5 g is −12 health.
- **Easy to overeat:** over 300 kcal with less than 8 g protein and less than 3 g fibre.
- **Protein** (≥ 8 g) and **fibre** (≥ 3 g) earn bonuses. During a flare, high fibre is a gut penalty instead.

## Processing (NOVA)

- If Open Food Facts provides a NOVA group, it is used: group 4 (ultra-processed) is −30 health, −12 gut and −4 weight.
- Otherwise it is estimated from ultra-processing markers: emulsifiers, flavourings, colours, sweeteners, modified starch and so on. Estimated values are labelled "Estimated".

## Changing the scoring

1. Edit a rule in `rules.ts`, or a threshold in `nutrition.ts`.
2. Run `npm test`. The regression suite in `score.test.ts` shows exactly which products and profiles changed.
3. If the change is intended, run `npm run baseline` to re-record `tests/fixtures/score-baseline.json`. Review its diff, and explain the change in the commit message and in `CHANGELOG.md`.

The sanity tests ("Coke is best avoided", "oats are a great choice"…) must keep passing. They guard against tuning that drifts away from common sense.

> Nouri gives general guidance. It is not medical advice. The rules reflect commonly used IBD dietary approaches (the Crohn's Disease Exclusion Diet, low-FODMAP, lower-residue eating during flares) and general nutrition guidance. They are not a substitute for a gastroenterologist or dietitian.
