# Changelog

All notable changes to Nouri. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [2.1.0] - 2026-10-20

### Added

- Ingredient recognition, using a vocabulary of ~7,100 ingredient names, every E/INS additive with its name and job (both from Open Food Facts, ODbL) and South Asian/romanised names. Unrecognised ingredients are listed on the result screen and never earn a bonus.
- One-tap "Add as trigger" for any unrecognised ingredient.
- Label abbreviations (PGPR, SSL, CSL, DATEM, CMC, HPMC, MCC, MSG, TBHQ, BHA, BHT, EDTA, SAPP, HFCS, SMP, WPC…), expanded on screen and scored like the full name.
- Additive names now count as additives ("glyceryl monostearate" → E471), so the emulsifier, sweetener and colour rules catch them.
- Misspelling and OCR-slip tolerance: "carageenan" is flagged as carrageenan.
- New rules: rare sugars (allulose, tagatose), added fermentable fibres (polydextrose…), hing as a gluten risk, and tea as caffeine (not herbal teas). More hidden sugar names (evaporated cane juice, khand, mishri…). Hindi names for onion, garlic, chilli, ginger and pulses. Milk proteins (caseinate) under dairy.
- Coverage audit against real Open Food Facts products (`npm run audit:ingredients`) and a test that keeps coverage from dropping.
- App split into cached chunks (app, ingredient data, libraries), so updates download less.

### Changed

- Some scores shifted where additives named in words are now counted (e.g. a maltitol/polydextrose protein bar: 35 → 24, sugar-free gum gets "Lots of additives"). The regression baseline was re-recorded after review.

## [2.0.0] - 2026-10-19

The app and scores are unchanged for users. The codebase was rebuilt to production standards.

### Changed

- Rewritten in strict TypeScript with a feature-based structure (`app/`, `features/*/{model,ui}`, `shared/`).
- Scoring engine split into rules, nutrition, flags and score modules, and verified identical to v1 by a 136-case regression suite.
- Stored data moved to versioned, validated records. v1 data is migrated automatically on first launch.
- Label reader now runs from the app's own server instead of a CDN, and works offline once cached.

### Added

- Strict Content-Security-Policy and security headers (HSTS, frame-ancestors, nosniff, no-referrer, Permissions-Policy), generated from one source for Netlify, Cloudflare Pages and Vercel.
- Validation of all outside data with zod. Limits on text, numbers and photo files.
- Barcode check-digit validation, including UPC-E, so misreads never reach the network. UPC-E codes are now looked up correctly.
- https-only QR links and an image host allow-list.
- Error boundary, on-device logger, timeout and retry for lookups.
- ESLint (strict, type-checked, jsx-a11y), Prettier, pre-commit hook, Vitest with coverage thresholds, Playwright e2e on WebKit and Chromium, GitHub Actions CI and Dependabot.
- Docs: architecture, scoring, security, privacy, contributing, and decision records.

### Fixed

- A processing estimate could depend on previously scanned products (stateful regex).
- Nutrition values were missed when OCR ran labels into numbers ("Protein6.1g").
- Error messages on nutrient fields were read out as part of the field's label by screen readers.

## [1.0.0] - 2026-10-19

### Added

- First version: barcode/QR scanning, label reading, typed ingredients, three-pillar scoring for health, gut comfort (IBD) and weight goals, profile and sensitivities, history, installable PWA.
