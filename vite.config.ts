/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { APP_DESCRIPTION, APP_NAME } from './src/shared/config/app.ts';

const DAY = 60 * 60 * 24;

export default defineConfig({
  // Relative paths so the built app works from any folder (GitHub Pages, Netlify, etc.)
  base: './',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
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
            urlPattern: /^https:\/\/images\.openfoodfacts\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'food-images',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * DAY },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // The label reader's engine and English model, downloaded on first use.
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/(tesseract|@tesseract)/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'label-reader',
              expiration: { maxEntries: 20, maxAgeSeconds: 120 * DAY },
              cacheableResponse: { statuses: [0, 200] },
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
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/app/main.tsx', 'src/vite-env.d.ts'],
      reporter: ['text-summary', 'html', 'lcov'],
    },
  },
});
