# Changelog

All notable changes to Nouri. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

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
