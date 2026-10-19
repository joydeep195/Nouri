# Contributing

## Setup

```bash
npm install                          # also installs the pre-commit hook
npx playwright install chromium webkit   # once, for e2e tests
```

## Workflow

1. Make your change. Keep model code (`src/features/*/model`, `src/shared/lib`) pure and covered by unit tests.
2. Run `npm run check` (format, lint, types, unit tests with coverage, build) and `npm run e2e`.
3. Commit. The pre-commit hook runs Prettier and ESLint on staged files.
4. Push. CI runs the same checks, plus the Playwright suite on WebKit and Chromium, plus `npm audit`.

## Conventions

- **TypeScript strict**: avoid `any`, non-null assertions and unchecked casts in app code.
- **Imports** use the `@/` alias for anything outside the current feature, and `import type` for types.
- **Untrusted data** (API responses, storage, files, QR codes) must go through the zod schemas, `safeUrl` and the limits in `product/model/limits.ts`. Import `z` from `@/shared/lib/zod`, never from `zod` directly.
- **No raw HTML**: `dangerouslySetInnerHTML` and `innerHTML` are banned by lint.
- **No new outside origins** without updating `src/shared/config/security.ts`, `SECURITY.md` and `docs/PRIVACY.md`, then running `npm run hosting:sync`.
- **Accessibility**: every control needs an accessible name; prefer semantic elements (`button`, `label`, lists, headings). `eslint-plugin-jsx-a11y` checks the basics.
- **Scoring changes**: see [docs/SCORING.md](docs/SCORING.md#changing-the-scoring). Re-record the baseline only for intended changes and review its diff.
- **Commits**: short imperative subject line, and a body explaining _why_.
