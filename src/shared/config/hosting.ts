// Hosting configuration derived from the security policy.
import { SECURITY_HEADERS } from './security.ts';

const toList = (headers: Record<string, string>) => Object.entries(headers).map(([key, value]) => ({ key, value }));

/** vercel.json contents: security headers everywhere, no caching of the service worker. */
export function vercelConfig() {
  return {
    $schema: 'https://openapi.vercel.sh/vercel.json',
    buildCommand: 'npm run build',
    outputDirectory: 'dist',
    headers: [
      { source: '/(.*)', headers: toList(SECURITY_HEADERS) },
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
      { source: '/ocr/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    ],
  };
}
