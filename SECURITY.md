# Security

Nouri handles health-related personal data (sensitivities and food history), so it is built to keep that data on the device and to give attackers as little surface as possible.

## Reporting a problem

Please report vulnerabilities privately to the repository owner rather than in a public issue. Include steps to reproduce. You can expect a reply within a week.

## Threat model

| Asset                                   | Where it lives            | Protection                                                       |
| --------------------------------------- | ------------------------- | ---------------------------------------------------------------- |
| Profile (sensitivities, triggers, name) | Phone only (localStorage) | Never transmitted, schema-validated on read                      |
| Scan history                            | Phone only (localStorage) | Never transmitted, capped at 60 entries, validated               |
| Barcode numbers                         | Sent to Open Food Facts   | Only the number is sent: no cookies, no referrer, no identifiers |

| Threat                                         | Mitigation                                                                                                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Malicious or malformed API data (XSS, crashes) | zod validation, string/size caps, numeric range checks; React escapes all text, and `dangerouslySetInnerHTML`/`innerHTML` are banned by ESLint         |
| Malicious QR codes (`javascript:`, phishing)   | Only `https:` links without credentials are offered, and the host is shown first; `rel="noopener noreferrer"`                                          |
| Tracking pixels / unexpected image hosts       | Images load only over https from Open Food Facts hosts (allow-list + CSP `img-src`)                                                                    |
| Supply-chain / third-party scripts             | No CDNs at runtime: the OCR engine and model are self-hosted; CI pins actions to commit SHAs, `npm ci` from the lockfile, `npm audit` gate, Dependabot |
| Injected scripts                               | CSP: `script-src 'self' 'wasm-unsafe-eval'`, with no inline scripts and no `eval` (zod runs in jitless mode)                                           |
| Clickjacking                                   | `frame-ancestors 'none'` and `X-Frame-Options: DENY`                                                                                                   |
| Misread barcodes / bad input                   | GTIN check-digit validation before any lookup; limits on ingredient text, nutrient values, names, triggers and image files (image/* only, ≤ 15 MB)     |
| Corrupted local data                           | Versioned storage with per-record reset instead of a crash; ErrorBoundary for render errors                                                            |
| Camera misuse                                  | `Permissions-Policy: camera=(self)`, with microphone, geolocation and payment disabled                                                                 |

## Headers

The policy is defined once, in `src/shared/config/security.ts`, and is:

- injected as a CSP `<meta>` tag at build time,
- written to `dist/_headers` (Netlify / Cloudflare Pages),
- kept in sync with `vercel.json` by a unit test (`npm run hosting:sync`),
- sent by `vite preview`, so the end-to-end tests run under the real policy.

Headers: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`.

Static hosts without custom headers (e.g. GitHub Pages) still get the `<meta>` CSP, but not `frame-ancestors` or HSTS. Prefer Netlify, Cloudflare Pages or Vercel.

## Known limits

- Data in localStorage is not encrypted at rest. It relies on the phone's own lock and storage encryption, which iOS and Android provide.
- CodeQL code scanning needs GitHub Advanced Security on private repositories, so it is not enabled. Static analysis runs through ESLint (typescript-eslint strict, type-checked) instead.
- Open Food Facts is a community database and can be wrong or incomplete. The app labels its sources and says it is not medical advice.
