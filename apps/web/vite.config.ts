import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_PROXY_TARGET || 'https://localhost:8000'
  const webPort = Number(env.VITE_WEB_PORT) || 3000

  // Optionally serve over HTTPS for mobile testing if Tailscale certs exist.
  const certKey = path.resolve(__dirname, '../api/certificates/tailscale-dev.key')
  const certCrt = path.resolve(__dirname, '../api/certificates/tailscale-dev.crt')
  const httpsConfig =
    fs.existsSync(certKey) && fs.existsSync(certCrt)
      ? { key: fs.readFileSync(certKey), cert: fs.readFileSync(certCrt) }
      : undefined

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        // Custom Workbox SW source lives at src/pwa/sw.ts. The plugin
        // compiles it during `vite build`, injects the precache manifest
        // (`__WB_MANIFEST`), and emits `dist/sw.js`. The SW explicitly
        // bypasses `/api/*` (NetworkOnly) so authenticated/rate-limited
        // requests never see the cache.
        registerType: 'autoUpdate',
        strategies: 'injectManifest',
        srcDir: 'src/pwa',
        filename: 'sw.ts',
        // We register the SW manually in main.tsx via `virtual:pwa-register`,
        // so the plugin shouldn't auto-inject a registration script.
        injectRegister: false,
        // Use the existing `public/manifest.json` directly. Setting
        // `manifest: false` tells the plugin not to generate or rewrite it.
        manifest: false,
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
          // Splash images are large (some are ~700KB). Bump the per-file
          // cap to 5 MB so they make it into the precache manifest.
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
        // Disable SW in dev — it conflicts with HMR and Vite's dev server
        // already serves modules without caching.
        devOptions: { enabled: false },
      }),
    ],
    server: {
      port: webPort,
      host: true,
      https: httpsConfig,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test-setup.ts'],
    },
  }
})
