import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Cloudflare Pages/Netlify menyajikan situs di akar domain ('/').
// GitHub Pages butuh '/<nama-repo>/' → set BASE_PATH saat build (lihat workflow).
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  define: {
    __APP_BUILD__: JSON.stringify(`${process.env.WORKERS_CI_COMMIT_SHA?.slice(0, 7) ?? process.env.GITHUB_SHA?.slice(0, 7) ?? 'lokal'} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // autoUpdate: versi baru langsung aktif (skipWaiting + clientsClaim) dan halaman dimuat ulang.
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'FMM27 Pre-Game Editor',
        short_name: 'FMM27 PGE',
        description: 'Editor database FMM27 yang berjalan offline di browser',
        lang: 'id',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
