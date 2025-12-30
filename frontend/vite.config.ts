import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // PWA desactivado para evitar loops de recarga con workbox
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   includeAssets: ['favicon.ico', 'robots.txt', 'pwa-192.png', 'pwa-512.png', 'pwa-512-maskable.png'],
    //   manifest: {
    //     name: 'Geriátricos',
    //     short_name: 'Geriátricos',
    //     description: 'Sistema de gestión para hogares geriátricos',
    //     theme_color: '#1d4ed8',
    //     background_color: '#ffffff',
    //     display: 'standalone',
    //     start_url: '/',
    //     scope: '/',
    //     icons: [
    //       {
    //         src: 'pwa-192.png',
    //         sizes: '192x192',
    //         type: 'image/png',
    //         purpose: 'any'
    //       },
    //       {
    //         src: 'pwa-512.png',
    //         sizes: '512x512',
    //         type: 'image/png',
    //         purpose: 'any'
    //       },
    //       {
    //         src: 'pwa-512-maskable.png',
    //         sizes: '512x512',
    //         type: 'image/png',
    //         purpose: 'maskable'
    //       }
    //     ]
    //   },
    //   workbox: {
    //     globPatterns: ['**/*.{js,css,html,ico,png,svg}']
    //   }
    // })
  ],
  server: {
    port: 5173,
    host: true
  },
  build: {
    sourcemap: true
  }
})
