# Architecture

Nouri is a client-only progressive web app (PWA): React 19 + TypeScript (strict), built with Vite. There is no backend. Everything runs on the phone, and the only network calls go to the Open Food Facts API (see [ADR 0001](adr/0001-on-device-only.md)).

## Layout

```
src/
  app/                 Shell: entry point, App (screen switch), typed navigation, ErrorBoundary, TabBar
  features/
    analysis/          Scoring engine (model/) and the result screen (ui/)
    product/           Product types, limits, zod schemas, Open Food Facts client; lookup + QR screens
    scan/              Barcode/QR parsing + check digits, camera/ZXing detector; scanner + number entry
    label/             On-device OCR + label text parsing; label reader + ingredient form
    history/           Scan history model + store; history screen
    profile/           Profile model, validated store, triggers; profile + onboarding screens
    home/              Home screen + tips
  shared/
    config/            App name/version, security policy (CSP + headers), hosting config
    lib/               storage, http, zod, safeUrl, files, logger, text, time, motion, style
    ui/                Logo, TopBar, Toggle
  styles/              tokens.css (light/dark design tokens), base.css, components.css
build-tools/           Vite plugins: self-hosted OCR assets, CSP <meta> + _headers
e2e/                   Playwright tests (WebKit + Chromium) against the production build
tests/                 Shared fixtures (sample products, score baseline, real API response)
```

### Rules

- **`model/` is pure.** No React and no DOM, apart from `barcode.ts` and `ocr.ts`, which wrap browser APIs. It is unit-tested.
- **`ui/` holds components.** Each screen imports its own CSS file.
- **`shared/` never imports from `features/`.** Features may import each other's public model or ui modules, e.g. `history` uses `analysis` to score entries.
- **Data from outside the code is validated with zod** (`product/model/schema.ts`, `profile/model/profileStore.ts`, `history/model/history.ts`). Always import `z` from `@/shared/lib/zod`; ESLint enforces this.

## Data flow

```
Camera / photo ──► scan/model/barcode (native BarcodeDetector or ZXing WASM)
                       │ raw text
                       ▼
                scan/model/scan.parseScan ──► barcode? ──► isValidGtin ──► product/model/openFoodFacts
                       │ url/text                                   (fetchJson + zod)
                       ▼                                                 │ Product
                 product/ui/QrLink                                       ▼
                                                     analysis/model/score.analyze(product, profile)
Label photo ──► label/model/ocr (Tesseract, self-hosted) ──► label/ui/IngredientsForm ──► Product ┘
Typed text ─────────────────────────────────────────────────► label/ui/IngredientsForm ──► Product ┘
                                                                         │ Analysis
                                                                         ▼
                                                              analysis/ui/Result
```

- `analyze` returns either `{ insufficient: true }` or a full `ScoredAnalysis`: pillars, flags, highlights, verdict and confidence.
- History stores products, not scores. Scores are recomputed with the current profile, so changing a sensitivity re-scores everything.

## Navigation

`app/navigation.ts` keeps a typed stack of `Route`s:

- `go` pushes a browser history entry, so the phone's back gesture works.
- `replace` swaps the current screen, e.g. scanner → lookup → result.
- `tab` resets the stack.

## Storage

`shared/lib/storage.ts` stores each record as `{ v, data }` in localStorage. On read it runs `migrations[v]` up to the current version, then the record's zod `parse`. Unreadable data resets only that record, and v1 keys are imported once. The records are:

| Key                  | Content                                        |
| -------------------- | ---------------------------------------------- |
| `nouri.profile` (v2) | Profile: name, goal, sensitivities, triggers   |
| `nouri.history` (v2) | Up to 60 history entries `{ id, at, product }` |

## Offline and updates

- `vite-plugin-pwa` precaches the app shell (~1.7 MB), including the ZXing WebAssembly.
- The OCR engine and model (~7 MB) are cached on first use from `/ocr/<version>/`.
- Product lookups use network-first with a 30-day cache.
- The service worker auto-updates.

## Security

See [SECURITY.md](../SECURITY.md). In short: a strict CSP with no inline scripts and no eval, no third-party code, validated inputs, an https-only URL allow-list, and a hardened fetch.
