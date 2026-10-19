import { describe, expect, it } from 'vitest';
import vercel from '../../../vercel.json';
import { vercelConfig } from './hosting';
import { CSP_HEADER, CSP_META, headersFile, IMAGE_ORIGINS, SECURITY_HEADERS } from './security';
import { IMAGE_HOSTS } from '@/shared/lib/safeUrl';

describe('security policy', () => {
  it('never allows inline scripts or eval', () => {
    for (const csp of [CSP_HEADER, CSP_META]) {
      expect(csp).not.toMatch(/'unsafe-inline'|'unsafe-eval'|\*/);
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("default-src 'self'");
    }
  });

  it('blocks framing via the header (meta tags cannot)', () => {
    expect(CSP_HEADER).toContain("frame-ancestors 'none'");
    expect(CSP_META).not.toContain('frame-ancestors');
    expect(SECURITY_HEADERS['X-Frame-Options']).toBe('DENY');
  });

  it('only lets the camera be used by the app itself', () => {
    expect(SECURITY_HEADERS['Permissions-Policy']).toMatch(/camera=\(self\)/);
    expect(SECURITY_HEADERS['Permissions-Policy']).toMatch(/microphone=\(\)/);
  });

  it('keeps the image allow-list and the CSP in sync', () => {
    expect(IMAGE_ORIGINS.map((o) => new URL(o).hostname)).toEqual(IMAGE_HOSTS);
  });

  it('writes every header into the _headers file', () => {
    const file = headersFile();
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) expect(file).toContain(`${k}: ${v}`);
  });

  it('has an up-to-date vercel.json (run `npm run hosting:sync` if this fails)', () => {
    expect(vercel).toEqual(vercelConfig());
  });
});
