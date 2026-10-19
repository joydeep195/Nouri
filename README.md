# Nouri

_Know what's good before you bite._

[![CI](https://github.com/joydeep195/Nouri/actions/workflows/ci.yml/badge.svg)](https://github.com/joydeep195/Nouri/actions/workflows/ci.yml)

Nouri is an installable mobile web app (PWA, no App Store needed). Scan a packaged food and it tells you whether it's a good choice, with a score out of 100 and plain-English reasons. It was built for someone living with suspected Crohn's/IBD who is also trying to lose weight.

| Pillar             | What it looks at                                                                                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Overall health** | Processing (NOVA), additives, salt, saturated/trans fat, fibre                                                                                                          |
| **Gut comfort**    | IBD triggers: carrageenan, polysorbate 80, CMC, maltodextrin, sugar alcohols, sweeteners, FODMAPs, fizz, caffeine, alcohol, processed meat, plus personal sensitivities |
| **Weight goals**   | Calories, sugar (especially drinks), fat, and how filling it is (protein, fibre)                                                                                        |

The overall score leans towards the weakest pillar, and anything marked as a personal trigger is always **Best avoided**. See [docs/SCORING.md](docs/SCORING.md) for how scoring works.

## Features

- **Scan barcodes and QR codes** with the camera (EAN/UPC and GS1 Digital Link). A photo fallback works when the live camera isn't available.
- **No barcode? Read the label.** The ingredients and nutrition table are read **on the phone** by a self-hosted OCR engine.
- **Type or paste** an ingredient list, with optional nutrition per 100 g.
- **Understands Indian labels**: INS numbers, "Emulsifier (471)", maida, atta, besan, paneer, plus Hindi names like pyaz, lahsun and hing.
- **Knows ~7,000 ingredients and every E/INS additive** (from Open Food Facts), plus label abbreviations like PGPR, SSL, DATEM, CMC and SMP. Each additive is shown with its name and job, and small spelling or OCR mistakes are tolerated.
- **Honest about what it doesn't know**: unrecognised ingredients are listed, never scored as "fine", and can be added as a personal trigger in one tap. See [coverage on real products](docs/INGREDIENT-COVERAGE.md).
- **Personal profile**: weight-loss goal, flare mode, low-FODMAP, dairy, gluten, spice, caffeine, and custom triggers.
- **History**, re-scored automatically when the profile changes.
- **Offline-capable**, with light and dark mode and accessible markup.
- **Private by design**: no accounts or tracking, and data stays on the phone. See [docs/PRIVACY.md](docs/PRIVACY.md).

## Quick start

Requires Node 22+.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script                                                  | What it does                                                                                                                               |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run check`                                         | Everything CI runs except e2e: format, lint, types, unit tests with coverage, build                                                        |
| `npm test` / `npm run test:watch`                       | Unit and component tests (Vitest + Testing Library)                                                                                        |
| `npm run test:coverage`                                 | Tests with coverage thresholds (80% overall, 90% for model code and libs)                                                                  |
| `npm run e2e`                                           | Playwright on iPhone (WebKit) and Android (Chromium) against the production build. Run `npx playwright install chromium webkit` once first |
| `npm run build` / `npm run preview`                     | Production build / serve it with the production security headers                                                                           |
| `npm run lint` / `npm run typecheck` / `npm run format` | Code-quality tools on their own                                                                                                            |
| `npm run baseline`                                      | Re-record the scoring regression baseline after an intended scoring change                                                                 |
| `npm run hosting:sync`                                  | Regenerate `vercel.json` from the security policy                                                                                          |

## Deploy and install on an iPhone

The app is static: build it and host the `dist/` folder anywhere with **https**, since the camera requires it.

1. **Netlify** (recommended, because it applies the generated `_headers` security file): connect this GitHub repo, or drag `dist/` onto <https://app.netlify.com/drop>.
   - Build command: `npm run build`
   - Publish directory: `dist`
2. **Vercel**: import the repo. `vercel.json` sets the build and the security headers.
3. **Cloudflare Pages** also reads `_headers`. GitHub Pages works too, but can't send security headers; the CSP `<meta>` tag still applies.

On the iPhone, open the site in **Safari**, tap **Share**, then **Add to Home Screen**, and allow camera access on first scan. Installed copies update themselves when you deploy again.

## Project docs

- [Architecture](docs/ARCHITECTURE.md): folder structure, data flow, storage, offline
- [Scoring](docs/SCORING.md): pillars, rules, thresholds, how to tune
- [Security](SECURITY.md): threat model, CSP and headers
- [Privacy](docs/PRIVACY.md): what leaves the device (only barcode numbers)
- [Contributing](CONTRIBUTING.md) and [Changelog](CHANGELOG.md)
- Decisions: [on-device only](docs/adr/0001-on-device-only.md), [self-hosted OCR](docs/adr/0002-self-hosted-ocr.md)

## Renaming the app

Change `APP_NAME` in `src/shared/config/app.ts`, plus `<title>` and `apple-mobile-web-app-title` in `index.html`.

## Disclaimer

Nouri gives general guidance based on ingredient and nutrition data. It is **not medical advice**: everyone with IBD reacts differently, so follow your gastroenterologist or dietitian, especially during a flare. Product data comes from [Open Food Facts](https://world.openfoodfacts.org) (ODbL) and can be incomplete, so check the pack when it matters.
