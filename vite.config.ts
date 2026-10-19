/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { securityHeaders } from './build-tools/securityHeaders.ts';
import { OCR_PATH, selfHostedOcr } from './build-tools/selfHostedOcr.ts';
import { APP_DESCRIPTION, APP_NAME } from './src/shared/config/app.ts';
import { SECURITY_HEADERS } from './src/shared/config/security.ts';

const DAY = 60 * 60 * 24;

export default defineConfig({
  // Relative paths so the built app works from any folder (GitHub Pages, Netlify, etc.)
  base: './',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // No data: URIs (the CSP only allows files from our own origin), no source maps in production.
  build: { sourcemap: false, target: 'es2022', assetsInlineLimit: 0 },
  // `vite preview` sends the same headers as production hosting, so the CSP is tested for real.
  preview: { headers: SECURITY_HEADERS },
  plugins: [
    react(),
    selfHostedOcr(),
    securityHeaders(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: APP_NAME,
        short_name: APP_NAME,
        description: APP_DESCRIPTION,
        theme_color: '#2f7d5b',
        background_color: '#f5f3ec',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,wasm,woff2}'],
        // The label reader (~7 MB) is cached on first use instead of at install.
        globIgnores: ['ocr/**'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/world\.openfoodfacts\.org\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'food-data',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 300, maxAgeSeconds: 30 * DAY },
            },
          },
          {
            urlPattern: /^https:\/\/(images|static)\.openfoodfacts\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'food-images',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * DAY },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.includes(`/${OCR_PATH}`),
            handler: 'CacheFirst',
            options: {
              cacheName: 'label-reader',
              expiration: { maxEntries: 10, maxAgeSeconds: 365 * DAY },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    // Full user-flow tests type a lot; coverage instrumentation makes them slower.
    testTimeout: 20_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/app/main.tsx',
        'src/vite-env.d.ts',
        // Camera, WebAssembly barcode and OCR code needs a real browser: covered by e2e/ (Playwright).
        'src/features/scan/model/barcode.ts',
        'src/features/scan/ui/Scanner.tsx',
        'src/features/label/model/ocr.ts',
        'src/features/label/ui/LabelReader.tsx',
      ],
      reporter: ['text-summary', 'html', 'lcov'],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 75,
        branches: 75,
        // The scoring engine and shared libraries are held to a higher bar.
        'src/features/*/model/**': { lines: 90, statements: 90 },
        'src/shared/lib/**': { lines: 90, statements: 90 },
      },
    },
  },
});
