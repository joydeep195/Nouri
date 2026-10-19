// Adds the Content-Security-Policy <meta> tag to the built index.html and writes the hosting
// `_headers` file, both from src/shared/config/security.ts.
import type { Plugin } from 'vite';
import { CSP_META, headersFile } from '../src/shared/config/security.ts';

export function securityHeaders(): Plugin {
  return {
    name: 'nouri:security-headers',
    // Dev mode injects inline scripts/styles for hot reload, so the CSP only applies to builds.
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: () => [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP_META },
          injectTo: 'head-prepend',
        },
      ],
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '_headers', source: headersFile() });
    },
  };
}
