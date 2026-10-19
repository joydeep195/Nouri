# ADR 0002: Self-host the label reader (OCR)

- **Status:** accepted (2026-10-19)

## Context

Reading ingredient labels uses Tesseract.js. By default it downloads its worker script, WebAssembly core and language model from the jsDelivr CDN at runtime. That means third-party code runs inside the app, and the Content-Security-Policy would have to allow a CDN origin for scripts and connections.

## Decision

A Vite plugin (`build-tools/selfHostedOcr.ts`) copies these files from `node_modules` into the build under `/ocr/<tesseract version>/`, and serves them directly in development:

- the worker,
- the LSTM-only core in plain, SIMD and relaxed-SIMD builds,
- the `eng` best-int model.

`createWorker` is pointed at those URLs with `workerBlobURL: false`, so no `blob:` worker is needed either.

## Consequences

- **Good:**
  - No third-party code at runtime.
  - The CSP stays at `'self'` plus Open Food Facts.
  - OCR works offline once cached.
  - Versions are pinned by the lockfile, and the versioned path allows immutable caching.
- **Bad:**
  - The deployment grows by about 15 MB. Each phone downloads only one core variant (~3.9 MB) plus the 2.9 MB model, once, on first use.
  - These files are excluded from the install-time precache.
