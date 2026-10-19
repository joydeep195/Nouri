// The app's security policy: one source of truth for the CSP <meta> tag (build), the preview
// server, and the hosting header files (public/_headers is generated, vercel.json is tested).
// Imported by vite.config.ts, so keep it free of path aliases and browser APIs.

/** Origins the app talks to besides itself. Keep in sync with shared/lib/safeUrl.ts. */
export const FOOD_API_ORIGIN = 'https://world.openfoodfacts.org';
export const IMAGE_ORIGINS = ['https://images.openfoodfacts.org', 'https://static.openfoodfacts.org'];

const DIRECTIVES: Record<string, string[]> = {
  'default-src': ["'self'"],
  // WebAssembly (barcode + label readers) needs wasm-unsafe-eval; no JS eval is allowed.
  'script-src': ["'self'", "'wasm-unsafe-eval'"],
  'worker-src': ["'self'"],
  'connect-src': ["'self'", FOOD_API_ORIGIN],
  // blob: is the preview of the label photo the user picked.
  'img-src': ["'self'", 'blob:', ...IMAGE_ORIGINS],
  'style-src': ["'self'"],
  'font-src': ["'self'"],
  'manifest-src': ["'self'"],
  'media-src': ["'self'", 'blob:'],
  'object-src': ["'none'"],
  'base-uri': ["'none'"],
  'form-action': ["'none'"],
};

const serialize = (d: Record<string, string[]>, extra: string[] = []) =>
  [...Object.entries(d).map(([k, v]) => `${k} ${v.join(' ')}`), ...extra].join('; ');

// No `upgrade-insecure-requests`: every outside origin above is already https-only and HSTS
// forces https for the app itself, while WebKit would also "upgrade" http://localhost during
// local testing and break it.

/** CSP for the <meta> tag. frame-ancestors is ignored in <meta>, so it is header-only. */
export const CSP_META = serialize(DIRECTIVES);

/** CSP sent as an HTTP header by the host. */
export const CSP_HEADER = serialize(DIRECTIVES, ["frame-ancestors 'none'"]);

export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': CSP_HEADER,
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy':
    'camera=(self), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

/** Netlify / Cloudflare Pages `_headers` file contents. */
export function headersFile(): string {
  const lines = Object.entries(SECURITY_HEADERS).map(([k, v]) => `  ${k}: ${v}`);
  return [
    '# Generated at build time from src/shared/config/security.ts. Do not edit by hand.',
    '/*',
    ...lines,
    '',
    '/sw.js',
    '  Cache-Control: no-cache',
    '',
    '/ocr/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
  ].join('\n');
}
